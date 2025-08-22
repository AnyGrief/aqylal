import React, { memo, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  Button,
  Radio,
  Checkbox,
  FormControlLabel,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  ArrowDropDown as ExpandMoreIcon,
  Close as CloseIcon,
  Quiz as QuizIcon,
  CheckCircle as TrueFalseIcon,
  Edit as FillInIcon,
  PinDrop as PinAnswerIcon,
  Extension as PuzzleIcon,
  Link as MatchingIcon,
  TextFields as TextIcon,
  RadioButtonChecked as MultipleChoiceIcon,
  CheckBox as CheckBoxIcon,
} from "@mui/icons-material";
import { format } from "date-fns";

// Типизация пропсов (можно перевести на TypeScript, если нужно)
const AssignmentPreview = ({
  open,
  onClose,
  title,
  description,
  type,
  subject,
  grade,
  gradeLetter,
  dueDate,
  timeLimit,
  customTimeLimit,
  tasks,
  game_tasks,
  isGame,
}) => {
  const questions = isGame ? game_tasks || [] : tasks || [];

  // Форматирование лимита времени
  const formatTimeLimit = useCallback(() => {
    if (timeLimit === "Без ограничения") return "Без ограничения";
    if (timeLimit === "Другое") return `${customTimeLimit} минут`;
    return timeLimit;
  }, [timeLimit, customTimeLimit]);

  // Получение иконки для типа вопроса
  const getQuestionIcon = useCallback((questionType) => {
    const iconStyles = { mr: 1 };
    switch (questionType) {
      case "quiz":
        return <QuizIcon sx={{ color: "#3f51b5", ...iconStyles }} />;
      case "true_false":
        return <TrueFalseIcon sx={{ color: "#f44336", ...iconStyles }} />;
      case "fill_in":
        return <FillInIcon sx={{ color: "#ff9800", ...iconStyles }} />;
      case "pin_answer":
        return <PinAnswerIcon sx={{ color: "#9c27b0", ...iconStyles }} />;
      case "puzzle":
        return <PuzzleIcon sx={{ color: "#ffeb3b", ...iconStyles }} />;
      case "matching":
        return <MatchingIcon sx={{ color: "#2196f3", ...iconStyles }} />;
      case "text":
        return <TextIcon sx={{ color: "#607d8b", ...iconStyles }} />;
      case "multiple_choice":
        return <MultipleChoiceIcon sx={{ color: "#3f51b5", ...iconStyles }} />;
      case "checkbox":
        return <CheckBoxIcon sx={{ color: "#f44336", ...iconStyles }} />;
      default:
        return null;
    }
  }, []);

  // Компонент для отображения одного вопроса (мемоизация для оптимизации)
  const QuestionItem = memo(({ task, index, isGame }) => {
    return (
      <Accordion
        sx={{
          mb: 2,
          border: "1px solid #ddd",
          borderRadius: 2,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {getQuestionIcon(task.question_type)}
            <Typography variant="h6">
              {index + 1}. {isGame ? task.question : task.title || "Без названия"}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 3 }}>
          {isGame ? (
            <>
              <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  <strong>Таймер:</strong> {task.timer} сек
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  <strong>Баллы:</strong> {task.points}
                </Typography>
              </Box>
              {task.question_type === "quiz" || task.question_type === "true_false" ? (
                task.options.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    control={<Radio disabled />}
                    label={option}
                    checked={task.correct_answers?.includes(option)}
                    sx={{
                      display: "block",
                      bgcolor: task.correct_answers?.includes(option)
                        ? "rgba(76, 175, 80, 0.1)"
                        : "transparent",
                      p: 1,
                      borderRadius: 1,
                      "& .MuiTypography-root": {
                        color: task.correct_answers?.includes(option) ? "#4caf50" : "inherit",
                        fontWeight: task.correct_answers?.includes(option) ? "bold" : "normal",
                      },
                    }}
                  />
                ))
              ) : task.question_type === "fill_in" ? (
                <TextField
                  fullWidth
                  disabled
                  label="Правильный ответ"
                  value={task.correct_answer || ""}
                  sx={{ bgcolor: "rgba(76, 175, 80, 0.1)" }}
                />
              ) : task.question_type === "slider" ? (
                <Box>
                  <Typography>
                    Диапазон: {task.min} - {task.max}
                  </Typography>
                  <Typography sx={{ color: "#4caf50", fontWeight: "bold" }}>
                    Правильный ответ: {task.correct_answer}
                  </Typography>
                </Box>
              ) : task.question_type === "pin_answer" ? (
                <Box>
                  {task.image && (
                    <Box sx={{ mb: 2 }}>
                      <img
                        src={task.image}
                        alt="Изображение для закрепления ответа"
                        loading="lazy"
                        style={{
                          maxWidth: "300px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                        }}
                      />
                    </Box>
                  )}
                  <Typography sx={{ color: "#4caf50", fontWeight: "bold" }}>
                    Координаты правильного ответа: ({task.correct_position?.x || 0},{" "}
                    {task.correct_position?.y || 0})
                  </Typography>
                </Box>
              ) : task.question_type === "puzzle" ? (
                <Box>
                  {task.image && (
                    <Box sx={{ mb: 2 }}>
                      <img
                        src={task.image}
                        alt="Изображение головоломки"
                        loading="lazy"
                        style={{
                          maxWidth: "300px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                        }}
                      />
                    </Box>
                  )}
                  <Typography>Количество частей: {task.pieces}</Typography>
                </Box>
              ) : task.question_type === "matching" ? (
                <Box>
                  {task.options.map((pair, pairIndex) => (
                    <Box
                      key={pairIndex}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                        p: 1,
                        bgcolor: "rgba(33, 150, 243, 0.1)",
                        borderRadius: 1,
                      }}
                    >
                      <Typography sx={{ flex: 1 }}>{pair.left}</Typography>
                      <Typography>→</Typography>
                      <Typography sx={{ flex: 1 }}>{pair.right}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : null}
            </>
          ) : (
            <>
              {task.question_type === "text" ? (
                <TextField fullWidth disabled label="Введите ответ" />
              ) : task.question_type === "multiple_choice" ? (
                task.options.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    control={<Radio disabled />}
                    label={option}
                    checked={task.correct_answer === option}
                    sx={{
                      display: "block",
                      bgcolor: task.correct_answer === option ? "rgba(76, 175, 80, 0.1)" : "transparent",
                      p: 1,
                      borderRadius: 1,
                      "& .MuiTypography-root": {
                        color: task.correct_answer === option ? "#4caf50" : "inherit",
                        fontWeight: task.correct_answer === option ? "bold" : "normal",
                      },
                    }}
                  />
                ))
              ) : task.question_type === "checkbox" ? (
                task.options.map((option, optIndex) => (
                  <FormControlLabel
                    key={optIndex}
                    control={<Checkbox disabled />}
                    label={option}
                    checked={task.correct_answer?.split(",").includes(option)}
                    sx={{
                      display: "block",
                      bgcolor: task.correct_answer?.split(",").includes(option)
                        ? "rgba(76, 175, 80, 0.1)"
                        : "transparent",
                      p: 1,
                      borderRadius: 1,
                      "& .MuiTypography-root": {
                        color: task.correct_answer?.split(",").includes(option) ? "#4caf50" : "inherit",
                        fontWeight: task.correct_answer?.split(",").includes(option) ? "bold" : "normal",
                      },
                    }}
                  />
                ))
              ) : null}
              {task.required && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: "block" }}>
                  * Обязательный вопрос
                </Typography>
              )}
            </>
          )}
        </AccordionDetails>
      </Accordion>
    );
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e0e0e0",
          maxHeight: "90vh",
          overflowY: "auto",
        },
      }}
      aria-labelledby="assignment-preview-title"
    >
      <DialogTitle component="div" sx={{ position: "relative", bgcolor: "#f5f5f5", py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography
              variant="h6"
              id="assignment-preview-title"
              sx={{ fontWeight: "bold", color: "#1a237e" }}
            >
              {title}
            </Typography>
            {description && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {description}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
            aria-label="Закрыть предпросмотр"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {/* Общая информация о задании */}
        <Box sx={{ mb: 3, p: 2, bgcolor: "#fafafa", borderRadius: 2 }}>
          <Typography variant="body1">
            <strong>Тип:</strong> {type || "Не указан"}
          </Typography>
          <Typography variant="body1">
            <strong>Предмет:</strong> {subject || "Не указан"}
          </Typography>
          <Typography variant="body1">
            <strong>Класс:</strong> {grade || ""}
            {gradeLetter || ""}
          </Typography>
          <Typography variant="body1">
            <strong>Дата сдачи:</strong>{" "}
            {dueDate ? format(new Date(dueDate), "dd.MM.yyyy") : "Не указана"}
          </Typography>
          <Typography variant="body1">
            <strong>Лимит времени:</strong> {formatTimeLimit()}
          </Typography>
        </Box>

        {/* Список вопросов */}
        {questions.length > 0 ? (
          questions.map((task, index) => (
            <QuestionItem key={index} task={task} index={index} isGame={isGame} />
          ))
        ) : (
          <Typography sx={{ textAlign: "center", color: "#757575" }}>
            Нет вопросов для отображения.
          </Typography>
        )}

        {/* Кнопка закрытия */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              bgcolor: "#6200ea",
              "&:hover": { bgcolor: "#3700b3" },
              borderRadius: "8px",
              px: 3,
            }}
            aria-label="Закрыть предпросмотр"
          >
            Закрыть
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentPreview;