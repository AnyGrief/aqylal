import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUsersList, updateUserRole, getUserProfile } from "../api";
import {
    Container,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Alert,
} from "@mui/material";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Проверяем, является ли пользователь модератором или администратором
                const userProfile = await getUserProfile();
                if (userProfile.role_id !== 1 && userProfile.role_id !== 2) {
                    setError("У вас нет прав для управления пользователями.");
                    setTimeout(() => navigate("/profile"), 2000);
                    return;
                }

                // Получаем список пользователей
                const response = await getUsersList();
                setUsers(response.data);
            } catch (err) {
                setError(err.response?.data.error || "Не удалось загрузить список пользователей.");
            }
        };
        fetchData();
    }, [navigate]);

    const handleRoleChange = async (userId, newRoleId) => {
        try {
            setError("");
            setSuccess("");
            await updateUserRole(userId, newRoleId);
            setSuccess("Роль пользователя успешно обновлена!");
            // Обновляем список пользователей
            const response = await getUsersList();
            setUsers(response.data);
        } catch (err) {
            setError(err.response?.data.error || "Не удалось обновить роль пользователя.");
        }
    };

    return (
        <Container sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Управление пользователями
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Логин</TableCell>
                            <TableCell>Имя</TableCell>
                            <TableCell>Фамилия</TableCell>
                            <TableCell>Отчество</TableCell>
                            <TableCell>Роль</TableCell>
                            <TableCell>Действия</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.id}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.login}</TableCell>
                                <TableCell>{user.first_name || "-"}</TableCell>
                                <TableCell>{user.last_name || "-"}</TableCell>
                                <TableCell>{user.patronymic || "-"}</TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell>
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Роль</InputLabel>
                                        <Select
                                            value={user.role_id}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            label="Роль"
                                        >
                                            <MenuItem value={1}>Администратор</MenuItem>
                                            <MenuItem value={2}>Модератор</MenuItem>
                                            <MenuItem value={3}>Учитель</MenuItem>
                                            <MenuItem value={4}>Ученик</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Button
                variant="outlined"
                color="secondary"
                onClick={() => navigate("/profile")}
                sx={{ mt: 2 }}
            >
                Назад
            </Button>
        </Container>
    );
};

export default UserManagement;