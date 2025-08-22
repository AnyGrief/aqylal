import React from "react";
import { Question, MatchingPair, BUTTON_COLORS } from "../utils/assignmentUtils";
import SortableMatchingPair from "./SortableMatchingPair";
import { DndContext, closestCenter, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";

interface QuestionEditorProps {
  currentQuestion: Question;
  updateQuestion: (field: keyof Question, value: unknown) => void;
  updateOption: (index: number, value: string) => void;
  addOption: () => void;
  removeOption: (index: number) => void;
  toggleCorrectAnswer: (index: number) => void;
  addMatchingPair: () => void;
  updateMatchingPair: (index: number, field: keyof MatchingPair, value: string | boolean) => void;
  removeMatchingPair: (index: number) => void;
  handleMatchingDragEnd: (event: DragEndEvent) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const QUESTION_TYPES = {
  quiz: "Викторина",
  true_false: "Истина/Ложь",
  pin_answer: "Закрепите ответ",
  matching: "Сопоставление",
} as const;

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  currentQuestion,
  updateQuestion,
  updateOption,
  addOption,
  removeOption,
  toggleCorrectAnswer,
  addMatchingPair,
  updateMatchingPair,
  removeMatchingPair,
  handleMatchingDragEnd,
  handleImageUpload,
}) => {
  return (
    <Box
      sx={{
        bgcolor: "#fafafa", // Лёгкий серый фон для строгости
        p: 3,
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)", // Чёткая тень и лёгкий "внутренний свет"
        border: "1px solid #e0e0e0", // Тонкая строгая граница
      }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            label="Вопрос"
            fullWidth
            value={currentQuestion.question}
            onChange={(e) => updateQuestion("question", e.target.value)}
            required
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                "& fieldset": { borderColor: "#d0d0d0" },
                "&:hover fieldset": { borderColor: "#a0a0a0" },
              },
              "& .MuiInputLabel-root": { fontSize: "1.1rem", color: "#333" },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel sx={{ fontSize: "1.1rem", color: "#333" }}>Тип Задания</InputLabel>
            <Select
              value={currentQuestion.question_type}
              onChange={(e) => updateQuestion("question_type", e.target.value)}
              label="Тип Задания *"
              sx={{
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#d0d0d0" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#a0a0a0" },
              }}
            >
              {Object.entries(QUESTION_TYPES).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ fontSize: "1.1rem", color: "#333" }}>Таймер (сек)</InputLabel>
            <Select
              value={currentQuestion.timer}
              onChange={(e) => updateQuestion("timer", +e.target.value)}
              label="Таймер (сек)"
              sx={{
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#d0d0d0" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#a0a0a0" },
              }}
            >
              {[5, 10, 20, 30, 60].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} sm={3}>
          <FormControl fullWidth>
            <InputLabel sx={{ fontSize: "1.1rem", color: "#333" }}>Баллы</InputLabel>
            <Select
              value={currentQuestion.points}
              onChange={(e) => updateQuestion("points", +e.target.value)}
              label="Баллы"
              sx={{
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#d0d0d0" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#a0a0a0" },
              }}
            >
              {[500, 1000, 1500, 2000].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>

        {(currentQuestion.question_type === "quiz" || currentQuestion.question_type === "true_false") && (
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {(currentQuestion.options as string[]).map((opt, idx) => {
                const color = (currentQuestion.option_colors || BUTTON_COLORS)[idx];
                const isFilled = opt.trim() !== "";
                const isCorrect =
                  currentQuestion.question_type === "quiz"
                    ? (currentQuestion.correct_answers as string[]).includes(opt)
                    : currentQuestion.correct_answers === opt;
                return (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: isFilled ? color : "#fff",
                        borderLeft: `8px solid ${color}`, // Чуть толще полоса для строгости
                        p: 2,
                        borderRadius: "10px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)", // Минимальная чёткая тень
                        transform: "translateY(0)", // Плоское состояние в покое
                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        "&:hover": {
                          transform: "translateY(-2px)", // Лёгкий 3D подъём
                          boxShadow: "0 4px 8px rgba(0,0,0,0.15)", // Усиленная тень
                        },
                        color: isFilled ? "white" : "#333",
                      }}
                    >
                      <TextField
                        fullWidth
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        variant="standard"
                        InputProps={{ disableUnderline: true }}
                        sx={{
                          "& .MuiInputBase-input": { 
                            color: isFilled ? "white" : "#333",
                            fontSize: "1.1rem",
                            padding: "0",
                          },
                        }}
                      />
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          bgcolor: isCorrect ? "#4caf50" : "#fff",
                          border: `2px solid ${isFilled ? "white" : color}`,
                          ml: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          boxShadow: isCorrect ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                        }}
                        onClick={() => toggleCorrectAnswer(idx)}
                      >
                        {isCorrect && <Typography sx={{ color: "white", fontSize: "20px" }}>✔</Typography>}
                      </Box>
                      {currentQuestion.question_type === "quiz" && (currentQuestion.options as string[]).length > 4 && (
                        <IconButton onClick={() => removeOption(idx)} sx={{ color: isFilled ? "white" : "#666" }}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            {currentQuestion.question_type === "quiz" && (currentQuestion.options as string[]).length < 8 && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addOption}
                sx={{
                  mt: 2,
                  borderRadius: "8px",
                  borderColor: "#d0d0d0",
                  color: "#333",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  "&:hover": {
                    borderColor: "#a0a0a0",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                }}
              >
                Добавить вариант
              </Button>
            )}
          </Grid>
        )}

        {currentQuestion.question_type === "pin_answer" && (
          <>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                sx={{
                  borderRadius: "8px",
                  bgcolor: "#1976d2",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  "&:hover": {
                    bgcolor: "#1565c0",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
                  },
                }}
              >
                Загрузить изображение
                <input type="file" hidden onChange={handleImageUpload} accept="image/*" />
              </Button>
              {currentQuestion.image && (
                <Typography sx={{ mt: 1, color: "#333", fontSize: "1rem" }}>
                  Загружено: {currentQuestion.image}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="X"
                type="number"
                fullWidth
                value={currentQuestion.correct_position?.x ?? 0}
                onChange={(e) => updateQuestion("correct_position", { ...currentQuestion.correct_position, x: +e.target.value })}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    "& fieldset": { borderColor: "#d0d0d0" },
                    "&:hover fieldset": { borderColor: "#a0a0a0" },
                  },
                  "& .MuiInputLabel-root": { fontSize: "1.1rem", color: "#333" },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Y"
                type="number"
                fullWidth
                value={currentQuestion.correct_position?.y ?? 0}
                onChange={(e) => updateQuestion("correct_position", { ...currentQuestion.correct_position, y: +e.target.value })}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    "& fieldset": { borderColor: "#d0d0d0" },
                    "&:hover fieldset": { borderColor: "#a0a0a0" },
                  },
                  "& .MuiInputLabel-root": { fontSize: "1.1rem", color: "#333" },
                }}
              />
            </Grid>
          </>
        )}

        {currentQuestion.question_type === "matching" && (
          <Grid item xs={12}>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1, color: "#333", fontSize: "1.2rem", fontWeight: 500 }}
            >
              Пары для сопоставления:
            </Typography>
            <DndContext
              sensors={[{ sensor: PointerSensor, options: { activationConstraint: { delay: 50, tolerance: 5 } } }]}
              collisionDetection={closestCenter}
              onDragEnd={handleMatchingDragEnd}
            >
              <SortableContext
                items={(currentQuestion.options as MatchingPair[]).map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {(currentQuestion.options as MatchingPair[]).map((pair, idx) => (
                  <SortableMatchingPair
                    key={pair.id}
                    pair={pair}
                    index={idx}
                    updateMatchingPair={updateMatchingPair}
                    removeMatchingPair={removeMatchingPair}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addMatchingPair}
              sx={{
                mt: 2,
                borderRadius: "8px",
                borderColor: "#d0d0d0",
                color: "#333",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                "&:hover": {
                  borderColor: "#a0a0a0",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                },
              }}
            >
              Добавить пару
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default QuestionEditor;