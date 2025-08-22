// routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { body, validationResult } = require("express-validator");

// Общая валидация для регистрации и входа
const validateFields = (action) => {
    const validations = [];

    if (action === "register") {
        validations.push(
            body("email")
                .isEmail()
                .withMessage("Некорректный email")
                .normalizeEmail()
                .custom(async (value) => {
                    const [existingUser] = await db.query(
                        "SELECT id FROM users WHERE email = ? " +
                        "UNION SELECT id FROM teachers WHERE email = ? " +
                        "UNION SELECT id FROM admins WHERE email = ? " +
                        "UNION SELECT id FROM moders WHERE email = ?",
                        [value, value, value, value]
                    );
                    if (existingUser.length > 0) {
                        throw new Error("Этот email уже используется!");
                    }
                    return true;
                }),
            body("login")
                .isLength({ min: 3 })
                .withMessage("Логин должен быть не менее 3 символов")
                .custom(async (value) => {
                    const [existingUser] = await db.query(
                        "SELECT id FROM users WHERE login = ? " +
                        "UNION SELECT id FROM teachers WHERE login = ? " +
                        "UNION SELECT id FROM admins WHERE login = ? " +
                        "UNION SELECT id FROM moders WHERE login = ?",
                        [value, value, value, value]
                    );
                    if (existingUser.length > 0) {
                        throw new Error("Этот логин уже используется!");
                    }
                    return true;
                })
        );
    } else if (action === "login") {
        validations.push(
            body("identifier")
                .notEmpty()
                .withMessage("Email или логин обязателен")
                .trim()
                .custom((value) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    const loginRegex = /^[a-zA-Z0-9_]+$/;
                    if (!emailRegex.test(value) && !loginRegex.test(value)) {
                        throw new Error("Некорректный email или логин");
                    }
                    return true;
                })
        );
    }

    validations.push(
        body("password")
            .isLength({ min: 6 })
            .withMessage("Пароль должен быть не менее 6 символов")
    );

    return validations;
};

// Middleware для проверки валидации
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Ошибки валидации:", errors.array());
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Регистрация
router.post(
    "/register",
    validateFields("register"),
    validateRequest,
    async (req, res) => {
        const { email, password, login } = req.body;
        console.log("Запрос на регистрацию:", req.body);

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const role_id = 4; // По умолчанию все новые пользователи — студенты

            const [result] = await db.query(
                `INSERT INTO users (email, login, first_name, last_name, password, role_id, verified, profileCompleted) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [email, login, "", "", hashedPassword, role_id, false, 0]
            );

            // Добавляем id в user_ids
            await db.query("INSERT INTO user_ids (id) VALUES (?)", [result.insertId]);

            // Добавляем настройки пользователя
            await db.query(
                "INSERT INTO user_settings (user_id, language) VALUES (?, ?)",
                [result.insertId, "ru"]
            );

            if (!process.env.JWT_SECRET) {
                console.log("Переменная окружения JWT_SECRET не определена");
                return res.status(500).json({ error: "Ошибка сервера: JWT_SECRET не настроен" });
            }

            const token = jwt.sign(
                { id: result.insertId, role_id, table_name: "users" },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            const roleMap = { 1: "admin", 2: "moderator", 3: "teacher", 4: "student" };
            res.json({ 
                message: "Регистрация успешна!", 
                role: roleMap[role_id], 
                userId: result.insertId, 
                table_name: "users",
                profileCompleted: 0 // Новые пользователи всегда имеют profileCompleted = 0
            });
        } catch (err) {
            console.error("Ошибка регистрации:", err.message, err.stack);
            res.status(500).json({ error: "Ошибка сервера", details: err.message });
        }
    }
);

// Логин
router.post(
    "/login",
    validateFields("login"),
    validateRequest,
    async (req, res) => {
        try {
            const { identifier, password } = req.body;
            console.log("Попытка входа:", { identifier, password });

            // Ищем пользователя по email или логину в четырёх таблицах
            const [users] = await db.query(
                "SELECT id, email, login, password, role_id, first_name, last_name, verified, profileCompleted, 'users' AS table_name " +
                "FROM users WHERE email = ? OR login = ? " +
                "UNION " +
                "SELECT id, email, login, password, role_id, first_name, last_name, NULL AS verified, profileCompleted, 'teachers' AS table_name " +
                "FROM teachers WHERE email = ? OR login = ? " +
                "UNION " +
                "SELECT id, email, login, password, role_id, NULL AS first_name, NULL AS last_name, NULL AS verified, NULL AS profileCompleted, 'admins' AS table_name " +
                "FROM admins WHERE email = ? OR login = ? " +
                "UNION " +
                "SELECT id, email, login, password, role_id, NULL AS first_name, NULL AS last_name, NULL AS verified, NULL AS profileCompleted, 'moders' AS table_name " +
                "FROM moders WHERE email = ? OR login = ?",
                [identifier, identifier, identifier, identifier, identifier, identifier, identifier, identifier]
            );

            if (users.length === 0) {
                console.log("Пользователь не найден:", identifier);
                return res.status(401).json({ error: "Неверный email или логин" });
            }

            const user = users[0];
            console.log("Найден пользователь:", { ...user, password: "[HIDDEN]" });

            // Проверяем пароль
            if (!user.password) {
                console.log("Пароль пользователя пустой:", identifier);
                return res.status(500).json({ error: "Пароль пользователя отсутствует в базе данных" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log("Неверный пароль для пользователя:", identifier);
                return res.status(401).json({ error: "Неверный пароль" });
            }

            // Проверяем JWT_SECRET
            if (!process.env.JWT_SECRET) {
                console.log("Переменная окружения JWT_SECRET не определена");
                return res.status(500).json({ error: "Ошибка сервера: JWT_SECRET не настроен" });
            }

            const token = jwt.sign(
                { id: user.id, role_id: user.role_id, table_name: user.table_name },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            const roleMap = { 1: "admin", 2: "moderator", 3: "teacher", 4: "student" };
            console.log("Успешный вход, токен установлен:", { userId: user.id, role_id: user.role_id, table_name: user.table_name });
            res.json({ 
                message: "Авторизация успешна", 
                userId: user.id, 
                table_name: user.table_name,
                role: roleMap[user.role_id], // Добавляем роль в ответ
                profileCompleted: user.profileCompleted || 0 // Для admins и moders будет 0
            });
        } catch (err) {
            console.error("Ошибка авторизации:", err.message, err.stack);
            res.status(500).json({ error: "Ошибка сервера", details: err.message });
        }
    }
);

module.exports = router;