const express = require("express");
const router = express.Router();
const pool = require("../db");
const jwt = require("jsonwebtoken");
const { verifyToken, checkTeacher } = require("../middleware/verify");
const { body, validationResult } = require("express-validator");

// Валидация для создания задания
const assignmentValidation = [
    body("title").notEmpty().withMessage("Название обязательно"),
    body("type").notEmpty().withMessage("Тип задания обязателен"),
    body("grade").isInt({ min: 1, max: 11 }).withMessage("Класс должен быть от 1 до 11"),
    body("grade_letter").matches(/^[А-Я]$/).withMessage("Литера класса должна быть одной заглавной буквой от А до Я"),
    body("subject").notEmpty().withMessage("Предмет обязателен"),
    body("due_date").isDate().withMessage("Дата сдачи должна быть корректной"),
    body("time_limit").notEmpty().withMessage("Лимит времени обязателен"),
    body("is_game").isBoolean().withMessage("Поле is_game должно быть булевым"),
    body("game_tasks").custom((value, { req }) => {
        if (req.body.is_game) {
            if (!Array.isArray(value) || value.length === 0) {
                throw new Error("Для игрового задания требуется хотя бы один вопрос");
            }
            value.forEach((task, index) => {
                if (!task.question) {
                    throw new Error(`Вопрос ${index + 1}: Текст вопроса обязателен`);
                }
                if (!task.question_type) {
                    throw new Error(`Вопрос ${index + 1}: Тип вопроса обязателен`);
                }
                if (["quiz", "true_false", "fill_in", "slider", "pin_answer", "puzzle"].indexOf(task.question_type) === -1) {
                    throw new Error(`Вопрос ${index + 1}: Некорректный тип вопроса`);
                }
                if (task.question_type === "quiz") {
                    if (!Array.isArray(task.options) || task.options.length !== 4) {
                        throw new Error(`Вопрос ${index + 1}: Для викторины требуется ровно 4 варианта ответа`);
                    }
                    if (!Array.isArray(task.correct_answers) || task.correct_answers.length === 0) {
                        throw new Error(`Вопрос ${index + 1}: Укажите хотя бы один правильный ответ`);
                    }
                } else if (task.question_type === "true_false") {
                    if (task.correct_answer !== "Верно" && task.correct_answer !== "Неверно") {
                        throw new Error(`Вопрос ${index + 1}: Правильный ответ должен быть "Верно" или "Неверно"`);
                    }
                } else if (task.question_type === "fill_in") {
                    if (!task.correct_answer) {
                        throw new Error(`Вопрос ${index + 1}: Правильный ответ обязателен`);
                    }
                } else if (task.question_type === "slider") {
                    if (typeof task.min !== "number" || typeof task.max !== "number" || task.min >= task.max) {
                        throw new Error(`Вопрос ${index + 1}: Некорректные значения min/max для слайдера`);
                    }
                    if (typeof task.correct_answer !== "number" || task.correct_answer < task.min || task.correct_answer > task.max) {
                        throw new Error(`Вопрос ${index + 1}: Правильный ответ для слайдера должен быть в диапазоне min/max`);
                    }
                } else if (task.question_type === "pin_answer") {
                    if (!task.image) {
                        throw new Error(`Вопрос ${index + 1}: Изображение обязательно для типа "Закрепите ответ"`);
                    }
                    if (!task.correct_position || typeof task.correct_position.x !== "number" || typeof task.correct_position.y !== "number") {
                        throw new Error(`Вопрос ${index + 1}: Координаты правильного ответа обязательны`);
                    }
                } else if (task.question_type === "puzzle") {
                    if (!task.image) {
                        throw new Error(`Вопрос ${index + 1}: Изображение обязательно для головоломки`);
                    }
                    if (typeof task.pieces !== "number" || task.pieces < 1) {
                        throw new Error(`Вопрос ${index + 1}: Количество частей пазла должно быть больше 0`);
                    }
                }
                if (typeof task.timer !== "number" || task.timer < 0) {
                    throw new Error(`Вопрос ${index + 1}: Таймер должен быть положительным числом`);
                }
                if (typeof task.points !== "number" || task.points < 0) {
                    throw new Error(`Вопрос ${index + 1}: Баллы должны быть положительным числом`);
                }
            });
        }
        return true;
    }),
];

