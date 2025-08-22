import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Container,
    Typography,
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Button,
} from "@mui/material";
import { getUserProfile } from "../api";

const Students = () => {
    const [user, setUser] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const profile = await getUserProfile();
                if (profile.role_id !== 3) {
                    navigate("/profile");
                    return;
                }
                setUser(profile);
                // Заглушка: запрос списка учеников
                const response = await fetchStudents(profile.subject);
                setStudents(response);
            } catch (err) {
                console.error("Ошибка загрузки данных:", err);
                navigate("/login");
            }
        };
        fetchUser();
    }, [navigate]);

    // Заглушка для запроса учеников
    const fetchStudents = async (subject) => {
        // Здесь должен быть запрос на бэкенд, например GET /students?subject=Информатика
        return [
            { id: 1, first_name: "Айша", last_name: "Касымова", grade: 7, grade_letter: "А", score: 85 },
            { id: 2, first_name: "Бекжан", last_name: "Сериков", grade: 7, grade_letter: "Б", score: 92 },
        ];
    };

    const handleClassChange = (event) => {
        setSelectedClass(event.target.value);
    };

    const filteredStudents = selectedClass
        ? students.filter(
              (student) => `${student.grade}${student.grade_letter}` === selectedClass
          )
        : students;

    if (!user) {
        return null;
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
                Ученики
            </Typography>
            <Box sx={{ mb: 3 }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Класс</InputLabel>
                    <Select value={selectedClass} onChange={handleClassChange} label="Класс">
                        <MenuItem value="">Все классы</MenuItem>
                        {[...new Set(students.map((s) => `${s.grade}${s.grade_letter}`))].map(
                            (className) => (
                                <MenuItem key={className} value={className}>
                                    {className}
                                </MenuItem>
                            )
                        )}
                    </Select>
                </FormControl>
            </Box>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Имя</TableCell>
                        <TableCell>Фамилия</TableCell>
                        <TableCell>Класс</TableCell>
                        <TableCell>Оценка</TableCell>
                        <TableCell>Действия</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell>{student.first_name}</TableCell>
                            <TableCell>{student.last_name}</TableCell>
                            <TableCell>{student.grade}{student.grade_letter}</TableCell>
                            <TableCell>{student.score}</TableCell>
                            <TableCell>
                                <Button
                                    variant="outlined"
                                    onClick={() => navigate(`/student/${student.id}`)}
                                >
                                    Просмотреть профиль
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Container>
    );
};

export default Students;