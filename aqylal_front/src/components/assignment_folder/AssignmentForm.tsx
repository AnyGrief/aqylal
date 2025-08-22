import React, { useCallback, useRef, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import SortableQuestion from "./SortableQuestion";
import { DndContext, closestCenter, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { Add as AddIcon, FileCopy as FileCopyIcon, ArrowBack, Visibility as VisibilityIcon } from "@mui/icons-material";
import { motion } from "framer-motion";
import { AssignmentFormData, Question } from "../utils/assignmentUtils";

// Константы для анимации
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.2 } },
};

const questionVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// Опции для времени
const TIME_LIMIT_OPTIONS = [
  "Без ограничения",
  "5 минут",
  "10 минут",
  "20 минут",
  "30 минут",
  "40 минут",
  "50 минут",
  "60 минут",
  "Другое",
];

// Опции для типа задания
const ASSIGNMENT_TYPES = [
  "Формативное оценивание",
  "Домашняя работа",
  "Рефлексия",
  "СОР",
  "СОЧ",
];

// Интерфейс пропсов
interface AssignmentFormProps {
  formData: AssignmentFormData;
  questions: Question[];
  currentQuestionId: string | null;
  loading: boolean;
  showDraftDialog: boolean;
  isGame?: boolean;
  titleText?: string;
  setFormData: React.Dispatch<React.SetStateAction<AssignmentFormData>>;
  setQuestions: (questions: Question[] | ((prev: Question[]) => Question[])) => void;
  setCurrentQuestionId: React.Dispatch<React.SetStateAction<string | null>>;
  addQuestion: (type: "quiz" | "true_false" | "pin_answer" | "matching") => void;
  copyPreviousQuestion: () => void;
  deleteQuestion: (id: string) => void;
  handleSubmit: () => void;
  handleOpenPreview: () => void;
  restoreDraft: () => void;
  deleteDraft: () => void;
  closeDraftDialog: () => void;
  questionEditor?: React.ReactNode;
}

