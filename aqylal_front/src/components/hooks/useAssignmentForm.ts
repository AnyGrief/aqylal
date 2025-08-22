import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { getUserProfile, createAssignment, uploadImage } from "../../api";
import { AssignmentFormData, MatchingPair, Question, BUTTON_COLORS, formatTimeLimit, validateForm, validateQuestions } from "../utils/assignmentUtils";

interface QuestionState {
  options: string[] | MatchingPair[];
  correct_answers: string | string[] | MatchingPair[] | null;
  option_colors?: string[];
}

interface UseAssignmentFormProps {
  isGame?: boolean;
  assignmentId?: string | null; // ID задания для режима редактирования
}

export const useAssignmentForm = ({ isGame = true, assignmentId = null }: UseAssignmentFormProps = {}) => {
  const navigate = useNavigate();

  const initialFormData: AssignmentFormData = {
    title: "",
    description: isGame ? undefined : "",
    type: "",
    subject: "",
    subjects: [],
    grade: "",
    gradeLetter: "",
    dueDate: "",
    timeLimit: "Без ограничения",
    customTimeLimit: "",
    questions: [],
  };

  const [formData, setFormData] = useState<AssignmentFormData>(initialFormData);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [deletedColors, setDeletedColors] = useState<string[]>([]);
  const [questionStates, setQuestionStates] = useState<Record<string, Partial<Record<Question["question_type"], Partial<QuestionState>>>>>({});
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Ключи для localStorage
  const DRAFT_KEY_CREATE = "assignment_draft_create";
  const DRAFT_KEY_EDIT = assignmentId ? `assignment_draft_edit_${assignmentId}` : null;
  const DRAFT_KEY = assignmentId && DRAFT_KEY_EDIT ? DRAFT_KEY_EDIT : DRAFT_KEY_CREATE;

  // Проверка, является ли черновик значимым
  const isDraftMeaningful = useCallback((draft: any, initialFormData: AssignmentFormData) => {
    if (!draft) return false;
    const { formData, questions } = draft;
    return (
      formData.title !== initialFormData.title ||
      (formData.description || "") !== (initialFormData.description || "") ||
      formData.type !== initialFormData.type ||
      formData.grade !== initialFormData.grade ||
      formData.gradeLetter !== initialFormData.gradeLetter ||
      formData.dueDate !== initialFormData.dueDate ||
      formData.timeLimit !== initialFormData.timeLimit ||
      formData.customTimeLimit !== initialFormData.customTimeLimit ||
      (questions && questions.length > 0)
    );
  }, []);

  // Проверка наличия изменений
  const hasFormDataChanges = useCallback(() => {
    return (
      formData.title !== initialFormData.title ||
      (formData.description || "") !== (initialFormData.description || "") ||
      formData.type !== initialFormData.type ||
      formData.grade !== initialFormData.grade ||
      formData.gradeLetter !== initialFormData.gradeLetter ||
      formData.dueDate !== initialFormData.dueDate ||
      formData.timeLimit !== initialFormData.timeLimit ||
      formData.customTimeLimit !== initialFormData.customTimeLimit ||
      questions.length > 0
    );
  }, [formData, questions]);

  // Проверка наличия черновика
  const checkDraft = useCallback(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    console.log(`Checking draft in ${DRAFT_KEY}:`, draft ? "Draft exists" : "No draft");
    if (draft) {
      const parsedDraft = JSON.parse(draft);
      if (isDraftMeaningful(parsedDraft, initialFormData)) {
        setShowDraftDialog(true);
      } else {
        console.log(`Draft is insignificant, removing from ${DRAFT_KEY}`);
        localStorage.removeItem(DRAFT_KEY);
        setIsDataLoaded(true);
      }
    } else {
      setIsDataLoaded(true);
    }
  }, [DRAFT_KEY, isDraftMeaningful]);

  // Восстановление черновика
  const restoreDraft = useCallback(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    console.log(`Restoring draft from ${DRAFT_KEY}:`, draft);
    if (draft) {
      const { formData: savedFormData, questions: savedQuestions, currentQuestionId: savedQuestionId } = JSON.parse(draft);
      setFormData((prev) => ({
        ...prev,
        ...savedFormData,
        subjects: prev.subjects, // Сохраняем subjects из сервера
        subject: savedFormData.subject || prev.subject,
      }));
      setQuestions(savedQuestions || []);
      setCurrentQuestionId(savedQuestionId || null);
      setQuestionStates(
        savedQuestions.reduce((acc: any, q: Question) => ({
          ...acc,
          [q.id]: {
            [q.question_type]: {
              options: q.options,
              correct_answers: q.correct_answers,
              option_colors: q.option_colors,
            },
          },
        }), {})
      );
      setHasChanges(true);
    }
    setShowDraftDialog(false);
    setIsDataLoaded(true);
  }, [DRAFT_KEY]);

  // Удаление черновика
  const deleteDraft = useCallback(() => {
    console.log(`Deleting draft from ${DRAFT_KEY}`);
    localStorage.removeItem(DRAFT_KEY);
    setShowDraftDialog(false);
    setIsDataLoaded(true);
    setHasChanges(false);
  }, [DRAFT_KEY]);

  // Закрытие диалога без действий
  const closeDraftDialog = useCallback(() => {
    console.log(`Closing draft dialog, keeping draft in ${DRAFT_KEY}`);
    setShowDraftDialog(false);
    setIsDataLoaded(true);
  }, [DRAFT_KEY]);

  // Загрузка данных пользователя
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("Fetching user profile...");
        const user = await getUserProfile();
        console.log("User profile fetched:", user);
        if (!isMounted) return;

        if (user.role_id !== 3) throw new Error("Доступ только для учителей.");
        if (!Array.isArray(user.subject) || user.subject.length === 0) throw new Error("Укажите предметы в профиле.");

        setFormData((prev) => ({
          ...prev,
          subjects: user.subject || [],
          subject: user.subject?.[0] || "",
        }));

        checkDraft();
      } catch (err) {
        if (!isMounted) return;
        console.error("Error in fetchData:", err);
        setError(err instanceof Error ? err.message : "Ошибка загрузки данных.");
        setOpenSnackbar(true);
        setTimeout(() => {
          if (isMounted) navigate("/teacher-assignments");
        }, 2000);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [navigate, checkDraft]);

  // Отслеживание изменений
  useEffect(() => {
    if (isDataLoaded) {
      setHasChanges(hasFormDataChanges());
    }
  }, [formData, questions, isDataLoaded, hasFormDataChanges]);

  // Автосохранение только при наличии изменений
  useEffect(() => {
    if (isDataLoaded && hasChanges) {
      const draft = {
        formData,
        questions,
        currentQuestionId,
      };
      console.log(`Saving draft to ${DRAFT_KEY}:`, draft);
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }
  }, [formData, questions, currentQuestionId, isDataLoaded, hasChanges, DRAFT_KEY]);

  // Автоматическое закрытие диалога через 10 секунд
  useEffect(() => {
    if (showDraftDialog) {
      const timer = setTimeout(() => {
        console.log("Auto-closing draft dialog due to timeout");
        closeDraftDialog();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showDraftDialog, closeDraftDialog]);

  const updateQuestions = useCallback((newQuestions: Question[] | ((prev: Question[]) => Question[])) => {
    setQuestions((prev) => {
      const updatedQuestions = typeof newQuestions === "function" ? newQuestions(prev) : newQuestions;
      setFormData((prevForm) => ({
        ...prevForm,
        questions: updatedQuestions,
      }));
      return updatedQuestions;
    });
  }, []);

  const addQuestion = useCallback(
    (type: "quiz" | "true_false" | "pin_answer" | "matching") => {
      const newQuestion: Question = {
        id: uuidv4(),
        question: "",
        question_type: type,
        options: type === "quiz" ? ["", "", "", ""] : type === "true_false" ? ["Верно", "Неверно"] : type === "matching" ? [] : [],
        correct_answers: type === "quiz" ? [] : type === "true_false" ? "" : type === "matching" ? [] : null,
        timer: 20,
        points: 1000,
        image: type === "pin_answer" ? null : undefined,
        correct_position: type === "pin_answer" ? { x: 0, y: 0 } : undefined,
        option_colors: type === "quiz" ? BUTTON_COLORS.slice(0, 4) : undefined,
      };
      updateQuestions((prev) => [...prev, newQuestion]);
      setCurrentQuestionId(newQuestion.id);
      setQuestionStates((prev) => ({
        ...prev,
        [newQuestion.id]: { [type]: { options: newQuestion.options, correct_answers: newQuestion.correct_answers, option_colors: newQuestion.option_colors } },
      }));
    },
    [updateQuestions]
  );

  const copyPreviousQuestion = useCallback(() => {
    if (!questions.length || !currentQuestionId) return;
    const activeQuestion = questions.find((q) => q.id === currentQuestionId);
    if (!activeQuestion) return;
    const newQuestion = { ...activeQuestion, id: uuidv4() };
    updateQuestions((prev) => [...prev, newQuestion]);
    setCurrentQuestionId(newQuestion.id);
    setQuestionStates((prev) => ({ ...prev, [newQuestion.id]: prev[activeQuestion.id] }));
  }, [questions, currentQuestionId, updateQuestions]);

  const updateQuestion = useCallback(
    (field: keyof Question, value: unknown) => {
      updateQuestions((prev) =>
        prev.map((q): Question => {
          if (q.id !== currentQuestionId) return q;
          if (field === "question_type") {
            const newType = value as Question["question_type"];
            const currentState = questionStates[q.id] || {};

            setQuestionStates((prevStates) => ({
              ...prevStates,
              [q.id]: {
                ...prevStates[q.id],
                [q.question_type]: { options: q.options, correct_answers: q.correct_answers, option_colors: q.option_colors },
              },
            }));

            const restoredState = currentState[newType] || {
              options: newType === "quiz" ? ["", "", "", ""] : newType === "true_false" ? ["Верно", "Неверно"] : [],
              correct_answers: newType === "quiz" ? [] : newType === "true_false" ? "" : newType === "matching" ? [] : null,
              option_colors: newType === "quiz" ? BUTTON_COLORS.slice(0, 4) : undefined,
            };

            return {
              ...q,
              question_type: newType,
              options: restoredState.options ?? (newType === "quiz" ? ["", "", "", ""] : newType === "true_false" ? ["Верно", "Неверно"] : []),
              correct_answers: restoredState.correct_answers ?? (newType === "quiz" ? [] : newType === "true_false" ? "" : newType === "matching" ? [] : null),
              timer: q.timer,
              points: q.points,
              image: newType === "pin_answer" ? null : undefined,
              correct_position: newType === "pin_answer" ? { x: 0, y: 0 } : undefined,
              option_colors: restoredState.option_colors,
            };
          }
          return { ...q, [field]: value };
        })
      );
    },
    [currentQuestionId, questionStates, updateQuestions]
  );

  const updateOption = useCallback(
    (index: number, value: string) => {
      updateQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== currentQuestionId || q.question_type !== "quiz") return q;
          const newOptions = (q.options as string[]).map((opt, i) => (i === index ? value : opt));
          setQuestionStates((prev) => ({
            ...prev,
            [q.id]: { ...prev[q.id], quiz: { ...prev[q.id]?.quiz, options: newOptions, correct_answers: q.correct_answers, option_colors: q.option_colors } },
          }));
          return { ...q, options: newOptions };
        })
      );
    },
    [currentQuestionId, updateQuestions]
  );

  const addOption = useCallback(() => {
    updateQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuestionId || q.question_type !== "quiz" || (q.options as string[]).length >= 8) return q;
        const currentColors = q.option_colors || BUTTON_COLORS.slice(0, (q.options as string[]).length);
        const usedColors = currentColors;
        const availableColor =
          deletedColors.length > 0
            ? deletedColors[0]
            : BUTTON_COLORS.find((color) => !usedColors.includes(color)) || BUTTON_COLORS[(q.options as string[]).length % BUTTON_COLORS.length];
        setDeletedColors((prev) => prev.slice(1));
        const newOptions = [...(q.options as string[]), ""];
        const newColors = [...currentColors, availableColor];
        setQuestionStates((prev) => ({
          ...prev,
          [q.id]: { ...prev[q.id], quiz: { ...prev[q.id]?.quiz, options: newOptions, correct_answers: q.correct_answers, option_colors: newColors } },
        }));
        return { ...q, options: newOptions, option_colors: newColors };
      })
    );
  }, [currentQuestionId, deletedColors, updateQuestions]);

  const removeOption = useCallback(
    (index: number) => {
      updateQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== currentQuestionId || q.question_type !== "quiz" || (q.options as string[]).length <= 4) return q;
          const removedColor = (q.option_colors || BUTTON_COLORS.slice(0, (q.options as string[]).length))[index];
          setDeletedColors((prev) => [...prev, removedColor]);
          const newOptions = (q.options as string[]).filter((_, i) => i !== index);
          const newColors = (q.option_colors || BUTTON_COLORS.slice(0, (q.options as string[]).length)).filter((_, i) => i !== index);
          setQuestionStates((prev) => ({
            ...prev,
            [q.id]: { ...prev[q.id], quiz: { ...prev[q.id]?.quiz, options: newOptions, correct_answers: q.correct_answers, option_colors: newColors } },
          }));
          return {
            ...q,
            options: newOptions,
            option_colors: newColors,
            correct_answers: (q.correct_answers as string[]).filter((ans) => newOptions.includes(ans)),
          };
        })
      );
    },
    [currentQuestionId, updateQuestions]
  );

  const toggleCorrectAnswer = useCallback(
    (index: number) => {
      updateQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== currentQuestionId) return q;
          if (q.question_type === "quiz") {
            const answer = (q.options as string[])[index];
            const correct = (q.correct_answers as string[]);
            const newCorrect = correct.includes(answer) ? correct.filter((a) => a !== answer) : [...correct, answer];
            setQuestionStates((prev) => ({
              ...prev,
              [q.id]: {
                ...prev[q.id],
                quiz: {
                  options: q.options as string[],
                  correct_answers: newCorrect,
                  option_colors: q.option_colors,
                },
              },
            }));
            return { ...q, correct_answers: newCorrect };
          }
          if (q.question_type === "true_false") {
            const newCorrect = (q.options as string[])[index];
            setQuestionStates((prev) => ({
              ...prev,
              [q.id]: {
                ...prev[q.id],
                true_false: {
                  options: q.options as string[],
                  correct_answers: newCorrect,
                },
              },
            }));
            return { ...q, correct_answers: newCorrect };
          }
          return q;
        })
      );
    },
    [currentQuestionId, updateQuestions]
  );

  const deleteQuestion = useCallback(
    (id: string) => {
      if (!window.confirm("Удалить вопрос?")) return;
      updateQuestions((prev) => {
        const newQuestions = prev.filter((q) => q.id !== id);
        if (currentQuestionId === id) setCurrentQuestionId(newQuestions[0]?.id || null);
        return newQuestions;
      });
      setQuestionStates((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    },
    [currentQuestionId, updateQuestions]
  );

  const addMatchingPair = useCallback(() => {
    updateQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== currentQuestionId || q.question_type !== "matching") return q;
        const newOptions = [...(q.options as MatchingPair[]), { id: uuidv4(), left: "", right: "", correct: false }];
        setQuestionStates((prev) => ({
          ...prev,
          [q.id]: {
            ...prev[q.id],
            matching: {
              options: newOptions,
              correct_answers: q.correct_answers as MatchingPair[],
            },
          },
        }));
        return { ...q, options: newOptions };
      })
    );
  }, [currentQuestionId, updateQuestions]);

  const updateMatchingPair = useCallback(
    (index: number, field: keyof MatchingPair, value: string | boolean) => {
      updateQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== currentQuestionId || q.question_type !== "matching") return q;
          const pairs = [...(q.options as MatchingPair[])];
          pairs[index] = { ...pairs[index], [field]: value };
          const newCorrect =
            field === "correct" && value
              ? [...(q.correct_answers as MatchingPair[]), pairs[index]]
              : field === "correct" && !value
              ? (q.correct_answers as MatchingPair[]).filter((p) => p.id !== pairs[index].id)
              : q.correct_answers;
          setQuestionStates((prev) => ({
            ...prev,
            [q.id]: {
              ...prev[q.id],
              matching: {
                options: pairs,
                correct_answers: newCorrect as MatchingPair[],
              },
            },
          }));
          return { ...q, options: pairs, correct_answers: newCorrect };
        })
      );
    },
    [currentQuestionId, updateQuestions]
  );

  const removeMatchingPair = useCallback(
    (index: number) => {
      updateQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== currentQuestionId || q.question_type !== "matching") return q;
          const pairs = (q.options as MatchingPair[]);
          const newPairs = pairs.filter((_, i) => i !== index);
          const newCorrect = (q.correct_answers as MatchingPair[]).filter((p) => p.id !== pairs[index].id);
          setQuestionStates((prev) => ({
            ...prev,
            [q.id]: {
              ...prev[q.id],
              matching: {
                options: newPairs,
                correct_answers: newCorrect,
              },
            },
          }));
          return { ...q, options: newPairs, correct_answers: newCorrect };
        })
      );
    },
    [currentQuestionId, updateQuestions]
  );

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        setError("Файл слишком большой. Максимум 5MB.");
        setOpenSnackbar(true);
        return;
      }

      setLoading(true);
      try {
        const response = await uploadImage(file);
        if (response.url) {
          updateQuestion("image", response.url);
        } else {
          throw new Error("Не удалось загрузить изображение.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки изображения.");
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    },
    [updateQuestion]
  );

  const handleSubmit = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const formError = validateForm(formData);
      if (formError) {
        setError(`Ошибка в форме: ${formError}`);
        setOpenSnackbar(true);
        setLoading(false);
        return;
      }

      const questionError = validateQuestions(formData.questions);
      if (questionError) {
        setError(`Ошибка в вопросах: ${questionError}`);
        setOpenSnackbar(true);
        setLoading(false);
        return;
      }

      try {
        const assignmentData = {
          title: formData.title,
          description: isGame ? "Интерактивное задание" : formData.description || "Стандартное задание",
          type: formData.type,
          grade: +formData.grade,
          grade_letter: formData.gradeLetter,
          subject: formData.subject,
          due_date: formData.dueDate,
          time_limit: formatTimeLimit(formData.timeLimit, formData.customTimeLimit),
          is_game: isGame,
          tasks: isGame ? null : formData.questions.map((q) => ({ ...q, id: undefined })),
          game_tasks: isGame
            ? formData.questions.map((q) => ({
                ...q,
                id: undefined,
                correct_answers: q.question_type === "true_false" ? q.correct_answers || null : q.correct_answers,
                image: q.image ?? null,
                correct_position: q.correct_position ?? null,
                option_colors: q.option_colors ?? null,
              }))
            : null,
        };
        await createAssignment(assignmentData);
        setSuccess("Задание успешно создано!");
        setOpenSnackbar(true);
        localStorage.removeItem(DRAFT_KEY);
        setHasChanges(false);
        setTimeout(() => navigate("/teacher-assignments"), 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка создания задания.");
        setOpenSnackbar(true);
      } finally {
        setLoading(false);
      }
    },
    [formData, isGame, navigate, DRAFT_KEY]
  );

  return {
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
    setQuestions: updateQuestions,
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
    handleSubmit,
    handleCloseSnackbar: () => setOpenSnackbar(false),
    restoreDraft,
    deleteDraft,
    closeDraftDialog,
  };
};