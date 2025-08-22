import { useEffect, useState } from "react";
import { getAssignmentById, submitAssignment } from "../../api";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Typography, Button, TextField, Box, RadioGroup, FormControlLabel, Radio, Checkbox } from "@mui/material";

export default function AssignmentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState(null);
    const [answers, setAnswers] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) {
            setError("ID задания отсутствует");
            return;
        }

        getAssignmentById(id)
            .then((res) => {
                console.log("Полученные данные задания:", res.data);
                setAssignment(res.data);
                const questions = res.data.is_game ? res.data.game_tasks : res.data.tasks;
                setAnswers(questions.map((q) => ({
                    question_id: q.id,
                    answer: q.question_type === "checkbox" ? [] : "",
                })));
            })
            .catch((err) => {
                console.error("Ошибка загрузки задания:", err.response?.data || err.message);
                setError("Не удалось загрузить задание");
            });
    }, [id]);

    const handleAnswerChange = (index, value) => {
        const newAnswers = [...answers];
        newAnswers[index].answer = value;
        setAnswers(newAnswers);
    };

    const handleCheckboxChange = (index, option, checked) => {
        const newAnswers = [...answers];
        if (checked) {
            newAnswers[index].answer.push(option);
        } else {
            newAnswers[index].answer = newAnswers[index].answer.filter((ans) => ans !== option);
        }
        setAnswers(newAnswers);
    };

    const handleSubmit = async () => {
        try {
            await submitAssignment(id, answers);
            alert("Ответы отправлены!");
            navigate("/assignments");
        } catch (err) {
            console.error("Ошибка отправки:", err.response?.data || err.message);
            alert("Ошибка отправки");
        }
    };

    if (error) return <Typography color="error">{error}</Typography>;
    if (!assignment) return <Typography>Загрузка...</Typography>;

    const questions = assignment.is_game ? assignment.game_tasks : assignment.tasks;

    return (
        <Container>
            <Typography variant="h4" sx={{ mb: 3 }}>{assignment.title}</Typography>
            <Typography sx={{ mb: 2 }}>{assignment.description}</Typography>

            {questions.length === 0 ? (
                <Typography>Вопросы отсутствуют</Typography>
            ) : (
                questions.map((q, index) => (
                    <Box key={q.id} sx={{ mb: 2 }}>
                        <Typography>{q.text}</Typography>
                        {q.question_type === "multiple_choice" ? (
                            <RadioGroup
                                value={answers[index]?.answer || ""}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                            >
                                {q.options.map((option, optIndex) => (
                                    <FormControlLabel
                                        key={optIndex}
                                        value={option}
                                        control={<Radio />}
                                        label={option}
                                    />
                                ))}
                            </RadioGroup>
                        ) : q.question_type === "checkbox" ? (
                            <Box>
                                {q.options.map((option, optIndex) => (
                                    <FormControlLabel
                                        key={optIndex}
                                        control={
                                            <Checkbox
                                                checked={answers[index]?.answer.includes(option) || false}
                                                onChange={(e) => handleCheckboxChange(index, option, e.target.checked)}
                                            />
                                        }
                                        label={option}
                                    />
                                ))}
                            </Box>
                        ) : (
                            <TextField
                                fullWidth
                                value={answers[index]?.answer || ""}
                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                            />
                        )}
                    </Box>
                ))
            )}

            <Button variant="contained" sx={{ mt: 3 }} onClick={handleSubmit}>
                Отправить ответы
            </Button>
        </Container>
    );
}