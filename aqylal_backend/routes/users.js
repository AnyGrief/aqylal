const express = require("express");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyToken, checkModerator } = require("../middleware/verify");
const db = require("../db");

const router = express.Router();

const userValidation = {
    password: body("newPassword")
        .isLength({ min: 6 })
        .withMessage("Пароль должен быть не менее 6 символов")
        .matches(/\d/)
        .withMessage("Пароль должен содержать хотя бы одну цифру")
        .matches(/[A-Z]/)
        .withMessage("Пароль должен содержать хотя бы одну заглавную букву")
        .matches(/[a-z]/)
        .withMessage("Пароль должен содержать хотя бы одну строчную букву"),
    email: body("email")
        .isEmail()
        .withMessage("Некорректный email")
        .normalizeEmail(),
    name: (fieldName) =>
        body(fieldName)
            .trim()
            .isLength({ min: 2 })
            .withMessage(`${fieldName} должно быть не менее 2 символов`)
            .matches(/^[А-Яа-яA-Za-z\s-]+$/u)
            .withMessage(`${fieldName} может содержать только буквы, пробел и тире`),
    phone: body("phone")
        .optional()
        .matches(/^\+7\d{10}$/)
        .withMessage("Телефон должен быть в формате +7XXXXXXXXXX"),
    grade: body("grade")
        .optional()
        .isInt({ min: 1, max: 11 })
        .withMessage("Класс должен быть от 1 до 11"),
    gradeLetter: body("grade_letter")
        .optional()
        .matches(/^[А-Я]$/u)
        .withMessage("Буква класса должна быть заглавной буквой"),
};

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

