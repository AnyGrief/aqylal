import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getAssignmentById } from "../../api";
import QuizGame from "./QuizGame";
import { Container, Typography, Snackbar, Alert } from "@mui/material";

interface Assignment {
  id: string;
  title: string;
  is_game: boolean;
  game_tasks: GameTask[];
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
  correct: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface GameTask {
  id: string;
  question: string;
  question_type: "quiz" | "true_false" | "pin_answer" | "matching";
  options: string[] | MatchingPair[];
  correct_answers: string[] | string | MatchingPair[];
  timer: number;
  points: number;
  image?: string | null;
  correct_position?: Position;
}

const PlayQuiz: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!id) {
        setError("ID задания не указан.");
        setOpenSnackbar(true);
        return;
      }
      try {
        const response = await getAssignmentById(id);
        setAssignment(response.data);
      } catch (err) {
        setError("Не удалось загрузить задание.");
        setOpenSnackbar(true);
      }
    };
    fetchAssignment();
  }, [id]);

  const handleCloseSnackbar = () => setOpenSnackbar(false);

  if (!assignment) {
    return <Typography>Загрузка...</Typography>;
  }

  if (!assignment.is_game) {
    return <Typography>Это задание не является игрой.</Typography>;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        {assignment.title}
      </Typography>
      <QuizGame gameTasks={assignment.game_tasks} assignmentId={id!} />
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PlayQuiz;