import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile, getStudentAssignments } from "../../api";
import {
    Container,
    Typography,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Box,
    Button,
} from "@mui/material";

const StudentAssignment = () => {
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            setError(null);
            const user = await getUserProfile();
            if (user.role_id !== 4) {
                setError("Только ученики могут просматривать задания.");
                return;
            }

            const response = await getStudentAssignments();
            setAssignments(response.data || []);
        } catch (err) {
            setError("Не удалось загрузить задания. Попробуйте снова.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, []);

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Доступные задания
            </Typography>
            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Box>
                    <Typography color="error">{error}</Typography>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={fetchAssignments}
                        sx={{ mt: 2 }}
                    >
                        Повторить
                    </Button>
                </Box>
            ) : assignments.length === 0 ? (
                <Typography>Нет доступных заданий.</Typography>
            ) : (
                <List>
                    {assignments.map((assignment) => (
                        <ListItem
                            key={assignment.id}
                            button
                            onClick={() => navigate(`/play-quiz/${assignment.id}`)}
                            sx={{
                                bgcolor: "#fff",
                                mb: 1,
                                borderRadius: 1,
                                boxShadow: 1,
                            }}
                        >
                            <ListItemText
                                primary={assignment.title}
                                secondary={`Предмет: ${assignment.subject}, Класс: ${assignment.grade}${assignment.grade_letter}, Срок: ${assignment.due_date}`}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Container>
    );
};

export default StudentAssignment;