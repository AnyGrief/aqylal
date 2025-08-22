import React, { useState, useEffect, useCallback, useMemo, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, getAssignments, createAssignment, deleteAssignment } from "../../api";
import {
    Container,
    Typography,
    Button,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    CircularProgress,
    Box,
    Snackbar,
    Alert,
    Tooltip,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Pagination,
    InputAdornment,
    Paper,
} from "@mui/material";
import { Edit as EditIcon, FileCopy as FileCopyIcon, Delete as DeleteIcon, Search as SearchIcon, Refresh as RefreshIcon } from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import debounce from "lodash/debounce";

// Начальное состояние фильтров
const initialFilterState = {
    searchQuery: "",
    selectedSubject: "",
    selectedGrade: "",
    selectedAssignmentType: "",
    selectedCategory: "",
    sortBy: "due_date",
    sortOrder: "desc",
    page: 1,
};

// Редьюсер для фильтров
const filterReducer = (state, action) => {
    switch (action.type) {
        case "SET_SEARCH_QUERY":
            return { ...state, searchQuery: action.payload, page: 1 };
        case "SET_SUBJECT":
            return { ...state, selectedSubject: action.payload, page: 1 };
        case "SET_GRADE":
            return { ...state, selectedGrade: action.payload, page: 1 };
        case "SET_ASSIGNMENT_TYPE":
            return { ...state, selectedAssignmentType: action.payload, page: 1 };
        case "SET_CATEGORY":
            return { ...state, selectedCategory: action.payload, page: 1 };
        case "SET_SORT":
            return { ...state, sortBy: action.sortBy, sortOrder: action.sortOrder, page: 1 };
        case "SET_PAGE":
            return { ...state, page: action.payload };
        case "RESET":
            return initialFilterState;
        default:
            return state;
    }
};

