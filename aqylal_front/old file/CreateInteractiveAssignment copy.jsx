import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, createAssignment, uploadImage } from "../src/api";
import {
    Container,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Grid2,
    Card,
    CardContent,
    IconButton,
    Switch,
    FormControlLabel,
    CircularProgress,
    Snackbar,
    Alert,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack, FileCopy as FileCopyIcon, DragIndicator as DragIndicatorIcon, Visibility as VisibilityIcon } from "@mui/icons-material";
import { motion } from "framer-motion";
import { DndContext, closestCenter, PointerSensor } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { v4 as uuidv4 } from "uuid";
import AssignmentPreview from "../src/components/assignment_folder/AssignmentPreview";

// Анимации для элементов
const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            staggerChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// Компонент для перетаскиваемого вопроса
const SortableQuestion = ({ question, id, index, currentQuestionId, setCurrentQuestionId, deleteQuestion }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <motion.div ref={setNodeRef} style={style} variants={itemVariants}>
            <Card
                sx={{
                    mb: 1,
                    bgcolor: currentQuestionId === id ? "primary.light" : "#fff",
                    transition: "all 0.3s ease",
                    "&:hover": {
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    },
                }}
                onClick={() => setCurrentQuestionId(id)}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => e.key === "Enter" && setCurrentQuestionId(id)}
            >
                <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <IconButton {...listeners} {...attributes} sx={{ cursor: "grab" }}>
                            <DragIndicatorIcon />
                        </IconButton>
                        <Typography>
                            {index + 1}. {question.question || "Новый вопрос"}
                        </Typography>
                    </Box>
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteQuestion(id);
                        }}
                        aria-label="Удалить вопрос"
                    >
                        <DeleteIcon />
                    </IconButton>
                </CardContent>
            </Card>
        </motion.div>
    );
};

// Компонент для перетаскиваемой пары в "Сопоставлении"
const SortableMatchingPair = ({ pair, index, updateMatchingPair, removeMatchingPair, questionId }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: pair.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Box ref={setNodeRef} style={style} sx={{ display: "flex", gap: 2, mb: 1, alignItems: "center" }}>
            <IconButton {...listeners} {...attributes} sx={{ cursor: "grab" }}>
                <DragIndicatorIcon />
            </IconButton>
            <TextField
                label="Левая часть"
                value={pair.left}
                onChange={(e) => updateMatchingPair(index, "left", e.target.value)}
                variant="outlined"
                sx={{ flex: 1 }}
            />
            <TextField
                label="Правая часть"
                value={pair.right}
                onChange={(e) => updateMatchingPair(index, "right", e.target.value)}
                variant="outlined"
                sx={{ flex: 1 }}
            />
            <FormControlLabel
                control={
                    <Switch
                        checked={pair.correct || false}
                        onChange={(e) => updateMatchingPair(index, "correct", e.target.checked)}
                    />
                }
                label="Правильная пара"
            />
            <IconButton onClick={() => removeMatchingPair(index)} aria-label="Удалить пару">
                <DeleteIcon />
            </IconButton>
        </Box>
    );
};