// Компонент формы для создания задания
const AssignmentForm: React.FC<AssignmentFormProps> = ({
  formData,
  questions,
  currentQuestionId,
  loading,
  showDraftDialog,
  isGame = true,
  titleText = isGame ? "Создание интерактивного задания" : "Создание стандартного задания",
  setFormData,
  setQuestions,
  setCurrentQuestionId,
  addQuestion,
  copyPreviousQuestion,
  deleteQuestion,
  handleSubmit,
  handleOpenPreview,
  restoreDraft,
  deleteDraft,
  closeDraftDialog,
  questionEditor,
}) => {
  const navigate = useNavigate();
  const questionListRef = useRef<HTMLDivElement>(null);

  // Логирование для отладки
  useEffect(() => {
    console.log("AssignmentForm: showDraftDialog =", showDraftDialog, "rendering dialog =", showDraftDialog);
  }, [showDraftDialog]);

  // Обработка перетаскивания вопросов
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = questions.findIndex((q) => q.id === active.id);
        const newIndex = questions.findIndex((q) => q.id === over.id);
        setQuestions((prev) => arrayMove(prev, oldIndex, newIndex));
        if (currentQuestionId === active.id) setCurrentQuestionId(over.id as string);
      }
    },
    [questions, currentQuestionId, setQuestions, setCurrentQuestionId]
  );

  // Обработка отмены
  const handleCancel = useCallback(() => {
    if (window.confirm("Вы уверены, что хотите отменить? Все несохраненные изменения будут потеряны.")) {
      navigate("/teacher-assignments");
    }
  }, [navigate]);

  // Прокрутка к новому вопросу в левой панели
  useEffect(() => {
    if (questions.length > 0 && currentQuestionId === questions[0].id && questionListRef.current) {
      questionListRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [questions, currentQuestionId]);

  // Рендеринг полей формы
  const renderFormFields = () => (
    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 4 }}>
      <TextField
        label="Название задания"
        value={formData.title}
        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
        sx={{ width: 400 }}
        variant="outlined"
        required
        multiline
        minRows={1}
        maxRows={3}
      />
      {!isGame && (
        <TextField
          label="Описание задания"
          value={formData.description || ""}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          sx={{ width: 400 }}
          variant="outlined"
          multiline
          rows={3}
        />
      )}
      <FormControl sx={{ width: 200 }}>
        <InputLabel>Тип задания</InputLabel>
        <Select
          value={formData.type}
          onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
          label="Тип задания"
          required
        >
          {ASSIGNMENT_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
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
          onChange={(e) => setFormData((prev) => ({ ...prev, grade: e.target.value }))}
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
            {TIME_LIMIT_OPTIONS.map((opt) => (
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
            onChange={(e) =>
              /^\d*$/.test(e.target.value) && setFormData((prev) => ({ ...prev, customTimeLimit: e.target.value }))
            }
            sx={{ width: 100 }}
            variant="outlined"
            required
          />
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      {/* Диалог для черновика */}
      <Dialog open={showDraftDialog} onClose={closeDraftDialog}>
        <DialogTitle>Обнаружен черновик</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Найден сохранённый черновик задания. Хотите восстановить его или удалить?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={restoreDraft} color="primary" variant="contained">
            Восстановить
          </Button>
          <Button onClick={deleteDraft} color="error" variant="outlined">
            Удалить
          </Button>
          <Button onClick={closeDraftDialog} color="inherit">
            Отмена
          </Button>
        </DialogActions>
      </Dialog>

      {/* Левая панель с вопросами */}
      <Box sx={{ width: 300, bgcolor: "#fff", borderRight: "1px solid #ddd", p: 2, overflowY: "auto" }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <Typography variant="h6" gutterBottom>
            Вопросы
          </Typography>
          {/* Кнопки "Добавить" и "Копировать" наверху */}
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ bgcolor: "primary.main", flex: 1 }}
              onClick={() => addQuestion(isGame ? "quiz" : "pin_answer")}
              component={motion.button}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={showDraftDialog}
            >
              Добавить
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileCopyIcon />}
              sx={{ flex: 1 }}
              onClick={copyPreviousQuestion}
              disabled={!questions.length || !currentQuestionId || showDraftDialog}
            >
              Копировать
            </Button>
          </Box>
          <Box ref={questionListRef}>
            <DndContext
              sensors={[{ sensor: PointerSensor, options: { activationConstraint: { delay: 50, tolerance: 5 } } }]}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {questions.map((q, index) => (
                  <motion.div key={q.id} variants={questionVariants} initial="hidden" animate="visible">
                    <SortableQuestion
                      question={q}
                      id={q.id}
                      index={index}
                      currentQuestionId={currentQuestionId}
                      setCurrentQuestionId={setCurrentQuestionId}
                      deleteQuestion={deleteQuestion}
                    />
                  </motion.div>
                ))}
              </SortableContext>
            </DndContext>
          </Box>
        </motion.div>
      </Box>

      {/* Центральная область */}
      <Container sx={{ flex: 1, p: 4 }}>
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Заголовок и кнопки управления */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
              {titleText}
            </Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<VisibilityIcon />}
                onClick={handleOpenPreview}
                sx={{ mr: 2 }}
                disabled={showDraftDialog}
              >
                Предпросмотр
              </Button>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleCancel}
                disabled={loading || showDraftDialog}
              >
                Назад
              </Button>
            </Box>
          </Box>

          {/* Поля формы */}
          {renderFormFields()}

          {/* Кнопки действия */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || showDraftDialog}
              sx={{ mr: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "Создать"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={loading || showDraftDialog}
            >
              Отмена
            </Button>
          </Box>

          {/* Редактор вопроса */}
          {questionEditor}
        </motion.div>
      </Container>
    </Box>
  );
};

export default memo(AssignmentForm);