// Основной компонент
const TeacherAssignment = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [totalPages, setTotalPages] = useState(1);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
    const [filters, dispatch] = useReducer(filterReducer, initialFilterState);
    const { searchQuery, selectedSubject, selectedGrade, selectedAssignmentType, selectedCategory, sortBy, sortOrder, page } = filters;

    const limit = 10;

    // Форматирование даты
    const formatDueDate = useCallback((dateString) => {
        try {
            return format(parseISO(dateString), "dd.MM.yyyy", { locale: ru });
        } catch {
            return "Некорректная дата";
        }
    }, []);

    // Мемоизация отформатированных заданий
    const formattedAssignments = useMemo(() => {
        return Array.isArray(assignments) ? assignments.map((a) => ({
            ...a,
            formattedDueDate: formatDueDate(a.due_date),
        })) : [];
    }, [assignments, formatDueDate]);

    // Функция загрузки заданий
    const fetchAssignments = useCallback(async (signal) => {
        setLoading(true);
        try {
            const user = await getUserProfile();
            if (user.role_id !== 3) throw new Error("Только учителя могут просматривать задания.");
            if (!Array.isArray(user.subject) || !user.subject.length) throw new Error("У вас не указаны предметы.");

            setSubjects(user.subject);
            const params = {
                page,
                limit,
                sortBy,
                sortOrder,
                search: searchQuery || undefined,
                subject: selectedSubject || undefined,
                grade: selectedGrade || undefined,
                is_game: selectedAssignmentType === "Классическое" ? false : selectedAssignmentType === "Интерактивное" ? true : undefined,
                type: selectedCategory || undefined,
            };
            const response = await getAssignments(params, { signal });
            setAssignments(Array.isArray(response.data) ? response.data : []);
            setTotalPages(Number.isInteger(response.totalPages) ? response.totalPages : 1);
        } catch (err) {
            if (err.name === "AbortError") return;
            setSnackbar({ open: true, message: err.message || "Ошибка загрузки заданий.", severity: "error" });
            setAssignments([]);
            setTotalPages(1);
            if (err.message.includes("предметы")) navigate("/complete-teacher-profile");
            else if (err.message.includes("учителя")) navigate("/");
        } finally {
            setLoading(false);
        }
    }, [navigate, page, sortBy, sortOrder, searchQuery, selectedSubject, selectedGrade, selectedAssignmentType, selectedCategory]);

    // Debounced функция для поиска
    const debouncedFetchAssignments = useMemo(
        () => debounce((signal) => fetchAssignments(signal), 500),
        [fetchAssignments]
    );

    // Вызов загрузки заданий
    useEffect(() => {
        const controller = new AbortController();
        debouncedFetchAssignments(controller.signal);
        return () => {
            controller.abort();
            debouncedFetchAssignments.cancel(); // Очищаем debounce при размонтировании
        };
    }, [debouncedFetchAssignments]);

    // Копирование задания
    const handleCopyAssignment = useCallback(async (assignment) => {
        setActionLoading(true);
        try {
            // Форматируем due_date в YYYY-MM-DD
            const formatDueDateForServer = (date) => {
                if (!date) return new Date().toISOString().split("T")[0]; // Значение по умолчанию
                return date.includes("T") ? date.split("T")[0] : date; // Убираем время и зону
            };
    
            const assignmentCopy = {
                title: `${assignment.title} (Копия)`,
                description: assignment.description || "",
                type: assignment.type || "Домашняя работа",
                grade: Number(assignment.grade) || 1,
                grade_letter: assignment.grade_letter || "А",
                subject: assignment.subject || "Не указан",
                due_date: formatDueDateForServer(assignment.due_date), // Форматируем дату
                time_limit: assignment.time_limit || "00:00:00",
                is_game: assignment.is_game || false,
                tasks: assignment.tasks
                    ? typeof assignment.tasks === "string"
                        ? JSON.parse(assignment.tasks)
                        : assignment.tasks
                    : null,
                game_tasks: assignment.game_tasks
                    ? typeof assignment.game_tasks === "string"
                        ? JSON.parse(assignment.game_tasks)
                        : assignment.game_tasks
                    : assignment.is_game
                    ? []
                    : null,
            };
    
            await createAssignment(assignmentCopy);
            setSnackbar({ open: true, message: "Задание скопировано!", severity: "success" });
            fetchAssignments(new AbortController().signal);
        } catch (err) {
            console.error("Ошибка копирования задания:", err);
            const errorMessage = err.response?.data?.errors
                ? err.response.data.errors.map((e) => e.msg).join(", ")
                : err.response?.data?.error || err.message;
            setSnackbar({ open: true, message: `Ошибка копирования: ${errorMessage}`, severity: "error" });
        } finally {
            setActionLoading(false);
        }
    }, [fetchAssignments]);

    // Удаление задания
    const handleDeleteAssignment = useCallback(async (assignmentId) => {
        if (!window.confirm("Удалить задание?")) return;
        setActionLoading(true);
        try {
            await deleteAssignment(assignmentId);
            setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
            setSnackbar({ open: true, message: "Задание удалено!", severity: "success" });
        } catch {
            setSnackbar({ open: true, message: "Ошибка удаления.", severity: "error" });
        } finally {
            setActionLoading(false);
        }
    }, []);

    // Обработчики фильтров
    const handleSearchChange = (e) => {
        dispatch({ type: "SET_SEARCH_QUERY", payload: e.target.value });
    };

    const handleFilterChange = (type) => (e) => dispatch({ type, payload: e.target.value });
    const handleSortChange = (e) => {
        const [sortBy, sortOrder] = e.target.value.split(":");
        dispatch({ type: "SET_SORT", sortBy, sortOrder });
    };
    const handlePageChange = (e, value) => dispatch({ type: "SET_PAGE", payload: value });
    const handleResetFilters = () => dispatch({ type: "RESET" });
    const handleCloseSnackbar = () => setSnackbar((prev) => ({ ...prev, open: false }));

    return (
        <Container maxWidth="lg" sx={{ mt: 5, mb: 5, bgcolor: "#f5f7fa", borderRadius: 3, p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#1a237e", borderBottom: "2px solid #e0e0e0", pb: 1 }}>
                Мои задания
            </Typography>

            <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: "#ffffff", borderRadius: 2 }}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
                    <TextField
                        label="Поиск"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        variant="outlined"
                        size="small"
                        sx={{ width: 250, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <SearchIcon sx={{ color: "#666" }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <FormControl sx={{ width: 200 }} size="small">
                        <InputLabel>Предмет</InputLabel>
                        <Select value={selectedSubject} onChange={handleFilterChange("SET_SUBJECT")} label="Предмет" sx={{ borderRadius: "8px" }}>
                            <MenuItem value="">Все предметы</MenuItem>
                            {subjects.map((subject, index) => (
                                <MenuItem key={index} value={subject}>{subject}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl sx={{ width: 150 }} size="small">
                        <InputLabel>Класс</InputLabel>
                        <Select value={selectedGrade} onChange={handleFilterChange("SET_GRADE")} label="Класс" sx={{ borderRadius: "8px" }}>
                            <MenuItem value="">Все классы</MenuItem>
                            {[...Array(11)].map((_, i) => (
                                <MenuItem key={i + 1} value={String(i + 1)}>{i + 1}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl sx={{ width: 200 }} size="small">
                        <InputLabel>Тип задания</InputLabel>
                        <Select value={selectedAssignmentType} onChange={handleFilterChange("SET_ASSIGNMENT_TYPE")} label="Тип задания" sx={{ borderRadius: "8px" }}>
                            <MenuItem value="">Все типы</MenuItem>
                            <MenuItem value="Классическое">Классическое</MenuItem>
                            <MenuItem value="Интерактивное">Интерактивное</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ width: 200 }} size="small">
                        <InputLabel>Категория</InputLabel>
                        <Select value={selectedCategory} onChange={handleFilterChange("SET_CATEGORY")} label="Категория" sx={{ borderRadius: "8px" }}>
                            <MenuItem value="">Все категории</MenuItem>
                            <MenuItem value="Формативное оценивание">Формативное оценивание</MenuItem>
                            <MenuItem value="Домашняя работа">Домашняя работа</MenuItem>
                            <MenuItem value="Рефлексия">Рефлексия</MenuItem>
                            <MenuItem value="СОР">СОР</MenuItem>
                            <MenuItem value="СОЧ">СОЧ</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ width: 200 }} size="small">
                        <InputLabel>Сортировать</InputLabel>
                        <Select value={`${sortBy}:${sortOrder}`} onChange={handleSortChange} label="Сортировать" sx={{ borderRadius: "8px" }}>
                            <MenuItem value="due_date:desc">Дате сдачи (убыв.)</MenuItem>
                            <MenuItem value="due_date:asc">Дате сдачи (возр.)</MenuItem>
                            <MenuItem value="subject:asc">Предмету (А-Я)</MenuItem>
                            <MenuItem value="subject:desc">Предмету (Я-А)</MenuItem>
                            <MenuItem value="grade:asc">Классу (возр.)</MenuItem>
                            <MenuItem value="grade:desc">Классу (убыв.)</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined"
                        onClick={handleResetFilters}
                        startIcon={<RefreshIcon />}
                        sx={{ height: "40px", borderColor: "#3f51b5", color: "#3f51b5", borderRadius: "8px" }}
                        disabled={loading || actionLoading}
                    >
                        Сбросить
                    </Button>
                </Box>
            </Paper>

            <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between" }}>
                <Button
                    variant="contained"
                    onClick={() => navigate("/create-assignment")}
                    disabled={loading || actionLoading}
                    sx={{ bgcolor: "#3f51b5", borderRadius: "8px", "&:hover": { bgcolor: "#303f9f" } }}
                >
                    Создать задание
                </Button>
                {snackbar.severity === "error" && (
                    <Button
                        variant="outlined"
                        onClick={() => fetchAssignments(new AbortController().signal)}
                        disabled={loading || actionLoading}
                        startIcon={<RefreshIcon />}
                        sx={{ borderColor: "#3f51b5", color: "#3f51b5", borderRadius: "8px" }}
                    >
                        Повторить
                    </Button>
                )}
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <CircularProgress sx={{ color: "#3f51b5" }} />
                </Box>
            ) : formattedAssignments.length ? (
                <>
                    <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
                        <List sx={{ p: 0 }}>
                            {formattedAssignments.map((assignment, index) => (
                                <ListItem
                                    key={assignment.id}
                                    sx={{
                                        py: 2,
                                        px: 3,
                                        borderBottom: index < formattedAssignments.length - 1 ? "1px solid #e0e0e0" : "none",
                                        "&:hover": { bgcolor: "#f9fafb" },
                                    }}
                                >
                                    <ListItemText
                                        primary={<Typography variant="h6" sx={{ color: "#1a237e" }}>{assignment.title}</Typography>}
                                        secondary={
                                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                                                <Typography variant="body2" sx={{ color: "#666" }}><strong>Тип:</strong> {assignment.type}</Typography>
                                                <Typography variant="body2" sx={{ color: "#666" }}><strong>Предмет:</strong> {assignment.subject}</Typography>
                                                <Typography variant="body2" sx={{ color: "#666" }}><strong>Класс:</strong> {assignment.grade}{assignment.grade_letter}</Typography>
                                                <Typography variant="body2" sx={{ color: "#666" }}><strong>Срок:</strong> {assignment.formattedDueDate}</Typography>
                                                <Typography variant="body2" sx={{ color: "#666" }}><strong>Формат:</strong> {assignment.is_game ? "Интерактивное" : "Классическое"}</Typography>
                                            </Box>
                                        }
                                        secondaryTypographyProps={{ component: "div" }}
                                    />
                                    <ListItemSecondaryAction>
                                        <Tooltip title="Редактировать">
                                            <IconButton onClick={() => navigate(`/edit-assignment/${assignment.id}`)} disabled={actionLoading} sx={{ color: "#3f51b5" }}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Копировать">
                                            <IconButton onClick={() => handleCopyAssignment(assignment)} disabled={actionLoading} sx={{ color: "#2e7d32" }}>
                                                {actionLoading ? <CircularProgress size={24} /> : <FileCopyIcon />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Удалить">
                                            <IconButton onClick={() => handleDeleteAssignment(assignment.id)} disabled={actionLoading} sx={{ color: "#d32f2f" }}>
                                                {actionLoading ? <CircularProgress size={24} /> : <DeleteIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                    {totalPages > 1 && (
                        <Pagination
                            count={totalPages}
                            page={page}
                            onChange={handlePageChange}
                            sx={{ mt: 3, display: "flex", justifyContent: "center" }}
                            color="primary"
                        />
                    )}
                </>
            ) : (
                <Typography sx={{ mt: 2, color: "#666", textAlign: "center" }}>
                    {snackbar.severity === "error" ? snackbar.message : "У вас пока нет заданий."}
                </Typography>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
};

export default TeacherAssignment;