router.get("/list", verifyToken, checkModerator, async (req, res) => {
    try {
        const currentUserRoleId = req.user.role_id;
        let users;

        if (currentUserRoleId === 1) {
            const [result] = await db.query(
                "SELECT id, email, login, role_id, first_name, last_name, patronymic FROM users " +
                "UNION SELECT id, email, login, role_id, first_name, last_name, patronymic FROM teachers " +
                "UNION SELECT id, email, login, role_id, first_name, last_name, patronymic FROM moders " +
                "UNION SELECT id, email, login, role_id, first_name, last_name, patronymic FROM admins"
            );
            users = result;
        } else if (currentUserRoleId === 2) {
            const [result] = await db.query(
                "SELECT id, email, login, role_id, first_name, last_name, patronymic FROM users " +
                "UNION SELECT id, email, login, role_id, first_name, last_name, patronymic FROM teachers"
            );
            users = result;
        } else {
            return res.status(403).json({ error: "У вас нет прав для просмотра списка пользователей" });
        }

        const roleMap = { 1: "admin", 2: "moderator", 3: "teacher", 4: "student" };
        const usersWithRoles = users.map((user) => ({
            ...user,
            role: roleMap[user.role_id] || "student",
        }));

        res.json(usersWithRoles);
    } catch (err) {
        console.error("Ошибка получения списка пользователей:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.put("/profile", verifyToken, async (req, res) => {
    const { first_name, last_name, patronymic, login, phone, birth_date, grade, grade_letter, role_id, subject } = req.body;
    const userId = req.user.id;
    const currentRoleId = req.user.role_id;

    console.log(`Обновление профиля: userId=${userId}, currentRoleId=${currentRoleId}, newRoleId=${role_id}`);

    try {
        let sourceTable, targetTable;
        switch (currentRoleId) {
            case 1: sourceTable = "admins"; break;
            case 2: sourceTable = "moders"; break;
            case 3: sourceTable = "teachers"; break;
            case 4: sourceTable = "users"; break;
            default: return res.status(400).json({ error: "Неверная текущая роль пользователя" });
        }

        if (role_id && role_id !== currentRoleId) {
            let newTable;
            switch (role_id) {
                case 1: newTable = "admins"; break;
                case 2: newTable = "moders"; break;
                case 3: newTable = "teachers"; break;
                case 4: newTable = "users"; break;
                default: return res.status(400).json({ error: "Неверная новая роль пользователя" });
            }

            if (sourceTable !== newTable) {
                console.log(`Создание нового пользователя в ${newTable} из ${sourceTable}`);

                const [oldUser] = await db.query(
                    `SELECT email, login, password, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted 
                     FROM ${sourceTable} WHERE id = ?`,
                    [userId]
                );

                if (oldUser.length === 0) {
                    console.log(`Пользователь не найден в таблице ${sourceTable}`);
                    return res.status(404).json({ error: "Пользователь не найден" });
                }

                const [newResult] = await db.query(
                    `INSERT INTO ${newTable} (email, login, password, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        oldUser[0].email, oldUser[0].login, oldUser[0].password, role_id, oldUser[0].first_name,
                        oldUser[0].last_name, oldUser[0].patronymic, oldUser[0].phone, oldUser[0].birth_date,
                        oldUser[0].profileCompleted
                    ]
                );

                const newUserId = newResult.insertId;

                await db.query("UPDATE sessions SET user_id = ? WHERE user_id = ?", [newUserId, userId]);
                await db.query(
                    "INSERT INTO user_settings (user_id, language) SELECT ?, language FROM user_settings WHERE user_id = ? ON DUPLICATE KEY UPDATE user_id = ?",
                    [newUserId, userId, newUserId]
                );
                if (role_id === 3) {
                    await db.query(
                        "INSERT INTO teacher_subjects (teacher_id, subject_id) SELECT ?, subject_id FROM teacher_subjects WHERE teacher_id = ?",
                        [newUserId, userId]
                    );
                }

                await db.query(`DELETE FROM ${sourceTable} WHERE id = ?`, [userId]);

                const newToken = jwt.sign(
                    { id: newUserId, role_id: role_id },
                    process.env.JWT_SECRET,
                    { expiresIn: "7d" }
                );

                res.cookie("token", newToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });

                res.json({ message: "Роль изменена, войдите заново с новым токеном", newUserId, token: newToken });
                return;
            }
        }

        targetTable = (role_id || currentRoleId) === 4 ? "users" : 
                     (role_id || currentRoleId) === 3 ? "teachers" : 
                     (role_id || currentRoleId) === 2 ? "moders" : "admins";

        const query = `
            UPDATE ${targetTable}
            SET first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                patronymic = COALESCE(?, patronymic),
                login = COALESCE(?, login),
                phone = COALESCE(?, phone),
                birth_date = COALESCE(?, birth_date),
                ${targetTable === "users" ? "grade = COALESCE(?, grade), grade_letter = COALESCE(?, grade_letter)," : ""}
                profileCompleted = TRUE
            WHERE id = ?
        `;
        const params = [first_name, last_name, patronymic, login, phone, birth_date];
        if (targetTable === "users") params.push(grade, grade_letter);
        params.push(userId);

        await db.query(query, params);

        if ((role_id || currentRoleId) === 3 && Array.isArray(subject)) {
            await db.query("DELETE FROM teacher_subjects WHERE teacher_id = ?", [userId]);
            for (const subjName of subject) {
                const [subjectRow] = await db.query("SELECT id FROM subjects WHERE name = ?", [subjName]);
                if (subjectRow.length > 0) {
                    await db.query(
                        "INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)",
                        [userId, subjectRow[0].id]
                    );
                }
            }
        }

        res.json({ message: "Профиль обновлён" });
    } catch (err) {
        console.error("🔹 Ошибка обновления профиля:", err);
        res.status(500).json({ error: "Ошибка сервера", details: err.message });
    }
});

router.get('/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id || 4;

        const [user] = await db.query(
            `SELECT id, email, login, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted
             FROM users WHERE id = ? 
             UNION 
             SELECT id, email, login, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted
             FROM teachers WHERE id = ?
             UNION 
             SELECT id, email, login, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted
             FROM moders WHERE id = ?
             UNION 
             SELECT id, email, login, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted
             FROM admins WHERE id = ?`,
            [userId, userId, userId, userId]
        );

        if (user.length === 0) {
            console.log(`Пользователь не найден в таблицах, userId=${userId}`);
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const userData = user[0];

        if (roleId === 4) {
            const [studentData] = await db.query(
                `SELECT grade, grade_letter FROM users WHERE id = ?`,
                [userId]
            );
            if (studentData.length > 0) {
                userData.grade = studentData[0].grade;
                userData.grade_letter = studentData[0].grade_letter;
            }
        }

        if (roleId === 3) {
            const [subjects] = await db.query(
                `SELECT s.name 
                 FROM subjects s 
                 JOIN teacher_subjects ts ON s.id = ts.subject_id 
                 WHERE ts.teacher_id = ?`,
                [userId]
            );
            userData.subject = subjects.map((s) => s.name);
        }

        const [settings] = await db.query(
            "SELECT language FROM user_settings WHERE user_id = ?",
            [userId]
        );
        userData.language = settings.length > 0 ? settings[0].language : "ru";

        res.json(userData);
    } catch (err) {
        console.error("Ошибка загрузки профиля:", err);
        res.status(500).json({ error: "Ошибка сервера", details: err.message });
    }
});

router.get("/check-profile", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const roleId = req.user.role_id;

        let tableName;
        switch (roleId) {
            case 1: tableName = "admins"; break;
            case 2: tableName = "moders"; break;
            case 3: tableName = "teachers"; break;
            case 4: tableName = "users"; break;
            default: return res.status(400).json({ error: "Неверная роль пользователя" });
        }

        const [user] = await db.query(
            `SELECT profileCompleted ${roleId === 4 ? ", grade, grade_letter" : ""} 
             FROM ${tableName} WHERE id = ?`,
            [userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        let hasSubjects = false;
        if (roleId === 3) {
            const [subjects] = await db.query(
                `SELECT s.name 
                 FROM subjects s 
                 JOIN teacher_subjects ts ON s.id = ts.subject_id 
                 WHERE ts.teacher_id = ?`,
                [userId]
            );
            hasSubjects = subjects.length > 0;
            console.log(`check-profile: userId=${userId}, subjects=${JSON.stringify(subjects)}, hasSubjects=${hasSubjects}`);
        }

        res.json({
            profileCompleted: user[0].profileCompleted,
            ...(roleId === 3 && { subject: hasSubjects }),
            ...(roleId === 4 && { grade: user[0].grade, grade_letter: user[0].grade_letter }),
        });
    } catch (err) {
        console.error("Ошибка проверки профиля:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.get("/role", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [user] = await db.query(
            "SELECT role_id FROM users WHERE id = ? UNION SELECT role_id FROM teachers WHERE id = ? UNION SELECT role_id FROM moders WHERE id = ? UNION SELECT role_id FROM admins WHERE id = ?",
            [userId, userId, userId, userId]
        );

        if (user.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const roleMap = { 1: "admin", 2: "moderator", 3: "teacher", 4: "student" };
        const role = roleMap[user[0].role_id] || "student";
        res.json({ role });
    } catch (err) {
        console.error("Ошибка получения роли:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.put("/change-password", verifyToken, async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;
    const roleId = req.user.role_id;

    if (!oldPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: "Все поля обязательны" });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "Новый пароль и подтверждение не совпадают" });
    }

    try {
        let tableName;
        switch (roleId) {
            case 1: tableName = "admins"; break;
            case 2: tableName = "moders"; break;
            case 3: tableName = "teachers"; break;
            case 4: tableName = "users"; break;
            default: return res.status(400).json({ error: "Неверная роль пользователя" });
        }

        const [user] = await db.query(`SELECT password FROM ${tableName} WHERE id = ?`, [userId]);
        if (user.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user[0].password);
        if (!isMatch) {
            return res.status(400).json({ error: "Старый пароль неверный" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(`UPDATE ${tableName} SET password = ? WHERE id = ?`, [hashedPassword, userId]);

        res.json({ message: "Пароль успешно изменён" });
    } catch (err) {
        console.error("Ошибка смены пароля:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.put("/change-language", verifyToken, async (req, res) => {
    const { language } = req.body;
    const userId = req.user.id;

    if (!["ru", "kz"].includes(language)) {
        return res.status(400).json({ error: "Неверный язык. Доступны: 'ru', 'kz'" });
    }

    try {
        await db.query(
            "INSERT INTO user_settings (user_id, language) VALUES (?, ?) ON DUPLICATE KEY UPDATE language = ?",
            [userId, language, language]
        );
        res.json({ message: "Язык успешно изменён" });
    } catch (err) {
        console.error("Ошибка смены языка:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.put("/update-role", verifyToken, checkModerator, async (req, res) => {
    const { userId, newRoleId } = req.body;
    const currentUserRoleId = req.user.role_id;

    const validRoles = [1, 2, 3, 4];
    if (!userId || !newRoleId || !validRoles.includes(newRoleId)) {
        return res.status(400).json({ error: "Некорректный ID пользователя или роль" });
    }

    try {
        const [targetUser] = await db.query(
            "SELECT role_id FROM users WHERE id = ? " +
            "UNION SELECT role_id FROM teachers WHERE id = ? " +
            "UNION SELECT role_id FROM moders WHERE id = ? " +
            "UNION SELECT role_id FROM admins WHERE id = ?",
            [userId, userId, userId, userId]
        );

        if (targetUser.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const targetUserRoleId = targetUser[0].role_id;

        if (currentUserRoleId === 2 && (targetUserRoleId === 1 || targetUserRoleId === 2)) {
            return res.status(403).json({ error: "У вас нет прав для редактирования этого пользователя" });
        }

        let sourceTable, targetTable;
        switch (targetUserRoleId) {
            case 1: sourceTable = "admins"; break;
            case 2: sourceTable = "moders"; break;
            case 3: sourceTable = "teachers"; break;
            case 4: sourceTable = "users"; break;
            default: return res.status(400).json({ error: "Неверная роль пользователя" });
        }

        switch (newRoleId) {
            case 1: targetTable = "admins"; break;
            case 2: targetTable = "moders"; break;
            case 3: targetTable = "teachers"; break;
            case 4: targetTable = "users"; break;
            default: return res.status(400).json({ error: "Неверная новая роль" });
        }

        if (sourceTable !== targetTable) {
            const [oldUser] = await db.query(
                `SELECT email, login, password, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted 
                 FROM ${sourceTable} WHERE id = ?`,
                [userId]
            );

            if (oldUser.length === 0) {
                return res.status(404).json({ error: "Пользователь не найден" });
            }

            const [newResult] = await db.query(
                `INSERT INTO ${targetTable} (email, login, password, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    oldUser[0].email, oldUser[0].login, oldUser[0].password, newRoleId, oldUser[0].first_name,
                    oldUser[0].last_name, oldUser[0].patronymic, oldUser[0].phone, oldUser[0].birth_date,
                    oldUser[0].profileCompleted
                ]
            );

            const newUserId = newResult.insertId;

            await db.query("UPDATE sessions SET user_id = ? WHERE user_id = ?", [newUserId, userId]);
            await db.query(
                "INSERT INTO user_settings (user_id, language) SELECT ?, language FROM user_settings WHERE user_id = ? ON DUPLICATE KEY UPDATE user_id = ?",
                [newUserId, userId, newUserId]
            );
            if (newRoleId === 3) {
                await db.query(
                    "INSERT INTO teacher_subjects (teacher_id, subject_id) SELECT ?, subject_id FROM teacher_subjects WHERE teacher_id = ?",
                    [newUserId, userId]
                );
            }

            await db.query(`DELETE FROM ${sourceTable} WHERE id = ?`, [userId]);

            const newToken = jwt.sign(
                { id: newUserId, role_id: newRoleId },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            res.cookie("token", newToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.json({ message: "Роль пользователя обновлена", newUserId, token: newToken });
        } else {
            await db.query(
                `UPDATE ${sourceTable} SET role_id = ? WHERE id = ?`,
                [newRoleId, userId]
            );

            const roleMap = { 1: "admin", 2: "moderator", 3: "teacher", 4: "student" };
            res.json({ message: `Роль пользователя обновлена до ${roleMap[newRoleId]}` });
        }
    } catch (err) {
        console.error("Ошибка обновления роли:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.post("/forgot-password", 
    [userValidation.email],
    validateRequest,
    async (req, res) => {
        const { email } = req.body;

        try {
            const [results] = await db.query(
                "SELECT * FROM users WHERE email = ? UNION SELECT * FROM teachers WHERE email = ? UNION SELECT * FROM admins WHERE email = ? UNION SELECT * FROM moders WHERE email = ?",
                [email, email, email, email]
            );
            if (results.length === 0) return res.status(404).json({ error: "Пользователь не найден" });

            const user = results[0];
            const resetToken = jwt.sign(
                { id: user.id, email: user.email }, 
                process.env.JWT_SECRET, 
                { expiresIn: "15m" }
            );

            await db.query(
                "DELETE FROM email_tokens WHERE user_id = ? AND type = 'password_reset'", 
                [user.id]
            );

            await db.query(
                "INSERT INTO email_tokens (user_id, token, type, expires_at) VALUES (?, ?, 'password_reset', DATE_ADD(NOW(), INTERVAL 15 MINUTE))", 
                [user.id, resetToken]
            );

            res.json({ message: "Ссылка для сброса пароля отправлена на email." });
        } catch (err) {
            console.error("Ошибка генерации токена:", err);
            res.status(500).json({ error: "Ошибка сервера" });
        }
    }
);

router.post("/reset-password", 
    [
        body("token").notEmpty().withMessage("Токен обязателен"),
        userValidation.password
    ],
    validateRequest,
    async (req, res) => {
        const { token, newPassword } = req.body;

        try {
            const [tokenResults] = await db.query(
                "SELECT * FROM email_tokens WHERE token = ? AND type = 'password_reset' AND expires_at > NOW()", 
                [token]
            );
            
            if (tokenResults.length === 0) {
                return res.status(400).json({ error: "Токен недействителен или истёк" });
            }

            const userId = tokenResults[0].user_id;
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await db.query(
                "UPDATE users SET password = ? WHERE id = ? UNION UPDATE teachers SET password = ? WHERE id = ? UNION UPDATE admins SET password = ? WHERE id = ? UNION UPDATE moders SET password = ? WHERE id = ?",
                [hashedPassword, userId, hashedPassword, userId, hashedPassword, userId, hashedPassword, userId]
            );

            await db.query(
                "DELETE FROM email_tokens WHERE user_id = ? AND type = 'password_reset'", 
                [userId]
            );

            await db.query("DELETE FROM sessions WHERE user_id = ?", [userId]);

            res.json({ message: "Пароль успешно изменён! Пожалуйста, войдите снова." });
        } catch (err) {
            console.error("Ошибка сброса пароля:", err);
            res.status(500).json({ error: "Ошибка сервера" });
        }
    }
);

router.get("/subjects", verifyToken, async (req, res) => {
    try {
        console.log("Эндпоинт /subjects вызван для пользователя:", req.user);
        const [subjects] = await db.query("SELECT name FROM subjects");
        console.log("Результат запроса к subjects:", subjects);
        if (subjects.length === 0) {
            console.log("Таблица subjects пуста");
            return res.status(404).json({ error: "Предметы не найдены" });
        }
        const response = subjects.map(s => s.name);
        console.log("Отправляемый ответ:", response);
        res.setHeader("Content-Type", "application/json");
        res.status(200).json(response);
    } catch (err) {
        console.error("Ошибка получения списка предметов:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;