// Создание задания
router.post("/", verifyToken, checkTeacher, assignmentValidation, async (req, res) => {
    const {
        title,
        description,
        type,
        grade,
        grade_letter,
        subject,
        due_date,
        time_limit,
        is_game,
        tasks,
        game_tasks,
    } = req.body;
    const teacher_id = req.user.id;

    try {
        const [result] = await db.query(
            "INSERT INTO assignments (title, description, type, grade, grade_letter, subject, due_date, time_limit, is_game, tasks, game_tasks, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                title,
                description || null,
                type,
                grade,
                grade_letter,
                subject,
                due_date,
                time_limit,
                is_game,
                tasks ? JSON.stringify(tasks) : null,
                game_tasks ? JSON.stringify(game_tasks) : null,
                teacher_id,
            ]
        );
        res.json({ message: "Задание создано", assignmentId: result.insertId });
    } catch (err) {
        console.error("Ошибка создания задания:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получение задания по ID
router.get("/:id", verifyToken, async (req, res) => {
    const assignmentId = req.params.id;

    try {
        const [rows] = await db.query("SELECT * FROM assignments WHERE id = ?", [assignmentId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Задание не найдено" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Ошибка получения задания:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Токен не предоставлен" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Недействительный токен" });
        }
        console.log("Декодированный пользователь из токена:", user);
        req.user = user;
        next();
    });
};

// Применяем middleware ко всем роутам
router.use(authenticateToken);

// Получение конкретного задания (GET /assignments/:id)
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role_id;

    try {
        const [assignment] = await pool.query("SELECT * FROM assignments WHERE id = ?", [id]);
        if (!assignment[0]) {
            return res.status(404).json({ error: "Задание не найдено" });
        }

        if (userRole === 3) {
            const [teacher] = await pool.query("SELECT * FROM teachers WHERE id = ?", [userId]);
            if (!teacher[0]) {
                return res.status(404).json({ error: "Учитель не найден" });
            }
            if (assignment[0].teacher_id !== userId) {
                return res.status(403).json({ error: "Доступ запрещён" });
            }
        }
        if (userRole === 4) {
            const [user] = await pool.query("SELECT grade, grade_letter FROM users WHERE id = ?", [
                userId,
            ]);
            const { grade, grade_letter } = user[0];
            if (assignment[0].grade !== grade || assignment[0].grade_letter !== grade_letter) {
                return res.status(403).json({ error: "Доступ запрещён" });
            }
        }

        let assignmentWithTasks = { ...assignment[0] };
        if (assignment[0].is_game) {
            const [gameTasks] = await pool.query(
                "SELECT * FROM game_tasks WHERE assignment_id = ? ORDER BY task_order",
                [id]
            );
            assignmentWithTasks.game_tasks = gameTasks.map((task) => {
                let parsedOptions = null;
                if (task.options) {
                    try {
                        parsedOptions = JSON.parse(task.options);
                    } catch (err) {
                        console.error(`Ошибка парсинга options для game_task ID ${task.id}:`, task.options, err);
                        parsedOptions = null;
                    }
                }
                return {
                    id: `game-task-${task.id}`,
                    question: task.question,
                    question_type: task.question_type,
                    options: parsedOptions,
                    correct_answer: task.correct_answer,
                };
            });
        } else {
            const [tasks] = await pool.query(
                "SELECT * FROM assignment_tasks WHERE assignment_id = ? ORDER BY task_order",
                [id]
            );
            assignmentWithTasks.tasks = tasks.map((task) => ({
                id: `task-${task.id}`,
                content: task.task_content,
            }));
        }

        res.json(assignmentWithTasks);
    } catch (err) {
        console.error("Ошибка в GET /assignments/:id:", err);
        res.status(500).json({ error: "Ошибка сервера при получении задания" });
    }
});

// Обновление задания (PUT /assignments/:id)
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        type,
        grade,
        grade_letter,
        subject,
        due_date,
        time_limit,
        is_game,
        tasks,
        game_tasks,
    } = req.body;
    const teacher_id = req.user.id;

    if (req.user.role_id !== 3) {
        return res.status(403).json({ error: "Только учителя могут редактировать задания" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [teacher] = await connection.query("SELECT * FROM teachers WHERE id = ?", [teacher_id]);
        if (!teacher[0]) {
            return res.status(404).json({ error: "Учитель не найден" });
        }

        const [assignment] = await connection.query("SELECT * FROM assignments WHERE id = ?", [id]);
        if (!assignment[0]) {
            return res.status(404).json({ error: "Задание не найдено" });
        }
        if (assignment[0].teacher_id !== teacher_id) {
            return res.status(403).json({ error: "Доступ запрещён" });
        }

        await connection.query(
            `UPDATE assignments
             SET title = ?, description = ?, type = ?, grade = ?, grade_letter = ?, subject = ?, due_date = ?, time_limit = ?, is_game = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                title || assignment[0].title,
                description || assignment[0].description,
                type || assignment[0].type,
                grade || assignment[0].grade,
                grade_letter || assignment[0].grade_letter,
                subject || assignment[0].subject,
                due_date || assignment[0].due_date,
                time_limit || assignment[0].time_limit,
                is_game ? 1 : 0,
                id,
            ]
        );

        if (assignment[0].is_game) {
            await connection.query("DELETE FROM game_tasks WHERE assignment_id = ?", [id]);
        } else {
            await connection.query("DELETE FROM assignment_tasks WHERE assignment_id = ?", [id]);
        }

        if (is_game && game_tasks && Array.isArray(game_tasks) && game_tasks.length > 0) {
            for (let i = 0; i < game_tasks.length; i++) {
                const task = game_tasks[i];
                await connection.query(
                    `INSERT INTO game_tasks (assignment_id, question, question_type, options, correct_answer, task_order)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        task.question,
                        task.question_type,
                        task.options ? JSON.stringify(task.options) : null,
                        task.correct_answer,
                        i,
                    ]
                );
            }
        } else if (!is_game && tasks && Array.isArray(tasks) && tasks.length > 0) {
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                await connection.query(
                    `INSERT INTO assignment_tasks (assignment_id, task_content, task_order)
                     VALUES (?, ?, ?)`,
                    [id, task.content, i]
                );
            }
        }

        const [updatedAssignment] = await connection.query(
            "SELECT * FROM assignments WHERE id = ?",
            [id]
        );

        let assignmentWithTasks = { ...updatedAssignment[0] };
        if (is_game) {
            const [gameTasks] = await connection.query(
                "SELECT * FROM game_tasks WHERE assignment_id = ? ORDER BY task_order",
                [id]
            );
            assignmentWithTasks.game_tasks = gameTasks.map((task) => {
                let parsedOptions = null;
                if (task.options) {
                    try {
                        parsedOptions = JSON.parse(task.options);
                    } catch (err) {
                        console.error(`Ошибка парсинга options для game_task ID ${task.id}:`, task.options, err);
                        parsedOptions = null;
                    }
                }
                return {
                    id: `game-task-${task.id}`,
                    question: task.question,
                    question_type: task.question_type,
                    options: parsedOptions,
                    correct_answer: task.correct_answer,
                };
            });
        } else {
            const [tasks] = await connection.query(
                "SELECT * FROM assignment_tasks WHERE assignment_id = ? ORDER BY task_order",
                [id]
            );
            assignmentWithTasks.tasks = tasks.map((task) => ({
                id: `task-${task.id}`,
                content: task.task_content,
            }));
        }

        await connection.commit();
        res.json(assignmentWithTasks);
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: "Ошибка сервера при обновлении задания" });
    } finally {
        if (connection) connection.release();
    }
});

// Удаление задания (DELETE /assignments/:id)
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    const teacher_id = req.user.id;

    if (req.user.role_id !== 3) {
        return res.status(403).json({ error: "Только учителя могут удалять задания" });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [teacher] = await connection.query("SELECT * FROM teachers WHERE id = ?", [teacher_id]);
        if (!teacher[0]) {
            return res.status(404).json({ error: "Учитель не найден" });
        }

        const [assignment] = await connection.query("SELECT * FROM assignments WHERE id = ?", [
            id,
        ]);
        if (!assignment[0]) {
            return res.status(404).json({ error: "Задание не найдено" });
        }
        if (assignment[0].teacher_id !== teacher_id) {
            return res.status(403).json({ error: "Доступ запрещён" });
        }

        await connection.query("DELETE FROM assignment_tasks WHERE assignment_id = ?", [id]);
        await connection.query("DELETE FROM assignments WHERE id = ?", [id]);

        await connection.commit();
        res.json({ message: "Задание успешно удалено" });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: "Ошибка сервера при удалении задания" });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;