const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser"); // Добавляем cookie-parser

dotenv.config();
const app = express();

// Настройка CORS для поддержки credentials
app.use(
    cors({
        origin: "http://192.168.0.44:3000", // домен фронтенда
        credentials: true, // Разрешаем отправку cookie
    })
);
app.use(express.json());
app.use(cookieParser());

// Подключаем маршруты
app.use("/uploads", express.static("uploads"));

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

const assignmentsRoutes = require("./routes/assignments");
app.use("/assignments", assignmentsRoutes);

const sessionsRoutes = require("./routes/sessions");
app.use("/sessions", sessionsRoutes);

const resultsRoutes = require("./routes/results");
app.use("/results", resultsRoutes);


// Обработка 404
app.use((req, res, next) => {
    console.log(`Маршрут не найден: ${req.method} ${req.url}`);
    res.status(404).json({ error: "Маршрут не найден" });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error("Глобальная ошибка:", err);
    res.status(500).json({ error: "Ошибка сервера", details: err.message });
});

app.listen(3001, () => console.log("Сервер запущен на порту 3001"));