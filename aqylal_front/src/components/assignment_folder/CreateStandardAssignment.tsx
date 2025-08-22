import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createAssignment, getUserProfile } from "../../api";
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
  Grid,
  Card,
  CardContent,
  IconButton,
  Switch,
  FormControlLabel,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon, ArrowBack, Visibility as VisibilityIcon } from "@mui/icons-material";
import { motion } from "framer-motion";
import AssignmentPreview from "./AssignmentPreview";

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

// Интерфейсы для типизации
interface Task {
  id: string;
  title: string;
  question_type: string;
  options?: string[];
  correct_answer?: string | null;
  required: boolean;
}

interface FormData {
  title: string;
  description: string;
  type: string;
  subject: string;
  subjects: string[];
  grade: string;
  gradeLetter: string;
  dueDate: string;
  timeLimit: string;
  customTimeLimit: string;
}

interface UserProfile {
  role_id: number;
  subject: string[];
}

const CreateStandardAssignment = () => {
  const navigate = useNavigate();

  // Состояние формы
  const [formData, setFormData] = useState<FormData>({
    title: "Мое новое задание",
    description: "",
    type: "",
    subject: "",
    subjects: [],
    grade: "",
    gradeLetter: "",
    dueDate: "",
    timeLimit: "Без ограничения",
    customTimeLimit: "",
  });

  // Состояние задач и текущего индекса
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number | null>(null);

  // Состояния для UI
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [openPreview, setOpenPreview] = useState(false);

  // Загрузка данных профиля
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const user: UserProfile = await getUserProfile();
        if (user.role_id !== 3) {
          setError("Только учителя могут создавать задания.");
          setOpenSnackbar(true);
          setTimeout(() => navigate("/profile"), 2000);
          return;
        }
        if (Array.isArray(user.subject) && user.subject.length > 0) {
          setFormData((prev) => ({
            ...prev,
            subjects: user.subject,
            subject: user.subject[0] || "",
          }));
        } else {
          setError("У вас не указаны преподаваемые предметы.");
          setOpenSnackbar(true);
          setTimeout(() => navigate("/complete-teacher-profile"), 2000);
          return;
        }
        setIsDataLoaded(true);
      } catch (err: any) {
        setError(err.response?.data?.error || "Не удалось загрузить данные.");
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // Добавление новой задачи
  const addTask = (type: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: "",
      question_type: type,
      options: type === "multiple_choice" || type === "checkbox" ? [""] : [],
      correct_answer: type === "multiple_choice" || type === "checkbox" ? "" : null,
      required: false,
    };
    setTasks([...tasks, newTask]);
    setCurrentTaskIndex(tasks.length);
  };

  // Обновление задачи
  const updateTask = (field: keyof Task, value: any) => {
    if (currentTaskIndex === null) return;
    setTasks((prev) =>
      prev.map((task, index) =>
        index === currentTaskIndex ? { ...task, [field]: value } : task
      )
    );
  };

  // Добавление варианта ответа
  const addOption = () => {
    if (currentTaskIndex === null) return;
    setTasks((prev) =>
      prev.map((task, index) =>
        index === currentTaskIndex
          ? { ...task, options: [...(task.options || []), ""] }
          : task
      )
    );
  };

  // Обновление варианта ответа
  const updateOption = (optionIndex: number, value: string) => {
    if (currentTaskIndex === null) return;
    setTasks((prev) =>
      prev.map((task, index) =>
        index === currentTaskIndex
          ? {
              ...task,
              options: task.options!.map((opt, i) =>
                i === optionIndex ? value : opt
              ),
            }
          : task
      )
    );
  };

  // Удаление варианта ответа
  const deleteOption = (optionIndex: number) => {
    if (currentTaskIndex === null) return;
    setTasks((prev) =>
      prev.map((task, index) =>
        index === currentTaskIndex
          ? {
              ...task,
              options: task.options!.filter((_, i) => i !== optionIndex),
            }
          : task
      )
    );
  };

  // Удаление задачи
  const deleteTask = (index: number) => {
    if (window.confirm("Вы уверены, что хотите удалить этот вопрос?")) {
      const updatedTasks = tasks.filter((_, i) => i !== index);
      setTasks(updatedTasks);
      if (currentTaskIndex === index) {
        setCurrentTaskIndex(updatedTasks.length > 0 ? 0 : null);
      } else if (currentTaskIndex !== null && currentTaskIndex > index) {
        setCurrentTaskIndex(currentTaskIndex - 1);
      }
    }
  };

  // Переключение обязательности вопроса
  const toggleRequired = () => {
    if (currentTaskIndex === null) return;
    setTasks((prev) =>
      prev.map((task, index) =>
        index === currentTaskIndex
          ? { ...task, required: !task.required }
          : task
      )
    );
  };

  // Валидация формы
  const validateForm = (): string | null => {
    if (!formData.title.trim()) return "Название задания обязательно.";
    if (!formData.type) return "Тип задания обязателен.";
    if (!formData.subject) return "Предмет обязателен.";
    if (!formData.grade) return "Класс обязателен.";
    if (!formData.gradeLetter || !/^[А-ЯA-Z]$/.test(formData.gradeLetter))
      return "Литера класса должна быть одной заглавной буквой.";
    if (!formData.dueDate) return "Дата сдачи обязательна.";
    if (!formData.timeLimit) return "Лимит времени обязателен.";
    if (
      formData.timeLimit === "Другое" &&
      (!formData.customTimeLimit || Number(formData.customTimeLimit) <= 0)
    ) {
      return "Укажите корректное значение лимита времени (больше 0 минут).";
    }
    if (tasks.length === 0) return "Добавьте хотя бы один вопрос.";
    for (let i = 0; i < tasks.length; i++) {
      if (!tasks[i].title.trim()) {
        return `Вопрос ${i + 1}: Текст вопроса обязателен.`;
      }
      if (
        (tasks[i].question_type === "multiple_choice" ||
          tasks[i].question_type === "checkbox") &&
        tasks[i].options!.length < 2
      ) {
        return `Вопрос ${i + 1}: Добавьте минимум 2 варианта ответа.`;
      }
    }
    return null;
  };

  // Обработка отправки формы
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

    try {
      let formattedTimeLimit: string;
      if (formData.timeLimit === "Без ограничения") {
        formattedTimeLimit = "00:00:00";
      } else if (formData.timeLimit === "Другое") {
        const minutes = Number(formData.customTimeLimit);
        formattedTimeLimit = `00:${minutes.toString().padStart(2, "0")}:00`;
      } else {
        const minutes = Number(formData.timeLimit.split(" ")[0]);
        formattedTimeLimit = `00:${minutes.toString().padStart(2, "0")}:00`;
      }

      const assignmentData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        grade: Number(formData.grade),
        grade_letter: formData.gradeLetter,
        subject: formData.subject,
        due_date: formData.dueDate,
        time_limit: formattedTimeLimit,
        is_game: false,
        tasks: tasks.map((task) => ({
          title: task.title,
          question_type: task.question_type,
          options: task.options || [],
          correct_answer: task.correct_answer || null,
          required: task.required,
        })),
        game_tasks: null,
      };

      await createAssignment(assignmentData);
      setSuccess("Задание успешно создано!");
      setOpenSnackbar(true);
      setTimeout(() => navigate("/teacher-assignments"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Не удалось создать задание.");
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  // Обработчики изменений
  const handleGradeLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 1) {
      setFormData((prev) => ({ ...prev, gradeLetter: value }));
    }
  };

  const handleCustomTimeLimitChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setFormData((prev) => ({ ...prev, customTimeLimit: value }));
    }
  };

  // Обработчики предпросмотра
  const handleOpenPreview = () => {
    const formError = validateForm();
    if (formError) {
      setError(formError);
      setOpenSnackbar(true);
      return;
    }
    setOpenPreview(true);
  };

  const handleClosePreview = () => {
    setOpenPreview(false);
  };

  // Обработчик закрытия Snackbar
  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  // Рендеринг загрузки
  if (!isDataLoaded) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Боковая панель с вопросами */}
      <Box
        sx={{ width: 300, bgcolor: "#fff", borderRight: "1px solid #ddd", p: 2 }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Typography variant="h6" gutterBottom>
            Вопросы
          </Typography>
          {tasks.map((task, index) => (
            <motion.div key={task.id} variants={itemVariants}>
              <Card
                sx={{
                  mb: 1,
                  bgcolor: currentTaskIndex === index ? "#e0f7fa" : "#fff",
                  cursor: "pointer",
                  border: "1px solid #ddd",
                  borderRadius: 2,
                  "&:hover": {
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                  },
                }}
                onClick={() => setCurrentTaskIndex(index)}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography>
                    {index + 1}. {task.title || "Новый вопрос"}
                  </Typography>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(index);
                    }}
                    aria-label="Удалить вопрос"
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              mt: 2,
              bgcolor: "#6200ea",
              "&:hover": { bgcolor: "#3700b3" },
            }}
            onClick={() => addTask("text")}
            aria-label="Добавить новый вопрос"
          >
            Добавить вопрос
          </Button>
        </motion.div>
      </Box>

      {/* Основной контент */}
      <Container sx={{ flex: 1, p: 4 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Typography
              variant="h4"
              sx={{ fontWeight: "bold", color: "#202124" }}
            >
              Создание стандартного задания
            </Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={handleOpenPreview}
                sx={{
                  mr: 2,
                  bgcolor: "#6200ea",
                  "&:hover": { bgcolor: "#3700b3" },
                }}
                aria-label="Предпросмотр задания"
              >
                Предпросмотр
              </Button>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate("/teacher-assignments")}
                sx={{
                  borderColor: "#dadce0",
                  color: "#202124",
                  "&:hover": { borderColor: "#dadce0", bgcolor: "#f1f3f4" },
                }}
                aria-label="Вернуться назад"
              >
                Назад
              </Button>
            </Box>
          </Box>

          {/* Заголовок и описание задания */}
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                bgcolor: "#fff",
                p: 3,
                mb: 4,
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Название задания"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                sx={{
                  mb: 2,
                  "& .MuiInputBase-input": {
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "#202124",
                  },
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                }}
              />
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Описание задания"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                multiline
                rows={3}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                  "& .MuiInputBase-input": { color: "#5f6368" },
                }}
              />
            </Box>
          </motion.div>

          {/* Поля для типа задания, предмета, класса и т.д. */}
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
                mb: 4,
                bgcolor: "#fff",
                p: 3,
                borderRadius: 2,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <FormControl sx={{ width: 200 }}>
                <InputLabel>Тип задания</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, type: e.target.value }))
                  }
                  label="Тип задания"
                  required
                >
                  <MenuItem value="Формативное оценивание">
                    Формативное оценивание
                  </MenuItem>
                  <MenuItem value="Домашняя работа">Домашняя работа</MenuItem>
                  <MenuItem value="Рефлексия">Рефлексия</MenuItem>
                  <MenuItem value="СОР">СОР</MenuItem>
                  <MenuItem value="СОЧ">СОЧ</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ width: 200 }}>
                <InputLabel>Предмет</InputLabel>
                <Select
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  label="Предмет"
                  required
                >
                  {formData.subjects.map((subj) => (
                    <MenuItem key={subj} value={subj}>
                      {subj}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ width: 100 }}>
                <InputLabel>Класс</InputLabel>
                <Select
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, grade: e.target.value }))
                  }
                  label="Класс"
                  required
                >
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                    <MenuItem key={g} value={String(g)}>
                      {g}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Литера класса"
                value={formData.gradeLetter}
                onChange={handleGradeLetterChange}
                sx={{ width: 100 }}
                variant="outlined"
                required
                inputProps={{ maxLength: 1 }}
              />
              <TextField
                label="Дата сдачи"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                sx={{ width: 200 }}
                InputLabelProps={{ shrink: true }}
                required
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <FormControl sx={{ width: 200 }}>
                  <InputLabel>Лимит времени</InputLabel>
                  <Select
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeLimit: e.target.value,
                        customTimeLimit:
                          e.target.value === "Другое"
                            ? prev.customTimeLimit
                            : "",
                      }))
                    }
                    label="Лимит времени"
                    required
                  >
                    {[
                      "Без ограничения",
                      "5 минут",
                      "10 минут",
                      "20 минут",
                      "30 минут",
                      "40 минут",
                      "50 минут",
                      "60 минут",
                      "Другое",
                    ].map((opt) => (
                      <MenuItem key={opt} value={opt}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formData.timeLimit === "Другое" && (
                  <TextField
                    label="Минуты"
                    value={formData.customTimeLimit}
                    onChange={handleCustomTimeLimitChange}
                    sx={{ width: 100 }}
                    variant="outlined"
                    required
                    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                  />
                )}
              </Box>
            </Box>
          </motion.div>

          {/* Редактирование текущего вопроса */}
          {currentTaskIndex !== null && tasks[currentTaskIndex] && (
            <motion.div variants={itemVariants}>
              <Box
                sx={{
                  bgcolor: "#fff",
                  p: 4,
                  borderRadius: 2,
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Текст вопроса"
                      value={tasks[currentTaskIndex].title}
                      onChange={(e) => updateTask("title", e.target.value)}
                      sx={{
                        "& .MuiOutlinedInput-notchedOutline": { border: "none" },
                        "& .MuiInputBase-input": {
                          fontSize: "1.25rem",
                          color: "#202124",
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Тип вопроса</InputLabel>
                      <Select
                        value={tasks[currentTaskIndex].question_type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          updateTask("question_type", newType);
                          updateTask(
                            "options",
                            newType === "multiple_choice" || newType === "checkbox"
                              ? [""]
                              : []
                          );
                          updateTask(
                            "correct_answer",
                            newType === "multiple_choice" || newType === "checkbox"
                              ? ""
                              : null
                          );
                        }}
                      >
                        <MenuItem value="text">Текстовый ответ</MenuItem>
                        <MenuItem value="multiple_choice">
                          Выбор одного варианта
                        </MenuItem>
                        <MenuItem value="checkbox">
                          Выбор нескольких вариантов
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {(tasks[currentTaskIndex].question_type === "multiple_choice" ||
                    tasks[currentTaskIndex].question_type === "checkbox") && (
                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle1"
                        sx={{ mb: 1, color: "#5f6368" }}
                      >
                        Варианты ответа:
                      </Typography>
                      {tasks[currentTaskIndex].options!.map(
                        (option: string, index: number) => (
                          <Box
                            key={index}
                            sx={{ display: "flex", alignItems: "center", mb: 1 }}
                          >
                            <TextField
                              fullWidth
                              variant="outlined"
                              placeholder={`Вариант ${index + 1}`}
                              value={option}
                              onChange={(e) =>
                                updateOption(index, e.target.value)
                              }
                              sx={{
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none",
                                },
                                "& .MuiInputBase-input": { color: "#202124" },
                              }}
                            />
                            <IconButton
                              onClick={() => deleteOption(index)}
                              aria-label="Удалить вариант"
                            >
                              <DeleteIcon sx={{ color: "#5f6368" }} />
                            </IconButton>
                          </Box>
                        )
                      )}
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={addOption}
                        sx={{
                          mt: 1,
                          borderColor: "#dadce0",
                          color: "#202124",
                          "&:hover": {
                            borderColor: "#dadce0",
                            bgcolor: "#f1f3f4",
                          },
                        }}
                        aria-label="Добавить вариант ответа"
                      >
                        Добавить вариант
                      </Button>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={tasks[currentTaskIndex].required}
                          onChange={toggleRequired}
                          color="primary"
                        />
                      }
                      label="Обязательный вопрос"
                      sx={{ color: "#5f6368" }}
                    />
                  </Grid>
                </Grid>
              </Box>
            </motion.div>
          )}

          {/* Кнопки сохранения и отмены */}
          <motion.div variants={itemVariants}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{
                  mr: 2,
                  bgcolor: "#6200ea",
                  "&:hover": { bgcolor: "#3700b3" },
                }}
                aria-label="Сохранить задание"
              >
                {loading ? <CircularProgress size={24} /> : "Сохранить"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate("/teacher-assignments")}
                disabled={loading}
                sx={{
                  borderColor: "#dadce0",
                  color: "#202124",
                  "&:hover": { borderColor: "#dadce0", bgcolor: "#f1f3f4" },
                }}
                aria-label="Отменить создание задания"
              >
                Отмена
              </Button>
            </Box>
          </motion.div>
        </motion.div>

        {/* Компонент предпросмотра */}
        <AssignmentPreview
          open={openPreview}
          onClose={handleClosePreview}
          title={formData.title}
          description={formData.description}
          type={formData.type}
          subject={formData.subject}
          grade={formData.grade}
          gradeLetter={formData.gradeLetter}
          dueDate={formData.dueDate}
          timeLimit={formData.timeLimit}
          customTimeLimit={formData.customTimeLimit}
          tasks={tasks}
          game_tasks={null}
          isGame={false}
        />

        {/* Уведомления */}
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

export default CreateStandardAssignment;