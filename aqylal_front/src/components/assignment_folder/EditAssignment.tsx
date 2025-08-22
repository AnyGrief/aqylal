import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DndContext, closestCenter, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { v4 as uuidv4 } from "uuid";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { Add as AddIcon, FileCopy as FileCopyIcon, ArrowBack, Visibility as VisibilityIcon } from "@mui/icons-material";
import { motion } from "framer-motion";
import { getAssignmentById, getUserProfile, updateAssignment } from "../../api";
import { useAssignmentForm } from "../hooks/useAssignmentForm";
import SortableQuestion from "./SortableQuestion";
import QuestionEditor from "./QuestionEditor";
import AssignmentPreview from "./AssignmentPreview";
import { AssignmentFormData, Question, MatchingPair, formatTimeLimit, validateForm, validateQuestions } from "../utils/assignmentUtils";

// Extend AssignmentFormData to include description
interface ExtendedAssignmentFormData extends Omit<AssignmentFormData, "questions"> {
  description?: string;
}

// Extend Question interface to include required for standard assignments
interface ExtendedQuestion extends Question {
  required?: boolean;
}

// Animations
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

const EditAssignment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    questions,
    currentQuestionId,
    loading,
    error,
    success,
    openSnackbar,
    isDataLoaded,
    setQuestions,
    setCurrentQuestionId,
    setError,
    setSuccess,
    addQuestion,
    copyPreviousQuestion,
    updateQuestion,
    updateOption,
    addOption,
    removeOption,
    toggleCorrectAnswer,
    deleteQuestion,
    addMatchingPair,
    updateMatchingPair,
    removeMatchingPair,
    handleImageUpload,
    handleCloseSnackbar,
  } = useAssignmentForm();

  const [openPreview, setOpenPreview] = useState(false);
  const [isGame, setIsGame] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [localIsDataLoaded, setLocalIsDataLoaded] = useState(false);
  const [formData, setFormData] = useState<ExtendedAssignmentFormData>({
    title: "",
    type: "",
    subject: "",
    subjects: [],
    grade: "",
    gradeLetter: "",
    dueDate: "",
    timeLimit: "Без ограничения",
    customTimeLimit: "",
    description: "",
  });

  // Load assignment data
  useEffect(() => {
    if (!id || localIsDataLoaded) return;
    const fetchData = async () => {
      if (!id) return;
      try {
        setLocalLoading(true);
        const user = await getUserProfile();
        if (user.role_id !== 3) {
          setError("Доступ только для учителей.");
          handleCloseSnackbar();
          setTimeout(() => navigate("/profile"), 2000);
          return;
        }
  
        const assignment = await getAssignmentById(id);
        setIsGame(assignment.is_game);
        const formattedFormData: ExtendedAssignmentFormData = {
          title: assignment.title,
          description: assignment.description || "",
          type: assignment.type,
          subject: assignment.subject,
          subjects: user.subject || [],
          grade: String(assignment.grade),
          gradeLetter: assignment.grade_letter,
          dueDate: assignment.due_date.split("T")[0],
          timeLimit: assignment.time_limit === "00:00:00" ? "Без ограничения" : assignment.time_limit.split(":")[1] + " минут",
          customTimeLimit: assignment.time_limit === "00:00:00" ? "" : assignment.time_limit.split(":")[1],
        };
  
        const formattedQuestions: ExtendedQuestion[] = (assignment.is_game ? assignment.game_tasks : assignment.tasks || []).map((task: any) => ({
          id: task.id || uuidv4(),
          question: task.question || task.title || "",
          question_type: task.question_type || (assignment.is_game ? "quiz" : "true_false"),
          options: task.options || [],
          correct_answers: task.correct_answers || task.correct_answer || null,
          timer: task.timer || 20,
          points: task.points || 1000,
          image: task.image || null,
          correct_position: task.correct_position || null,
          option_colors: task.option_colors || undefined,
          required: !assignment.is_game && task.required !== undefined ? task.required : false,
        }));
  
        setFormData(formattedFormData);
        setQuestions(formattedQuestions);
        setCurrentQuestionId(formattedQuestions[0]?.id || null);
        setLocalIsDataLoaded(true);
      } catch (err: any) {
        setError(err.response?.data?.error || "Не удалось загрузить данные.");
        handleCloseSnackbar();
      } finally {
        setLocalLoading(false);
      }
    };
    fetchData();
  }, [id, navigate, setQuestions, setCurrentQuestionId, setError, setSuccess, handleCloseSnackbar]);

  // Handle drag-and-drop for questions
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = questions.findIndex((q) => q.id === active.id);
        const newIndex = questions.findIndex((q) => q.id === over.id);
        setQuestions(arrayMove(questions, oldIndex, newIndex));
        if (currentQuestionId === active.id) setCurrentQuestionId(over.id as string);
      }
    },
    [questions, currentQuestionId, setQuestions, setCurrentQuestionId]
  );

  // Handle drag-and-drop for matching pairs
  const handleMatchingDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== currentQuestionId || q.question_type !== "matching") return q;
            const pairs = q.options as MatchingPair[];
            const oldIndex = pairs.findIndex((p) => p.id === active.id);
            const newIndex = pairs.findIndex((p) => p.id === over.id);
            return { ...q, options: arrayMove(pairs, oldIndex, newIndex) };
          })
        );
      }
    },
    [currentQuestionId, setQuestions]
  );

  // Save assignment
  const handleSubmit = useCallback(async () => {
    setLocalLoading(true);
    setError(null);
    setSuccess(null);

    const formError = validateForm({ ...formData, questions });
    if (formError) {
      setError(formError);
      handleCloseSnackbar();
      setLocalLoading(false);
      return;
    }

    const questionError = validateQuestions(questions);
    if (questionError) {
      setError(questionError);
      handleCloseSnackbar();
      setLocalLoading(false);
      return;
    }

    try {
      const assignmentData = {
        title: formData.title,
        description: isGame ? "Интерактивное задание" : formData.description || "",
        type: formData.type,
        grade: +formData.grade,
        grade_letter: formData.gradeLetter,
        subject: formData.subject,
        due_date: formData.dueDate,
        time_limit: formatTimeLimit(formData.timeLimit, formData.customTimeLimit),
        is_game: isGame,
        tasks: isGame
          ? null
          : questions.map((q) => ({
              title: q.question,
              question_type: q.question_type,
              options: q.options || [],
              correct_answer: q.correct_answers || null,
            })),
        game_tasks: isGame
          ? questions.map((q) => ({
              question: q.question,
              question_type: q.question_type,
              options: q.options || [],
              correct_answers: q.correct_answers || null,
              timer: q.timer || 20,
              points: q.points || 1000,
              image: q.image || null,
              correct_position: q.correct_position || null,
              option_colors: q.option_colors || null,
            }))
          : null,
      };

      await updateAssignment(id!, assignmentData);
      setSuccess("Задание успешно обновлено!");
      handleCloseSnackbar();
      setTimeout(() => navigate("/teacher-assignments"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || "Не удалось обновить задание.");
      handleCloseSnackbar();
    } finally {
      setLocalLoading(false);
    }
  }, [id, formData, questions, isGame, navigate, setError, setSuccess, handleCloseSnackbar]);

  // Preview
  const handleOpenPreview = () => {
    const formError = validateForm({ ...formData, questions });
    if (formError) {
      setError(formError);
      handleCloseSnackbar();
      return;
    }
    setOpenPreview(true);
  };

  const handleClosePreview = () => setOpenPreview(false);

  if (!localIsDataLoaded) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentQuestion = questions.find((q) => q.id === currentQuestionId);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Sidebar with questions */}
      <Box sx={{ width: 300, bgcolor: "#fff", borderRight: "1px solid #ddd", p: 2 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Typography variant="h6" gutterBottom>Вопросы</Typography>
          <DndContext sensors={[{ sensor: PointerSensor, options: { activationConstraint: { delay: 50, tolerance: 5 } } }]} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
              {questions.map((q, index) => (
                <SortableQuestion
                  key={q.id}
                  question={q}
                  id={q.id}
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
              onClick={() => addQuestion(isGame ? "quiz" : "true_false")}
            >
              Добавить
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileCopyIcon />}
              sx={{ flex: 1 }}
              onClick={copyPreviousQuestion}
              disabled={!questions.length}
            >
              Копировать
            </Button>
          </Box>
        </motion.div>
      </Box>

      {/* Main content */}
      <Container sx={{ flex: 1, p: 4 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
              Редактирование {isGame ? "интерактивного" : "стандартного"} задания
            </Typography>
            <Box>
              <Button variant="contained" startIcon={<VisibilityIcon />} onClick={handleOpenPreview} sx={{ mr: 2 }}>
                Предпросмотр
              </Button>
              <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate("/teacher-assignments")}>
                Назад
              </Button>
            </Box>
          </Box>

          <motion.div variants={itemVariants}>
            <Box sx={{ bgcolor: "#fff", p: 3, mb: 4, borderRadius: 2, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Название задания"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                sx={{ mb: 2, "& .MuiInputBase-input": { fontSize: "1.5rem", fontWeight: "bold", color: "#202124" } }}
              />
              {!isGame && (
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Описание задания"
                  value={formData.description || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  multiline
                  rows={3}
                  sx={{ "& .MuiInputBase-input": { color: "#5f6368" } }}
                />
              )}
            </Box>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4, bgcolor: "#fff", p: 3, borderRadius: 2, boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)" }}>
              <FormControl sx={{ width: 200 }}>
                <InputLabel>Тип задания</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
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
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  label="Предмет"
                  required
                >
                  {formData.subjects.map((subj) => (
                    <MenuItem key={subj} value={subj}>{subj}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl sx={{ width: 100 }}>
                <InputLabel>Класс</InputLabel>
                <Select
                  value={formData.grade}
                  onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
                  label="Класс"
                  required
                >
                  {Array.from({ length: 11 }, (_, i) => i + 1).map((g) => (
                    <MenuItem key={g} value={String(g)}>{g}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Литера класса"
                value={formData.gradeLetter}
                onChange={(e) => setFormData((prev) => ({ ...prev, gradeLetter: e.target.value.toUpperCase().slice(0, 1) }))}
                sx={{ width: 100 }}
                variant="outlined"
                required
              />
              <TextField
                label="Дата сдачи"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
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
                        customTimeLimit: e.target.value === "Другое" ? prev.customTimeLimit : "",
                      }))
                    }
                    label="Лимит времени"
                    required
                  >
                    {["Без ограничения", "5 минут", "10 минут", "20 минут", "30 минут", "40 минут", "50 минут", "60 минут", "Другое"].map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {formData.timeLimit === "Другое" && (
                  <TextField
                    label="Минуты"
                    value={formData.customTimeLimit}
                    onChange={(e) => /^\d*$/.test(e.target.value) && setFormData((prev) => ({ ...prev, customTimeLimit: e.target.value }))}
                    sx={{ width: 100 }}
                    variant="outlined"
                    required
                  />
                )}
              </Box>
            </Box>
          </motion.div>

          {currentQuestion && (
            <motion.div variants={itemVariants}>
              <QuestionEditor
                currentQuestion={currentQuestion as ExtendedQuestion}
                updateQuestion={updateQuestion}
                updateOption={updateOption}
                addOption={addOption}
                removeOption={removeOption}
                toggleCorrectAnswer={toggleCorrectAnswer}
                addMatchingPair={addMatchingPair}
                updateMatchingPair={updateMatchingPair}
                removeMatchingPair={removeMatchingPair}
                handleMatchingDragEnd={handleMatchingDragEnd}
                handleImageUpload={handleImageUpload}
              />
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
              <Button variant="contained" onClick={handleSubmit} disabled={localLoading} sx={{ mr: 2 }}>
                {localLoading ? <CircularProgress size={24} /> : "Сохранить"}
              </Button>
              <Button variant="outlined" onClick={() => navigate("/teacher-assignments")} disabled={localLoading}>
                Отмена
              </Button>
            </Box>
          </motion.div>
        </motion.div>

        <AssignmentPreview
          open={openPreview}
          onClose={handleClosePreview}
          title={formData.title}
          description={isGame ? "" : formData.description || ""}
          type={formData.type}
          subject={formData.subject}
          grade={formData.grade}
          gradeLetter={formData.gradeLetter}
          dueDate={formData.dueDate}
          timeLimit={formData.timeLimit}
          customTimeLimit={formData.customTimeLimit}
          tasks={isGame ? [] : questions}
          game_tasks={isGame ? questions : []}
          isGame={isGame}
        />

        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity={success ? "success" : "error"}>{success || error}</Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default EditAssignment;