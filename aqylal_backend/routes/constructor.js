const express = require("express");
const { verifyToken, checkTeacher } = require("../middleware/verify");
const db = require("../db");

const router = express.Router();

// 🔹 1. Получить все игровые пресеты
router.get("/presets", verifyToken, async (req, res) => {
    try {
        const [presets] = await db.query("SELECT * FROM game_presets");
        res.json(presets);
    } catch (err) {
        console.error("Ошибка получения пресетов:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// 🔹 2. Создать задание (учитель)
router.post("/", verifyToken, checkTeacher, async (req, res) => {
    const { title, description, type, classNum, classLetter, subject, due_date, game_preset_id, questions } = req.body;

    if (!title || !description || !type || !classNum || !classLetter || !subject || !due_date || !game_preset_id || !questions) {
        return res.status(400).json({ error: "Все поля обязательны!" });
    }

    try {
        const [assignmentResult] = await db.query(
            "INSERT INTO assignments (title, description, type, class, subject, due_date, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [title, description, type, classNum, subject, due_date, req.user.id]
        );

        const assignmentId = assignmentResult.insertId;

        // 🔹 Привязываем задание к классу
        await db.query(
            "INSERT INTO assignment_classes (assignment_id, class, class_letter) VALUES (?, ?, ?)",
            [assignmentId, classNum, classLetter]
        );

        // 🔹 Добавляем вопросы
        for (let q of questions) {
            await db.query(
                "INSERT INTO questions (assignment_id, question_text, correct_answer) VALUES (?, ?, ?)",
                [assignmentId, q.text, q.correct_answer]
            );
        }

        res.json({ message: "Задание создано!" });

    } catch (err) {
        console.error("Ошибка создания задания:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

router.get("/student", verifyToken, async (req, res) => {
    try {
        const [assignments] = await db.query(
            `SELECT a.*, gp.scene_name 
             FROM assignments a
             JOIN assignment_classes ac ON a.id = ac.assignment_id 
             LEFT JOIN game_presets gp ON a.game_preset_id = gp.id 
             WHERE ac.class = ? AND ac.class_letter = ?`,
            [req.user.grade, req.user.grade_letter]
        );

        // Добавляем вопросы для каждого задания
        for (let assignment of assignments) {
            const [questions] = await db.query(
                "SELECT id, question_text, correct_answer FROM questions WHERE assignment_id = ?",
                [assignment.id]
            );
            assignment.questions = questions;
        }

        res.json(assignments);
    } catch (err) {
        console.error("Ошибка получения заданий:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = router;
