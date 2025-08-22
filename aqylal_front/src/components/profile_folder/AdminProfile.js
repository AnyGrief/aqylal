import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Typography,
    Box,
    Card,
    CardContent,
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
    CircularProgress,
} from "@mui/material";
import {
    People as PeopleIcon,
    Help as HelpIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
} from "@mui/icons-material";
import { useAuth } from "../AuthContext";
import { getUsersList, updateUserRole } from "../../api";
import ProfileLayout from "./ProfileLayout";
import Settings from "../Settings";

const AdminProfile = () => {
    const { user, role, loading, error, logout } = useAuth();
    const [users, setUsers] = useState([]);
    const [profileError, setProfileError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersList = await getUsersList();
                setUsers(usersList);
            } catch (err) {
                setProfileError(err.response?.data.error || "Не удалось загрузить список пользователей.");
            }
        };

        if (!loading) {
            if (error || !user) {
                navigate("/login");
                return;
            }

            if (role !== "admin") {
                setProfileError("У вас нет прав для доступа к этой странице.");
                setTimeout(() => navigate("/profile"), 2000); // Перенаправляем на /profile
                return;
            }

            fetchUsers();
        }
    }, [user, role, loading, error, navigate]);

    const handleRoleChange = async (userId, newRoleId) => {
        try {
            setProfileError("");
            setSuccess("");
            await updateUserRole(userId, newRoleId);
            setSuccess("Роль пользователя успешно обновлена!");
            const updatedUsers = await getUsersList();
            setUsers(updatedUsers);
        } catch (err) {
            setProfileError(err.response?.data.error || "Не удалось обновить роль пользователя.");
        }
    };

    // Проверяем, загружены ли данные профиля (например, есть ли first_name)
    const isProfileDataLoaded = user && user.first_name !== undefined;

    if (loading || !isProfileDataLoaded) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || profileError) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Typography variant="h5" color="error">
                    {error || profileError}
                </Typography>
            </Box>
        );
    }

    if (!user) {
        return null;
    }

    const menuItems = [
        {
            text: "Профиль",
            icon: <PersonIcon />,
            action: (setViewMode) => setViewMode("profile"),
            selected: (viewMode) => viewMode === "profile",
        },
        { text: "Пользователи", icon: <PeopleIcon />, path: "/user-management" },
        { text: "Помощь", icon: <HelpIcon />, path: "/help" },
        {
            text: "Настройки",
            icon: <SettingsIcon />,
            action: (setViewMode) => setViewMode("settings"),
            selected: (viewMode) => viewMode === "settings",
        },
        {
            text: "Выход",
            icon: <LogoutIcon />,
            action: () => logout(),
        },
    ];

    const profileContent = (
        <>
            <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: "bold", color: "primary.main", mb: 3 }}
            >
                Профиль администратора
            </Typography>
            {success && (
                <Typography variant="body1" color="success.main" sx={{ mb: 2 }}>
                    {success}
                </Typography>
            )}
            <Card sx={{ boxShadow: 3, borderRadius: 2, mb: 4 }}>
                <CardContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="body1">
                            <strong>Имя:</strong> {user.first_name || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Фамилия:</strong> {user.last_name || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Отчество:</strong> {user.patronymic || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Email:</strong> {user.email || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Логин:</strong> {user.login || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Телефон:</strong> {user.phone || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Дата рождения:</strong> {user.birth_date || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Роль:</strong> Администратор
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: "bold", color: "primary.main", mb: 3 }}
            >
                Управление пользователями
            </Typography>
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
                        {users.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell>{u.id}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>{u.login}</TableCell>
                                <TableCell>{u.first_name || "-"}</TableCell>
                                <TableCell>{u.last_name || "-"}</TableCell>
                                <TableCell>{u.patronymic || "-"}</TableCell>
                                <TableCell>{u.role}</TableCell>
                                <TableCell>
                                    <FormControl sx={{ minWidth: 120 }}>
                                        <InputLabel>Роль</InputLabel>
                                        <Select
                                            value={u.role_id}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
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
        </>
    );

    const settingsContent = (
        <>
            <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: "bold", color: "primary.main", mb: 3 }}
            >
                Настройки
            </Typography>
            <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
                <CardContent>
                    <Settings />
                </CardContent>
            </Card>
        </>
    );

    return (
        <ProfileLayout
            user={user}
            menuItems={menuItems}
            defaultViewMode="profile"
            profileContent={profileContent}
            settingsContent={settingsContent}
            roleLabel="Администратор"
        />
    );
};

export default AdminProfile;