const CreateInteractiveAssignment1 = () => {
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [type, setType] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [subject, setSubject] = useState("");
    const [grade, setGrade] = useState("");
    const [gradeLetter, setGradeLetter] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [timeLimit, setTimeLimit] = useState("Без ограничения");
    const [customTimeLimit, setCustomTimeLimit] = useState("");
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [openPreview, setOpenPreview] = useState(false);

    const [questions, setQuestions] = useState([]);
    const [currentQuestionId, setCurrentQuestionId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const user = await getUserProfile();
                if (user.role_id !== 3) {
                    setError("Только учителя могут создавать задания.");
                    setOpenSnackbar(true);
                    setTimeout(() => navigate("/teacher-assignments"), 2000);
                    setIsDataLoaded(true);
                    return;
                }
                if (Array.isArray(user.subject) && user.subject.length > 0) {
                    setSubjects(user.subject);
                    setSubject(user.subject[0] || "");
                } else {
                    setError("У вас не указаны преподаваемые предметы.");
                    setOpenSnackbar(true);
                    setTimeout(() => navigate("/complete-teacher-profile"), 2000);
                    setIsDataLoaded(true);
                    return;
                }
                setIsDataLoaded(true);
            } catch (err) {
                console.error("Ошибка загрузки данных:", err);
                setError(err.message || "Не удалось загрузить данные.");
                setOpenSnackbar(true);
                setIsDataLoaded(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const addQuestion = (type) => {
        const newQuestion = {
            id: uuidv4(),
            question: "",
            question_type: type,
            options: type === "quiz" ? ["", "", "", ""] : type === "true_false" ? ["Верно", "Неверно"] : type === "matching" ? [] : [],
            correct_answers: type === "quiz" ? [] : type === "true_false" ? "" : type === "matching" ? [] : undefined,
            correct_answer: type === "fill_in" || type === "slider" ? "" : undefined,
            timer: 20,
            points: 1000,
            min: type === "slider" ? 0 : undefined,
            max: type === "slider" ? 100 : undefined,
            image: type === "pin_answer" || type === "puzzle" ? null : undefined,
            correct_position: type === "pin_answer" ? { x: 0, y: 0 } : undefined,
            pieces: type === "puzzle" ? 4 : undefined,
            sub_questions: type === "puzzle" ? [] : undefined,
        };
        setQuestions([...questions, newQuestion]);
        setCurrentQuestionId(newQuestion.id);
    };

    const copyPreviousQuestion = () => {
        if (questions.length === 0) {
            setError("Нет вопросов для копирования.");
            setOpenSnackbar(true);
            return;
        }
        const previousQuestion = questions[questions.length - 1];
        const newQuestion = { ...previousQuestion, id: uuidv4() };
        setQuestions([...questions, newQuestion]);
        setCurrentQuestionId(newQuestion.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = questions.findIndex((q) => q.id === active.id);
            const newIndex = questions.findIndex((q) => q.id === over.id);
            const updatedQuestions = arrayMove(questions, oldIndex, newIndex);
            setQuestions(updatedQuestions);
            if (currentQuestionId === active.id) {
                setCurrentQuestionId(over.id);
            }
        }
    };

    const handleMatchingDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const updatedQuestions = [...questions];
            const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
            const pairs = updatedQuestions[currentQuestionIndex].options;
            const oldIndex = pairs.findIndex((pair) => pair.id === active.id);
            const newIndex = pairs.findIndex((pair) => pair.id === over.id);
            updatedQuestions[currentQuestionIndex].options = arrayMove(pairs, oldIndex, newIndex);
            setQuestions(updatedQuestions);
        }
    };

    const addMatchingPair = () => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        updatedQuestions[currentQuestionIndex].options.push({ id: uuidv4(), left: "", right: "", correct: false });
        setQuestions(updatedQuestions);
    };

    const updateMatchingPair = (index, field, value) => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        updatedQuestions[currentQuestionIndex].options[index][field] = value;
        setQuestions(updatedQuestions);
    };

    const removeMatchingPair = (index) => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        updatedQuestions[currentQuestionIndex].options = updatedQuestions[currentQuestionIndex].options.filter((_, i) => i !== index);
        setQuestions(updatedQuestions);
    };

    const updateQuestion = (field, value) => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        updatedQuestions[currentQuestionIndex] = {
            ...updatedQuestions[currentQuestionIndex],
            [field]: value,
        };
        setQuestions(updatedQuestions);
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            setError("Файл слишком большой. Максимальный размер: 5MB.");
            setOpenSnackbar(true);
            return;
        }

        setLoading(true);
        try {
            const response = await uploadImage(file);
            if (response.url) {
                updateQuestion("image", response.url);
            } else {
                setError("Не удалось загрузить изображение.");
                setOpenSnackbar(true);
            }
        } catch (err) {
            setError("Ошибка загрузки изображения.");
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };

    const updateOption = (index, value) => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        updatedQuestions[currentQuestionIndex].options[index] = value;
        setQuestions(updatedQuestions);
    };

    const addOption = () => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        updatedQuestions[currentQuestionIndex].options.push("");
        setQuestions(updatedQuestions);
    };

    const removeOption = (index) => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        const currentQuestion = updatedQuestions[currentQuestionIndex];
        if (currentQuestion.options.length <= 2) {
            setError("Вопрос должен содержать минимум 2 варианта ответа.");
            setOpenSnackbar(true);
            return;
        }
        updatedQuestions[currentQuestionIndex].options = currentQuestion.options.filter((_, i) => i !== index);
        if (currentQuestion.question_type === "quiz") {
            updatedQuestions[currentQuestionIndex].correct_answers = currentQuestion.correct_answers.filter(
                (answer) => answer !== currentQuestion.options[index]
            );
        } else if (currentQuestion.question_type === "true_false" && currentQuestion.correct_answers === currentQuestion.options[index]) {
            updatedQuestions[currentQuestionIndex].correct_answers = "";
        }
        setQuestions(updatedQuestions);
    };

    const toggleCorrectAnswer = (index) => {
        const updatedQuestions = [...questions];
        const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
        const current = updatedQuestions[currentQuestionIndex];
        if (current.question_type === "quiz") {
            const correctAnswers = [...current.correct_answers];
            const answerIndex = correctAnswers.indexOf(current.options[index]);
            if (answerIndex > -1) {
                correctAnswers.splice(answerIndex, 1);
            } else {
                correctAnswers.push(current.options[index]);
            }
            current.correct_answers = correctAnswers;
        } else if (current.question_type === "true_false") {
            current.correct_answers = current.options[index];
        }
        setQuestions(updatedQuestions);
    };

    const deleteQuestion = (id) => {
        if (window.confirm("Вы уверены, что хотите удалить этот вопрос?")) {
            const updatedQuestions = questions.filter((q) => q.id !== id);
            setQuestions(updatedQuestions);
            if (currentQuestionId === id) {
                setCurrentQuestionId(updatedQuestions.length > 0 ? updatedQuestions[0].id : null);
            }
        }
    };

    const validateQuestions = () => {
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question) {
                return `Вопрос ${i + 1}: Текст вопроса обязателен.`;
            }
            if (q.question_type === "quiz") {
                if (q.options.length < 2) {
                    return `Вопрос ${i + 1}: Вопрос типа 'Викторина' должен иметь минимум 2 варианта ответа.`;
                }
                if (q.correct_answers.length === 0) {
                    return `Вопрос ${i + 1}: Каждый вопрос типа 'Викторина' должен иметь хотя бы один правильный ответ.`;
                }
            }
            if (q.question_type === "true_false") {
                if (!q.correct_answers) {
                    return `Вопрос ${i + 1}: Для вопроса типа 'Истина/Ложь' должен быть указан правильный ответ.`;
                }
                if (!q.options.includes(q.correct_answers)) {
                    return `Вопрос ${i + 1}: Правильный ответ должен быть одним из вариантов ('Верно' или 'Неверно').`;
                }
            }
            if (q.question_type === "fill_in" && !q.correct_answer) {
                return `Вопрос ${i + 1}: Каждый вопрос типа 'Введите ответ' должен иметь правильный ответ.`;
            }
            if (q.question_type === "slider") {
                if (q.min >= q.max) {
                    return `Вопрос ${i + 1}: Минимальное значение слайдера должно быть меньше максимального.`;
                }
                if (q.correct_answer < q.min || q.correct_answer > q.max) {
                    return `Вопрос ${i + 1}: Правильный ответ слайдера должен быть в пределах минимального и максимального значений.`;
                }
            }
            if (q.question_type === "pin_answer") {
                if (!q.image) {
                    return `Вопрос ${i + 1}: Изображение обязательно для типа 'Закрепите ответ'.`;
                }
                if (!q.correct_position || typeof q.correct_position.x !== "number" || typeof q.correct_position.y !== "number") {
                    return `Вопрос ${i + 1}: Координаты правильного ответа обязательны.`;
                }
            }
            if (q.question_type === "puzzle") {
                if (!q.image) {
                    return `Вопрос ${i + 1}: Изображение обязательно для головоломки.`;
                }
                if (typeof q.pieces !== "number" || q.pieces < 1) {
                    return `Вопрос ${i + 1}: Количество частей пазла должно быть больше 0.`;
                }
            }
            if (q.question_type === "matching") {
                if (!Array.isArray(q.options) || q.options.length < 2) {
                    return `Вопрос ${i + 1}: Для сопоставления требуется минимум 2 пары.`;
                }
                for (let j = 0; j < q.options.length; j++) {
                    const pair = q.options[j];
                    if (!pair.left || !pair.right) {
                        return `Вопрос ${i + 1}: Пара ${j + 1} должна иметь обе части (левая и правая).`;
                    }
                    if (pair.correct) {
                        // Проверяем, что пара помечена как правильная
                        if (!q.correct_answers) q.correct_answers = [];
                        if (!q.correct_answers.some((correctPair) => correctPair.left === pair.left && correctPair.right === pair.right)) {
                            q.correct_answers.push({ left: pair.left, right: pair.right });
                        }
                    }
                }
                if (!q.correct_answers || q.correct_answers.length === 0) {
                    return `Вопрос ${i + 1}: Для сопоставления нужно указать хотя бы одну правильную пару.`;
                }
            }
        }
        return null;
    };

    const validateForm = () => {
        if (!title) return "Название задания обязательно.";
        if (!type) return "Тип задания обязателен.";
        if (!subject) return "Предмет обязателен.";
        if (!grade) return "Класс обязателен.";
        if (!gradeLetter) return "Литера класса обязательна.";
        if (!/^[А-ЯA-Z]$/.test(gradeLetter)) return "Литера класса должна быть одной заглавной буквой.";
        if (!dueDate) return "Дата сдачи обязательна.";
        if (!timeLimit) return "Лимит времени обязателен.";
        if (timeLimit === "Другое" && (!customTimeLimit || customTimeLimit <= 0)) {
            return "Укажите корректное значение лимита времени (больше 0 минут).";
        }
        if (questions.length === 0) {
            return "Добавьте хотя бы один вопрос для интерактивного задания.";
        }
        return null;
    };

    const handleCustomTimeLimitChange = (e) => {
        const value = e.target.value;
        if (/^\d*$/.test(value)) {
            setCustomTimeLimit(value);
        }
    };

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);
        setLoading(true);
        setOpenSnackbar(false);

        const formError = validateForm();
        if (formError) {
            setError(formError);
            setOpenSnackbar(true);
            setLoading(false);
            return;
        }

        const validationError = validateQuestions();
        if (validationError) {
            setError(validationError);
            setOpenSnackbar(true);
            setLoading(false);
            return;
        }

        try {
            let formattedTimeLimit;
            if (timeLimit === "Без ограничения") {
                formattedTimeLimit = "00:00:00";
            } else if (timeLimit === "Другое") {
                const minutes = parseInt(customTimeLimit, 10);
                formattedTimeLimit = `00:${minutes.toString().padStart(2, "0")}:00`;
            } else {
                const minutes = parseInt(timeLimit.split(" ")[0], 10);
                formattedTimeLimit = `00:${minutes.toString().padStart(2, "0")}:00`;
            }

            const assignmentData = {
                title,
                description: "Интерактивное задание",
                type,
                grade: Number(grade),
                grade_letter: gradeLetter,
                subject,
                due_date: dueDate,
                time_limit: formattedTimeLimit,
                is_game: true,
                tasks: null,
                game_tasks: questions.map((q) => ({
                    ...q,
                    id: undefined,
                    correct_answers: q.question_type === "true_false" ? (q.correct_answers || null) : (Array.isArray(q.correct_answers) ? q.correct_answers : q.correct_answers ? [q.correct_answers] : []),
                    correct_answer: q.correct_answer || null,
                    min: q.min ?? null,
                    max: q.max ?? null,
                    image: q.image ?? null,
                    correct_position: q.correct_position ?? null,
                    pieces: q.pieces ?? null,
                    sub_questions: q.sub_questions ?? null,
                })),
            };
            await createAssignment(assignmentData);
            setSuccess("Задание успешно создано!");
            setOpenSnackbar(true);
            setTimeout(() => navigate("/teacher-assignments"), 1500);
        } catch (err) {
            setError(err.response?.data?.error || "Не удалось создать задание.");
            setOpenSnackbar(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    const handleGradeLetterChange = (e) => {
        const value = e.target.value.toUpperCase();
        if (value.length <= 1) {
            setGradeLetter(value);
        }
    };

    const handleOpenPreview = () => {
        const formError = validateForm();
        if (formError) {
            setError(formError);
            setOpenSnackbar(true);
            return;
        }
        const validationError = validateQuestions();
        if (validationError) {
            setError(validationError);
            setOpenSnackbar(true);
            return;
        }
        setOpenPreview(true);
    };

    const handleClosePreview = () => {
        setOpenPreview(false);
    };

    if (!isDataLoaded) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
            {/* Боковая панель с вопросами */}
            <Box sx={{ width: 300, bgcolor: "#fff", borderRight: "1px solid #ddd", p: 2 }}>
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <Typography variant="h6" gutterBottom>
                        Вопросы
                    </Typography>
                    <DndContext
                        sensors={[{ sensor: PointerSensor, options: { activationConstraint: { delay: 200, tolerance: 5 } } }]}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                            {questions.map((question, index) => (
                                <SortableQuestion
                                    key={question.id}
                                    question={question}
                                    id={question.id}
                                    index={index}
                                    currentQuestionId={currentQuestionId}
                                    setCurrentQuestionId={setCurrentQuestionId}
                                    deleteQuestion={deleteQuestion}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            sx={{ bgcolor: "primary.main", flex: 1 }}
                            onClick={() => addQuestion("quiz")}
                            aria-label="Добавить новый вопрос"
                        >
                            Добавить
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<FileCopyIcon />}
                            sx={{ flex: 1 }}
                            onClick={copyPreviousQuestion}
                            disabled={questions.length === 0}
                            aria-label="Копировать предыдущий вопрос"
                        >
                            Копировать
                        </Button>
                    </Box>
                </motion.div>
            </Box>

            {/* Основной контент */}
            <Container sx={{ flex: 1, p: 4 }}>
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                        <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
                            Создание интерактивного задания
                        </Typography>
                        <Box>
                            <Button
                                variant="contained"
                                startIcon={<VisibilityIcon />}
                                onClick={handleOpenPreview}
                                sx={{ mr: 2 }}
                                aria-label="Предпросмотр задания"
                            >
                                Предпросмотр
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBack />}
                                onClick={() => navigate("/teacher-assignments")}
                                aria-label="Вернуться назад"
                            >
                                Назад
                            </Button>
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
                        <TextField
                            label="Название задания"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            sx={{ width: 300 }}
                            variant="outlined"
                            required
                        />
                        <FormControl sx={{ width: 200 }}>
                            <InputLabel>Тип задания</InputLabel>
                            <Select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                label="Тип задания"
                                required
                            >
                                <MenuItem value="Формативное оценивание">Формативное оценивание</MenuItem>
                                <MenuItem value="Домашняя работа">Домашняя работа</MenuItem>
                                <MenuItem value="Рефлексия">Рефлексия</MenuItem>
                                <MenuItem value="СОР">СОР</MenuItem>
                                <MenuItem value="СОЧ">СОЧ</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl sx={{ width: 200 }}>
                            <InputLabel>Предмет</InputLabel>
                            <Select
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                label="Предмет"
                                required
                            >
                                {subjects.map((subj, index) => (
                                    <MenuItem key={index} value={subj}>
                                        {subj}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl sx={{ width: 100 }}>
                            <InputLabel>Класс</InputLabel>
                            <Select
                                value={grade}
                                onChange={(e) => setGrade(e.target.value)}
                                label="Класс"
                                required
                            >
                                {[...Array(11)].map((_, i) => (
                                    <MenuItem key={i + 1} value={(i + 1).toString()}>{i + 1}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Литера класса"
                            value={gradeLetter}
                            onChange={handleGradeLetterChange}
                            sx={{ width: 100 }}
                            variant="outlined"
                            required
                            inputProps={{ maxLength: 1 }}
                        />
                        <TextField
                            label="Дата сдачи"
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            sx={{ width: 200 }}
                            InputLabelProps={{ shrink: true }}
                            required
                        />
                        <Box sx={{ display: "flex", gap: 2 }}>
                            <FormControl sx={{ width: 200 }}>
                                <InputLabel>Лимит времени</InputLabel>
                                <Select
                                    value={timeLimit}
                                    onChange={(e) => {
                                        setTimeLimit(e.target.value);
                                        if (e.target.value !== "Другое") {
                                            setCustomTimeLimit("");
                                        }
                                    }}
                                    label="Лимит времени"
                                    required
                                >
                                    <MenuItem value="Без ограничения">Без ограничения</MenuItem>
                                    <MenuItem value="5 минут">5 минут</MenuItem>
                                    <MenuItem value="10 минут">10 минут</MenuItem>
                                    <MenuItem value="20 минут">20 минут</MenuItem>
                                    <MenuItem value="30 минут">30 минут</MenuItem>
                                    <MenuItem value="40 минут">40 минут</MenuItem>
                                    <MenuItem value="50 минут">50 минут</MenuItem>
                                    <MenuItem value="60 минут">60 минут</MenuItem>
                                    <MenuItem value="Другое">Другое</MenuItem>
                                </Select>
                            </FormControl>
                            {timeLimit === "Другое" && (
                                <TextField
                                    label="Минуты"
                                    value={customTimeLimit}
                                    onChange={handleCustomTimeLimitChange}
                                    sx={{ width: 100 }}
                                    variant="outlined"
                                    required
                                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                                />
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSubmit}
                            disabled={loading}
                            sx={{ mr: 2 }}
                            aria-label="Создать задание"
                        >
                            {loading ? <CircularProgress size={24} /> : "Создать"}
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => navigate("/teacher-assignments")}
                            disabled={loading}
                            aria-label="Отменить создание задания"
                        >
                            Отмена
                        </Button>
                    </Box>

                    {currentQuestionId !== null && questions.find((q) => q.id === currentQuestionId) && (
                        <motion.div variants={itemVariants}>
                            <Box sx={{ bgcolor: "#fff", p: 4, borderRadius: 2, boxShadow: 1 }}>
                                <Grid2 container spacing={2}>
                                    <Grid2 item xs={12}>
                                        <TextField
                                            label="Вопрос"
                                            fullWidth
                                            value={questions.find((q) => q.id === currentQuestionId)?.question || ""}
                                            onChange={(e) => updateQuestion("question", e.target.value)}
                                            variant="outlined"
                                            required
                                        />
                                    </Grid2>
                                    <Grid2 item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Тип вопроса</InputLabel>
                                            <Select
                                                value={questions.find((q) => q.id === currentQuestionId)?.question_type || ""}
                                                onChange={(e) => {
                                                    const newType = e.target.value;
                                                    const updatedQuestions = [...questions];
                                                    const currentQuestionIndex = questions.findIndex((q) => q.id === currentQuestionId);
                                                    updatedQuestions[currentQuestionIndex] = {
                                                        ...updatedQuestions[currentQuestionIndex],
                                                        question_type: newType,
                                                        options: newType === "quiz" ? ["", "", "", ""] : newType === "true_false" ? ["Верно", "Неверно"] : newType === "matching" ? [] : [],
                                                        correct_answers: newType === "quiz" ? [] : newType === "true_false" ? "" : newType === "matching" ? [] : undefined,
                                                        correct_answer: newType === "fill_in" || newType === "slider" ? "" : undefined,
                                                        min: newType === "slider" ? 0 : undefined,
                                                        max: newType === "slider" ? 100 : undefined,
                                                        image: newType === "pin_answer" || newType === "puzzle" ? null : undefined,
                                                        correct_position: newType === "pin_answer" ? { x: 0, y: 0 } : undefined,
                                                        pieces: newType === "puzzle" ? 4 : undefined,
                                                        sub_questions: newType === "puzzle" ? [] : undefined,
                                                    };
                                                    setQuestions(updatedQuestions);
                                                }}
                                            >
                                                <MenuItem value="quiz">Викторина</MenuItem>
                                                <MenuItem value="true_false">Истина/Ложь</MenuItem>
                                                <MenuItem value="fill_in">Введите ответ</MenuItem>
                                                <MenuItem value="slider">Слайдер</MenuItem>
                                                <MenuItem value="pin_answer">Закрепите ответ</MenuItem>
                                                <MenuItem value="puzzle">Головоломка</MenuItem>
                                                <MenuItem value="matching">Сопоставление</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid2>
                                    <Grid2 item xs={6} sm={3}>
                                        <FormControl fullWidth>
                                            <InputLabel>Таймер (сек)</InputLabel>
                                            <Select
                                                value={questions.find((q) => q.id === currentQuestionId)?.timer || 20}
                                                onChange={(e) => updateQuestion("timer", e.target.value)}
                                            >
                                                <MenuItem value={5}>5</MenuItem>
                                                <MenuItem value={10}>10</MenuItem>
                                                <MenuItem value={20}>20</MenuItem>
                                                <MenuItem value={30}>30</MenuItem>
                                                <MenuItem value={60}>60</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid2>
                                    <Grid2 item xs={6} sm={3}>
                                        <FormControl fullWidth>
                                            <InputLabel>Баллы</InputLabel>
                                            <Select
                                                value={questions.find((q) => q.id === currentQuestionId)?.points || 1000}
                                                onChange={(e) => updateQuestion("points", e.target.value)}
                                            >
                                                <MenuItem value={500}>500</MenuItem>
                                                <MenuItem value={1000}>1000</MenuItem>
                                                <MenuItem value={1500}>1500</MenuItem>
                                                <MenuItem value={2000}>2000</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid2>

                                    {(questions.find((q) => q.id === currentQuestionId)?.question_type === "quiz" ||
                                        questions.find((q) => q.id === currentQuestionId)?.question_type === "true_false") && (
                                        <Grid2 item xs={12}>
                                            <Grid2 container spacing={2}>
                                                {questions.find((q) => q.id === currentQuestionId)?.options.map((option, index) => (
                                                    <Grid2 item xs={12} sm={6} key={index}>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                bgcolor:
                                                                    index === 0 ? "#3f51b5" :
                                                                    index === 1 ? "#f44336" :
                                                                    index === 2 ? "#ffeb3b" :
                                                                    "#4caf50",
                                                                p: 2,
                                                                borderRadius: 2,
                                                                color: "#fff",
                                                            }}
                                                        >
                                                            <TextField
                                                                fullWidth
                                                                value={option}
                                                                onChange={(e) => updateOption(index, e.target.value)}
                                                                sx={{ bgcolor: "#fff", borderRadius: 1 }}
                                                                variant="outlined"
                                                            />
                                                            <FormControlLabel
                                                                control={
                                                                    <Switch
                                                                        checked={
                                                                            questions.find((q) => q.id === currentQuestionId)?.question_type === "quiz"
                                                                                ? questions.find((q) => q.id === currentQuestionId)?.correct_answers.includes(option)
                                                                                : questions.find((q) => q.id === currentQuestionId)?.correct_answers === option
                                                                        }
                                                                        onChange={() => toggleCorrectAnswer(index)}
                                                                    />
                                                                }
                                                                label="Правильный"
                                                            />
                                                            <IconButton
                                                                onClick={() => removeOption(index)}
                                                                aria-label="Удалить вариант ответа"
                                                                sx={{ color: "#fff" }}
                                                            >
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Box>
                                                    </Grid2>
                                                ))}
                                            </Grid2>
                                            <Button
                                                variant="outlined"
                                                startIcon={<AddIcon />}
                                                onClick={addOption}
                                                sx={{ mt: 2 }}
                                                aria-label="Добавить вариант ответа"
                                            >
                                                Добавить вариант
                                            </Button>
                                        </Grid2>
                                    )}

                                    {questions.find((q) => q.id === currentQuestionId)?.question_type === "fill_in" && (
                                        <Grid2 item xs={12}>
                                            <TextField
                                                label="Правильный ответ"
                                                fullWidth
                                                value={questions.find((q) => q.id === currentQuestionId)?.correct_answer || ""}
                                                onChange={(e) => updateQuestion("correct_answer", e.target.value)}
                                                variant="outlined"
                                            />
                                        </Grid2>
                                    )}

                                    {questions.find((q) => q.id === currentQuestionId)?.question_type === "slider" && (
                                        <>
                                            <Grid2 item xs={12} sm={4}>
                                                <TextField
                                                    label="Минимальное значение"
                                                    type="number"
                                                    fullWidth
                                                    value={questions.find((q) => q.id === currentQuestionId)?.min || 0}
                                                    onChange={(e) => updateQuestion("min", Number(e.target.value))}
                                                    variant="outlined"
                                                />
                                            </Grid2>
                                            <Grid2 item xs={12} sm={4}>
                                                <TextField
                                                    label="Максимальное значение"
                                                    type="number"
                                                    fullWidth
                                                    value={questions.find((q) => q.id === currentQuestionId)?.max || 100}
                                                    onChange={(e) => updateQuestion("max", Number(e.target.value))}
                                                    variant="outlined"
                                                />
                                            </Grid2>
                                            <Grid2 item xs={12} sm={4}>
                                                <TextField
                                                    label="Правильный ответ"
                                                    type="number"
                                                    fullWidth
                                                    value={questions.find((q) => q.id === currentQuestionId)?.correct_answer || ""}
                                                    onChange={(e) => updateQuestion("correct_answer", Number(e.target.value))}
                                                    variant="outlined"
                                                />
                                            </Grid2>
                                        </>
                                    )}

                                    {questions.find((q) => q.id === currentQuestionId)?.question_type === "pin_answer" && (
                                        <>
                                            <Grid2 item xs={12}>
                                                <Button variant="contained" component="label" disabled={loading}>
                                                    {loading ? <CircularProgress size={24} /> : "Загрузить изображение"}
                                                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                                </Button>
                                                {questions.find((q) => q.id === currentQuestionId)?.image && (
                                                    <Typography sx={{ mt: 1 }}>
                                                        Загружено: {questions.find((q) => q.id === currentQuestionId)?.image}
                                                    </Typography>
                                                )}
                                            </Grid2>
                                            <Grid2 item xs={12} sm={6}>
                                                <TextField
                                                    label="Координата X правильного ответа"
                                                    type="number"
                                                    fullWidth
                                                    value={questions.find((q) => q.id === currentQuestionId)?.correct_position?.x || 0}
                                                    onChange={(e) =>
                                                        updateQuestion("correct_position", {
                                                            ...questions.find((q) => q.id === currentQuestionId)?.correct_position,
                                                            x: Number(e.target.value),
                                                        })
                                                    }
                                                    variant="outlined"
                                                />
                                            </Grid2>
                                            <Grid2 item xs={12} sm={6}>
                                                <TextField
                                                    label="Координата Y правильного ответа"
                                                    type="number"
                                                    fullWidth
                                                    value={questions.find((q) => q.id === currentQuestionId)?.correct_position?.y || 0}
                                                    onChange={(e) =>
                                                        updateQuestion("correct_position", {
                                                            ...questions.find((q) => q.id === currentQuestionId)?.correct_position,
                                                            y: Number(e.target.value),
                                                        })
                                                    }
                                                    variant="outlined"
                                                />
                                            </Grid2>
                                        </>
                                    )}

                                    {questions.find((q) => q.id === currentQuestionId)?.question_type === "puzzle" && (
                                        <>
                                            <Grid2 item xs={12}>
                                                <Button variant="contained" component="label" disabled={loading}>
                                                    {loading ? <CircularProgress size={24} /> : "Загрузить изображение"}
                                                    <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
                                                </Button>
                                                {questions.find((q) => q.id === currentQuestionId)?.image && (
                                                    <Typography sx={{ mt: 1 }}>
                                                        Загружено: {questions.find((q) => q.id === currentQuestionId)?.image}
                                                    </Typography>
                                                )}
                                            </Grid2>
                                            <Grid2 item xs={12}>
                                                <TextField
                                                    label="Количество частей пазла"
                                                    type="number"
                                                    fullWidth
                                                    value={questions.find((q) => q.id === currentQuestionId)?.pieces || 4}
                                                    onChange={(e) => updateQuestion("pieces", Number(e.target.value))}
                                                    variant="outlined"
                                                />
                                            </Grid2>
                                        </>
                                    )}

                                    {questions.find((q) => q.id === currentQuestionId)?.question_type === "matching" && (
                                        <Grid2 item xs={12}>
                                            <Typography variant="subtitle1">Пары для сопоставления:</Typography>
                                            <DndContext
                                                sensors={[{ sensor: PointerSensor, options: { activationConstraint: { delay: 200, tolerance: 5 } } }]}
                                                collisionDetection={closestCenter}
                                                onDragEnd={handleMatchingDragEnd}
                                            >
                                                <SortableContext
                                                    items={questions.find((q) => q.id === currentQuestionId)?.options.map((pair) => pair.id) || []}
                                                    strategy={verticalListSortingStrategy}
                                                >
                                                    {questions.find((q) => q.id === currentQuestionId)?.options.map((pair, index) => (
                                                        <SortableMatchingPair
                                                            key={pair.id}
                                                            pair={pair}
                                                            index={index}
                                                            updateMatchingPair={updateMatchingPair}
                                                            removeMatchingPair={removeMatchingPair}
                                                            questionId={currentQuestionId}
                                                        />
                                                    ))}
                                                </SortableContext>
                                            </DndContext>
                                            <Button
                                                variant="outlined"
                                                startIcon={<AddIcon />}
                                                onClick={addMatchingPair}
                                                aria-label="Добавить пару для сопоставления"
                                            >
                                                Добавить пару
                                            </Button>
                                        </Grid2>
                                    )}
                                </Grid2>
                            </Box>
                        </motion.div>
                    )}
                </motion.div>

                <AssignmentPreview
                    open={openPreview}
                    onClose={handleClosePreview}
                    title={title}
                    type={type}
                    subject={subject}
                    grade={grade}
                    gradeLetter={gradeLetter}
                    dueDate={dueDate}
                    timeLimit={timeLimit}
                    customTimeLimit={customTimeLimit}
                    questions={questions}
                />

                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={success ? "success" : "error"}
                        sx={{ width: "100%" }}
                    >
                        {success || error}
                    </Alert>
                </Snackbar>
            </Container>
        </Box>
    );
};

export default CreateInteractiveAssignment1;