require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken"); // Импорт JWT
const { verifyToken, checkAdmin } = require("./middleware/auth");
const authMiddleware = require("./middleware/auth");


const app = express();
app.use(express.json());

const db = require("./db");


app.get("/", (req, res) => {
  res.send("Сервер работает!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));


const bcrypt = require("bcrypt");

const { body, validationResult } = require("express-validator");

app.post("/register",
    [
        body("email").isEmail().withMessage("Некорректный email"),
        body("login").isLength({ min: 3 }).withMessage("Логин слишком короткий"),
        body("password").isLength({ min: 6 }).withMessage("Пароль должен содержать минимум 6 символов"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, login, password, username, playid_uid } = req.body;

        try {
            const [userExists] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
            if (userExists.length > 0) {
                return res.status(400).json({ error: "Этот email уже используется!" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query("INSERT INTO users (email, login, username, password, playid_uid, verified) VALUES (?, ?, ?, ?, ?, ?)", 
                [email, login, username, hashedPassword, playid_uid || null, false]);

            res.json({ message: "Регистрация успешна!" });

        } catch (err) {
            console.error("Ошибка регистрации:", err);
            res.status(500).json({ error: "Ошибка сервера" });
        }
    }
);


// Подтверждение email
app.get("/verify-email", (req, res) => {
    const { token } = req.query;

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(400).json({ error: "Неверный или истекший токен" });

        db.query("UPDATE users SET verified = true WHERE email = ?", [decoded.email], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Email подтвержден!" });
        });
    });
});


const rateLimit = require("express-rate-limit");

// Ограничение запросов (50 запросов за 15 минут)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: "Слишком много запросов. Попробуйте позже." }
});
app.use(limiter);

// Блокировка после 5 неудачных попыток входа
const loginAttempts = {};

app.post("/login", async (req, res) => {
    const { identifier, password } = req.body;
    const ip = req.ip;

    if (!loginAttempts[ip]) loginAttempts[ip] = { count: 0, lastAttempt: Date.now() };

    const maxAttempts = 5;  // Количество попыток перед блокировкой
    const blockTime = 10 * 60 * 1000;  // Время блокировки (10 минут)

    if (loginAttempts[ip].count >= maxAttempts && Date.now() - loginAttempts[ip].lastAttempt < blockTime) {
        return res.status(429).json({ 
            error: `Слишком много попыток входа. Попробуйте снова через ${Math.ceil((blockTime - (Date.now() - loginAttempts[ip].lastAttempt)) / 60000)} минут.` 
        });
    }

    try {
        const [results] = await db.query("SELECT * FROM users WHERE email = ? OR login = ?", [identifier, identifier]);
        if (results.length === 0) {
            loginAttempts[ip].count++;
            loginAttempts[ip].lastAttempt = Date.now();
            return res.status(401).json({ error: "Пользователь не найден" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            loginAttempts[ip].count++;
            loginAttempts[ip].lastAttempt = Date.now();
            return res.status(401).json({ error: "Неверный пароль" });
        }

        // Сбрасываем счётчик попыток
        loginAttempts[ip] = { count: 0, lastAttempt: Date.now() };

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

        // 🔹 Шаг 1: Проверяем активные сессии пользователя
        const [sessions] = await db.query("SELECT id FROM sessions WHERE user_id = ? ORDER BY expires_at DESC", [user.id]);

        if (sessions.length >= 2) {
            // 🔹 Шаг 2: Удаляем все старые сессии, оставляя 1 последнюю
            const sessionsToDelete = sessions.slice(1).map(s => s.id);
            await db.query("DELETE FROM sessions WHERE id IN (?)", [sessionsToDelete]);
        }

        // 🔹 Шаг 3: Создаём новую сессию
        await db.query("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)", 
            [user.id, token, expiresAt]);

        // ✅ Возвращаем токен после успешного входа
        return res.json({ message: "Успешный вход", token });

    } catch (err) {
        console.error("Ошибка при входе:", err);
        return res.status(500).json({ error: "Ошибка сервера" });
    }
});




const nodemailer = require("nodemailer");

// Функция для отправки Email
const sendEmail = async (to, subject, text) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER, // Твой email
                pass: process.env.EMAIL_PASS  // Пароль приложения Google
            }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to,
            subject: subject,
            text: text
        });

        console.log(`📧 Email отправлен на ${to}`);
    } catch (error) {
        console.error("Ошибка при отправке email:", error);
    }
};


// Генерация токена для сброса пароля
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Введите email!" });

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Ошибка сервера" });
        if (results.length === 0) return res.status(404).json({ error: "Пользователь не найден" });

        const user = results[0];

        // Генерируем временный токен для сброса пароля
        const resetToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "15m" });

        // Сохраняем токен в БД (или можешь отправлять без сохранения)
        db.query("UPDATE users SET reset_token = ? WHERE id = ?", [resetToken, user.id], (err) => {
            if (err) console.error("Ошибка сохранения токена:", err);
        });

        // Отправка email с ссылкой для сброса пароля
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
        sendEmail(user.email, "Сброс пароля", `Для сброса пароля перейдите по ссылке: ${resetLink}`);

        // 🔹 Завершаем ВСЕ активные сеансы пользователя
        db.query("DELETE FROM sessions WHERE user_id = ?", [user.id], (err) => {
            if (err) console.error("Ошибка при удалении сессий:", err);
        });

        res.json({ message: "Инструкции по сбросу пароля отправлены на email. Все сеансы завершены." });
    });
});


