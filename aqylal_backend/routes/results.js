const express = require("express");
const { verifyToken, checkTeacher } = require("../middleware/verify");
const db = require("../db");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = "uploads/";
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Валидация для заданий
const assignmentValidation = [
    body("title").notEmpty().withMessage("Название обязательно"),
    body("type").notEmpty().withMessage("Тип задания обязателен"),
    body("grade").isInt({ min: 1, max: 11 }).withMessage("Класс должен быть от 1 до 11"),
    body("grade_letter").matches(/^[А-Я]$/).withMessage("Литера класса должна быть одной заглавной буквой от А до Я"),
    body("subject").notEmpty().withMessage("Предмет обязателен"),
    body("due_date").isISO8601().withMessage("Дата сдачи должна быть в формате YYYY-MM-DD или ISO (например, 2025-04-07T19:00:00.000Z)"),
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
                if (["quiz", "true_false", "fill_in", "slider", "pin_answer", "puzzle", "matching"].indexOf(task.question_type) === -1) {
                    throw new Error(`Вопрос ${index + 1}: Некорректный тип вопроса`);
                }
                if (task.question_type === "quiz") {
                    if (!Array.isArray(task.options) || task.options.length < 2 || task.options.length > 8) {
                        throw new Error(`Вопрос ${index + 1}: Для викторины требуется от 2 до 8 вариантов ответа`);
                    }
                    if (!Array.isArray(task.correct_answers) || task.correct_answers.length === 0) {
                        throw new Error(`Вопрос ${index + 1}: Укажите хотя бы один правильный ответ`);
                    }
                    // Проверяем, что правильные ответы соответствуют вариантам
                    task.correct_answers.forEach((answer, answerIndex) => {
                        if (!task.options.includes(answer)) {
                            throw new Error(`Вопрос ${index + 1}: Правильный ответ ${answerIndex + 1} не соответствует ни одному из вариантов`);
                        }
                    });
                } else if (task.question_type === "true_false") {
                    if (!task.correct_answers || (task.correct_answers !== "Верно" && task.correct_answers !== "Неверно")) {
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
                } else if (task.question_type === "matching") {
                    if (!Array.isArray(task.options) || task.options.length < 2) {
                        throw new Error(`Вопрос ${index + 1}: Для сопоставления требуется минимум 2 пары`);
                    }
                    task.options.forEach((pair, pairIndex) => {
                        if (!pair.left || !pair.right) {
                            throw new Error(`Вопрос ${index + 1}: Пара ${pairIndex + 1} должна иметь обе части (левая и правая)`);
                        }
                    });
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

// Middleware для проверки результатов валидации
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Ошибки валидации:", errors.array());
        return res.status(400).json({ errors: errors.array(), receivedData: req.body });
    }
    next();
};

// Маршрут для загрузки изображений
router.post("/upload", verifyToken, upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Создание задания (только учитель)
router.post("/assignments", verifyToken, checkTeacher, assignmentValidation, validateRequest, async (req, res) => {
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
        console.log("Полученные данные для создания задания:", req.body);

        // Нормализуем due_date в формат YYYY-MM-DD для хранения
        const normalizedDueDate = new Date(due_date).toISOString().split("T")[0];

        const [result] = await db.query(
            "INSERT INTO assignments (title, description, type, grade, grade_letter, subject, due_date, time_limit, is_game, tasks, game_tasks, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                title,
                description || null,
                type,
                grade,
                grade_letter,
                subject,
                normalizedDueDate,
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

// Получение списка заданий учителя с пагинацией, фильтрацией, сортировкой и поиском
router.get("/assignments", verifyToken, checkTeacher, async (req, res) => {
    const teacherId = req.user.id;
    const {
        page = 1,
        limit = 10,
        sortBy = "due_date",
        sortOrder = "desc",
        search,
        subject,
        grade,
        is_game,
        type,
    } = req.query;

    try {
        // Базовый SQL-запрос для выборки заданий
        let query = "SELECT * FROM assignments WHERE teacher_id = ?";
        const queryParams = [teacherId];

        // Фильтрация по поиску (по названию или предмету)
        if (search) {
            query += " AND (title LIKE ? OR subject LIKE ?)";
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        // Фильтрация по предмету
        if (subject) {
            query += " AND subject = ?";
            queryParams.push(subject);
        }

        // Фильтрация по классу
        if (grade) {
            query += " AND grade = ?";
            queryParams.push(parseInt(grade));
        }

        // Фильтрация по типу задания (Классическое/Интерактивное)
        if (is_game !== undefined) {
            query += " AND is_game = ?";
            queryParams.push(is_game === "true" ? 1 : 0);
        }

        // Фильтрация по категории задания (ФО, ДЗ, Рефлексия, СОР, СОЧ)
        if (type) {
            query += " AND type = ?";
            queryParams.push(type);
        }

        // Сортировка
        const validSortFields = ["due_date", "subject", "grade", "is_game", "type"];
        const validSortOrders = ["asc", "desc"];
        const sortField = validSortFields.includes(sortBy) ? sortBy : "due_date";
        const order = validSortOrders.includes(sortOrder) ? sortOrder : "desc";
        query += ` ORDER BY ${sortField} ${order}`;

        // Пагинация
        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 10;
        const offset = (pageNum - 1) * limitNum;
        query += " LIMIT ? OFFSET ?";
        queryParams.push(limitNum, offset);

        // Выполнение запроса для получения заданий
        const [assignments] = await db.query(query, queryParams);

        // Подсчёт общего количества записей (для пагинации)
        let countQuery = "SELECT COUNT(*) as total FROM assignments WHERE teacher_id = ?";
        const countParams = [teacherId];
        if (search) {
            countQuery += " AND (title LIKE ? OR subject LIKE ?)";
            countParams.push(`%${search}%`, `%${search}%`);
        }
        if (subject) {
            countQuery += " AND subject = ?";
            countParams.push(subject);
        }
        if (grade) {
            countQuery += " AND grade = ?";
            countParams.push(parseInt(grade));
        }
        if (is_game !== undefined) {
            countQuery += " AND is_game = ?";
            countParams.push(is_game === "true" ? 1 : 0);
        }
        if (type) {
            countQuery += " AND type = ?";
            countParams.push(type);
        }

        const [[{ total }]] = await db.query(countQuery, countParams);
        const totalPages = Math.ceil(total / limitNum);

        // Форматируем задания (преобразуем JSON-поля, если это строка)
        const formattedAssignments = assignments.map((assignment) => ({
            ...assignment,
            tasks: assignment.tasks
                ? typeof assignment.tasks === "string"
                    ? JSON.parse(assignment.tasks)
                    : assignment.tasks
                : null,
            game_tasks: assignment.game_tasks
                ? typeof assignment.game_tasks === "string"
                    ? JSON.parse(assignment.game_tasks)
                    : assignment.game_tasks
                : null,
        }));

        res.json({
            data: formattedAssignments,
            total,
            totalPages,
        });
    } catch (err) {
        console.error("Ошибка получения заданий:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получение задания по ID
router.get("/assignments/:id", verifyToken, async (req, res) => {
    const assignmentId = req.params.id;

    try {
        const [rows] = await db.query("SELECT * FROM assignments WHERE id = ?", [assignmentId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Задание не найдено" });
        }
        const assignment = rows[0];
        res.json({
            ...assignment,
            tasks: assignment.tasks
                ? typeof assignment.tasks === "string"
                    ? JSON.parse(assignment.tasks)
                    : assignment.tasks
                : null,
            game_tasks: assignment.game_tasks
                ? typeof assignment.game_tasks === "string"
                    ? JSON.parse(assignment.game_tasks)
                    : assignment.game_tasks
                : null,
        });
    } catch (err) {
        console.error("Ошибка получения задания:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Обновление задания (только учитель)
router.put("/assignments/:id", verifyToken, checkTeacher, assignmentValidation, validateRequest, async (req, res) => {
    const assignmentId = req.params.id;
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
        const [assignment] = await db.query("SELECT teacher_id FROM assignments WHERE id = ?", [assignmentId]);
        if (assignment.length === 0) {
            return res.status(404).json({ error: "Задание не найдено" });
        }
        if (assignment[0].teacher_id !== teacher_id) {
            return res.status(403).json({ error: "Вы не можете редактировать это задание" });
        }

        // Нормализуем due_date в формат YYYY-MM-DD для хранения
        const normalizedDueDate = new Date(due_date).toISOString().split("T")[0];

        await db.query(
            "UPDATE assignments SET title = ?, description = ?, type = ?, grade = ?, grade_letter = ?, subject = ?, due_date = ?, time_limit = ?, is_game = ?, tasks = ?, game_tasks = ? WHERE id = ?",
            [
                title,
                description || null,
                type,
                grade,
                grade_letter,
                subject,
                normalizedDueDate,
                time_limit,
                is_game,
                tasks ? JSON.stringify(tasks) : null,
                game_tasks ? JSON.stringify(game_tasks) : null,
                assignmentId,
            ]
        );
        res.json({ message: "Задание обновлено" });
    } catch (err) {
        console.error("Ошибка обновления задания:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Удаление задания (только учитель)
router.delete("/assignments/:id", verifyToken, checkTeacher, async (req, res) => {
    const assignmentId = req.params.id;
    const teacher_id = req.user.id;

    try {
        const [assignment] = await db.query("SELECT teacher_id FROM assignments WHERE id = ?", [assignmentId]);
        if (assignment.length === 0) {
            return res.status(404).json({ error: "Задание не найдено" });
        }
        if (assignment[0].teacher_id !== teacher_id) {
            return res.status(403).json({ error: "Вы не можете удалить это задание" });
        }

        await db.query("DELETE FROM assignments WHERE id = ?", [assignmentId]);
        res.json({ message: "Задание удалено" });
    } catch (err) {
        console.error("Ошибка удаления задания:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Отправка ответов на задание (для учеников)
router.post("/assignments/:id/submit", verifyToken, async (req, res) => {
    const assignmentId = req.params.id;
    const { answers } = req.body;
    const studentId = req.user.id;

    if (req.user.role_id !== 4) {
        return res.status(403).json({ error: "Только ученики могут отправлять ответы" });
    }

    try {
        const [assignment] = await db.query("SELECT * FROM assignments WHERE id = ?", [assignmentId]);
        if (assignment.length === 0) {
            return res.status(404).json({ error: "Задание не найдено" });
        }

        // Здесь должна быть логика проверки ответов
        // Для игровых заданий это уже обрабатывается в QuizGame.js
        // Для неигровых заданий можно добавить логику проверки answers

        res.json({ message: "Ответы отправлены" });
    } catch (err) {
        console.error("Ошибка отправки ответов:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получение заданий для ученика
router.get("/student-assignments", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        // Получаем информацию об ученике
        const [student] = await db.query(
            "SELECT grade, grade_letter FROM users WHERE id = ? AND role_id = 4",
            [userId]
        );
        if (student.length === 0) {
            return res.status(403).json({ error: "Только ученики могут просматривать задания" });
        }

        const { grade, grade_letter } = student[0];

        // Получаем задания для класса ученика
        const [assignments] = await db.query(
            `SELECT a.*, s.name AS subject
             FROM assignments a
             JOIN subjects s ON a.subject = s.id
             WHERE a.grade = ? AND a.grade_letter = ? AND a.is_game = 1`,
            [grade, grade_letter]
        );

        // Преобразуем JSON-поля
        const formattedAssignments = assignments.map((assignment) => ({
            ...assignment,
            game_tasks: assignment.game_tasks ? JSON.parse(assignment.game_tasks) : null,
        }));

        res.json({ data: formattedAssignments });
    } catch (err) {
        console.error("Ошибка получения заданий для ученика:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Сохранение результатов игры (для учеников)
router.post("/", verifyToken, async (req, res) => {
    const { assignment_id, score, time_spent } = req.body;

    // Проверка роли: только ученик может отправить результат
    if (req.user.role_id !== 4) {
        return res.status(403).json({ error: "Только ученики могут отправлять результаты" });
    }

    if (!assignment_id || score === undefined || !time_spent) {
        return res.status(400).json({ error: "Все поля обязательны!" });
    }

    try {
        await db.query(
            "INSERT INTO results (student_id, assignment_id, score, time_spent) VALUES (?, ?, ?, ?)",
            [req.user.id, assignment_id, score, time_spent]
        );

        res.json({ message: "Результат сохранён!" });
    } catch (err) {
        console.error("Ошибка сохранения результата:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

module.exports = router;