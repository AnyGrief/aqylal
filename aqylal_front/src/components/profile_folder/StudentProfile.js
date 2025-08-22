import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Typography,
    Box,
    CircularProgress,
    Card,
    CardContent,
} from "@mui/material";
import {
    Assignment as AssignmentIcon,
    Grade as GradeIcon,
    Help as HelpIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Person as PersonIcon,
} from "@mui/icons-material";
import { useAuth } from "../AuthContext";
import Settings from "../Settings";
import ProfileLayout from "./ProfileLayout";

const StudentProfile = () => {
    const { user, role, loading, error, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (error || !user) {
                navigate("/login");
                return;
            }

            if (role !== "student") {
                navigate("/profile"); // Перенаправляем на /profile
                return;
            }
        }
    }, [user, role, loading, error, navigate]);

    // Проверяем, загружены ли данные профиля (например, есть ли first_name)
    const isProfileDataLoaded = user && user.first_name !== undefined;

    if (loading || !isProfileDataLoaded) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <Typography variant="h5" color="error">
                    {error}
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
        { text: "Задания", icon: <AssignmentIcon />, path: "/student-assignments" },
        { text: "Оценки", icon: <GradeIcon />, path: "/grades" },
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
                Профиль ученика
            </Typography>
            <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
                <CardContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="body1">
                            <strong>Имя:</strong> {user.first_name || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Фамилия:</strong> {user.last_name || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Email:</strong> {user.email || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Телефон:</strong> {user.phone || "Не указано"}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Роль:</strong> Ученик
                        </Typography>
                        <Typography variant="body1">
                            <strong>Класс:</strong> {user.grade || "Не указано"}{" "}
                            {user.grade_letter || ""}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>
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
            roleLabel="Ученик"
        />
    );
};

export default StudentProfile;