// Подтверждение нового пароля
app.post("/reset-password", (req, res) => {
    const { token, newPassword } = req.body;

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(400).json({ error: "Неверный или истекший токен" });

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, decoded.email], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Пароль успешно изменен!" });
        });
    });
});



app.put("/update-role", verifyToken, checkAdmin, (req, res) => {
  const { userId, newRole } = req.body;

  // Проверка допустимых ролей
  const validRoles = ["admin", "moderator", "teacher", "student"];
  if (!validRoles.includes(newRole)) {
    return res.status(400).json({ error: "Некорректная роль" });
  }

  const query = "UPDATE users SET role = ? WHERE id = ?";

  db.query(query, [newRole, userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Пользователь не найден" });

    res.json({ message: `Роль пользователя обновлена до ${newRole}` });
  });
});



app.post("/login-playid", (req, res) => {
    const { playid_uid } = req.body;
    if (!playid_uid) return res.status(400).json({ error: "PlayID обязателен!" });

    const query = "SELECT * FROM users WHERE playid_uid = ?";
    db.query(query, [playid_uid], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: "Пользователь не найден" });

        const user = results[0];

        // Создаём JWT-токен
        const token = jwt.sign({ id: user.id, playid_uid: user.playid_uid }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        res.json({ message: "Успешный вход", token });
    });
});


app.post("/login-playid", (req, res) => {
    const { playid_uid, email } = req.body;
    if (!playid_uid || !email) return res.status(400).json({ error: "PlayID и email обязательны!" });

    const query = "SELECT * FROM users WHERE email = ? OR playid_uid = ?";
    db.query(query, [email, playid_uid], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length > 0) {
            // Если аккаунт найден, обновляем PlayID, если его не было
            const user = results[0];
            if (!user.playid_uid) {
                db.query("UPDATE users SET playid_uid = ? WHERE email = ?", [playid_uid, email]);
            }
            // Отправляем токен
            const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
            return res.json({ message: "Успешный вход", token });
        } else {
            // Создаём нового пользователя
            const insertQuery = "INSERT INTO users (email, playid_uid) VALUES (?, ?)";
            db.query(insertQuery, [email, playid_uid], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });

                const token = jwt.sign({ id: result.insertId, email }, process.env.JWT_SECRET, { expiresIn: "1h" });
                res.json({ message: "Новый пользователь создан", token });
            });
        }
    });
});

app.post("/logout", verifyToken, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];

        await db.query("DELETE FROM sessions WHERE token = ?", [token]);

        res.json({ message: "Вы успешно вышли из системы!" });
    } catch (err) {
        console.error("Ошибка выхода:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});


app.get("/sessions", verifyToken, async (req, res) => {
    try {
        let query;
        let params;

        if (req.user.role === "admin") {
            query = "SELECT sessions.id, users.email, sessions.token, sessions.expires_at FROM sessions JOIN users ON sessions.user_id = users.id";
            params = [];
        } else {
            query = "SELECT id, token, expires_at FROM sessions WHERE user_id = ?";
            params = [req.user.id];
        }

        const [results] = await db.query(query, params);
        res.json({ sessions: results });

    } catch (err) {
        console.error("Ошибка при получении сессий:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});



app.post("/change-password", verifyToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "Введите старый и новый пароль" });

    // Получаем пользователя
    db.query("SELECT * FROM users WHERE id = ?", [req.user.id], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Пользователь не найден" });

        const user = results[0];
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ error: "Неверный старый пароль" });

        // Хешируем новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Обновляем пароль
        db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, req.user.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // Удаляем все сессии пользователя
            db.query("DELETE FROM sessions WHERE user_id = ?", [req.user.id], (err) => {
                if (err) return res.status(500).json({ error: err.message });

                res.json({ message: "Пароль изменен. Все сеансы завершены." });
            });
        });
    });
});


app.post("/refresh-token", (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh-токен отсутствует" });

    db.query("SELECT * FROM refresh_tokens WHERE token = ?", [refreshToken], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(403).json({ error: "Неверный refresh-токен" });

        const user = results[0];
        const newToken = jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.json({ token: newToken });
    });
});


function authenticateToken(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1]; // Получаем токен из заголовка

    if (!token) return res.status(401).json({ error: "Токен отсутствует" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Недействительный токен" });

        req.user = user; // Добавляем данные пользователя в `req`
        next();
    });
}

app.get("/profile", verifyToken, (req, res) => {
    res.json({ message: "Доступ разрешён", user: req.user });
});
