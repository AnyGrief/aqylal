const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET; // Храним секретный ключ в .env
const mysql = require("mysql2");

const db = require("../db");

module.exports = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "Токен отсутствует" });
    }

    try {
        const decoded = jwt.verify(token.split(" ")[1], secret); // Убираем "Bearer "
        req.user = decoded; // Добавляем данные пользователя в запрос
        next();
    } catch (err) {
        return res.status(403).json({ error: "Неверный или просроченный токен" });
    }
};


const verifyToken = (req, res, next) => {
    if (!req.headers.authorization) {
        return res.status(401).json({ error: "Токен отсутствует" });
    }

    const tokenParts = req.headers.authorization.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
        return res.status(400).json({ error: "Некорректный формат токена" });
    }

    const tokenValue = tokenParts[1];

    // Проверяем, есть ли токен в сессиях
    const query = "SELECT * FROM sessions WHERE token = ?";
    db.query(query, [tokenValue], (err, results) => {
        if (err) {
            console.error("Ошибка при проверке сессии:", err);
            return res.status(500).json({ error: "Ошибка сервера" });
        }

        if (results.length === 0) {
            return res.status(403).json({ error: "Сессия истекла или токен недействителен." });
        }

        jwt.verify(tokenValue, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("Ошибка верификации JWT:", err);
                return res.status(403).json({ error: "Недействительный токен" });
            }

            req.user = decoded; // Добавляем пользователя в запрос
            next(); // Переходим к следующему middleware
        });
    });
};



const checkAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "Доступ запрещен. Требуется роль администратора." });
    }
    next();
};

module.exports = { verifyToken, checkAdmin };
