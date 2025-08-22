import React, { useCallback, useRef, useEffect, memo } from "react";
import { useAssignmentForm } from "../hooks/useAssignmentForm";
import QuestionEditor from "./QuestionEditor";
import AssignmentPreview from "./AssignmentPreview";
import AssignmentForm from "./AssignmentForm";
import { MatchingPair, Question } from "../utils/assignmentUtils";
import { Box, CircularProgress, Snackbar, Alert, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

// Константы для анимации
const itemVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

// Типизация пропсов для улучшения читаемости
interface CreateInteractiveAssignmentProps {}

// Основной компонент для создания интерактивного задания
const CreateInteractiveAssignment: React.FC<CreateInteractiveAssignmentProps> = () => {
  const {
    formData,
    questions,
    currentQuestionId,
    loading,
    error,
    success,
    openSnackbar,
    isDataLoaded,
    showDraftDialog,
    setFormData,
    setQuestions,
    setCurrentQuestionId,
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
    handleSubmit,
    handleCloseSnackbar,
    restoreDraft,
    deleteDraft,
    closeDraftDialog,
  } = useAssignmentForm({ isGame: true });

  const [openPreview, setOpenPreview] = React.useState(false);
  const questionEditorRef = useRef<HTMLDivElement>(null);

  // Логирование для отладки
  useEffect(() => {
    console.log("CreateInteractiveAssignment: isDataLoaded =", isDataLoaded, "showDraftDialog =", showDraftDialog);
  }, [isDataLoaded, showDraftDialog]);

  // Обработка перетаскивания пар в вопросах типа "matching"
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

  // Управление предпросмотром
  const handleOpenPreview = useCallback(() => setOpenPreview(true), []);
  const handleClosePreview = useCallback(() => setOpenPreview(false), []);

  // Прокрутка к QuestionEditor при добавлении нового вопроса
  useEffect(() => {
    if (currentQuestionId && questions.length > 0 && questions[0].id === currentQuestionId && questionEditorRef.current) {
      questionEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentQuestionId, questions]);

  // Формирование содержимого QuestionEditor
  const renderQuestionEditor = () => {
    if (!currentQuestionId || !questions.find((q) => q.id === currentQuestionId)) {
      return questions.length === 0 ? (
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          Нет вопросов. Нажмите "Добавить" в левой панели, чтобы создать новый вопрос.
        </Typography>
      ) : (
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          Выберите вопрос из левой панели для редактирования.
        </Typography>
      );
    }

    const currentQuestion = questions.find((q) => q.id === currentQuestionId)!;
    return (
      <Box ref={questionEditorRef}>
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          <QuestionEditor
            currentQuestion={currentQuestion}
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
      </Box>
    );
  };

  // Рендеринг загрузки или формы
  return (
    <Box sx={{ bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      {/* Показываем индикатор загрузки только если НЕ отображается диалог черновика */}
      {!isDataLoaded && !showDraftDialog ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <CircularProgress />
        </Box>
      ) : (
        <AssignmentForm
          formData={formData}
          questions={questions}
          currentQuestionId={currentQuestionId}
          loading={loading}
          showDraftDialog={showDraftDialog}
          isGame
          titleText="Создание интерактивного задания"
          setFormData={setFormData}
          setQuestions={setQuestions}
          setCurrentQuestionId={setCurrentQuestionId}
          addQuestion={addQuestion}
          copyPreviousQuestion={copyPreviousQuestion}
          deleteQuestion={deleteQuestion}
          handleSubmit={handleSubmit}
          handleOpenPreview={handleOpenPreview}
          restoreDraft={restoreDraft}
          deleteDraft={deleteDraft}
          closeDraftDialog={closeDraftDialog}
          questionEditor={isDataLoaded ? renderQuestionEditor() : null} // Рендерим редактор только после полной загрузки
        />
      )}

      <AssignmentPreview
        open={openPreview}
        onClose={handleClosePreview}
        title={formData.title}
        type={formData.type}
        subject={formData.subject}
        grade={formData.grade}
        gradeLetter={formData.gradeLetter}
        dueDate={formData.dueDate}
        timeLimit={formData.timeLimit}
        customTimeLimit={formData.customTimeLimit}
        tasks={questions}
        description=""
        game_tasks={questions}
        isGame
      />

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={success ? "success" : "error"} sx={{ width: "100%" }}>
          {success || error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default memo(CreateInteractiveAssignment);