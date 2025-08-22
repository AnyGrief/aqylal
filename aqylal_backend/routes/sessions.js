const express = require("express");
const { verifyToken } = require("../middleware/verify");

const router = express.Router();

// Выход
router.post("/logout", async (req, res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.json({ message: "Выход выполнен успешно" });
    } catch (err) {
        console.error("Ошибка при выходе:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});



// Завершение всех сессий пользователя
router.post("/logout-all", verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Удаляем все сессии пользователя из базы данных
        await db.query("DELETE FROM sessions WHERE user_id = ?", [userId]);

        // Очищаем cookie на текущем устройстве
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.json({ message: "Все сессии завершены." });
    } catch (err) {
        console.error("Ошибка при завершении всех сессий:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = router;