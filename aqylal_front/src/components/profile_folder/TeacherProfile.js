import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  CircularProgress,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import {
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Help as HelpIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { useAuth } from "../AuthContext";
import Settings from "../Settings";
import ProfileLayout from "./ProfileLayout";
import Assignments from "../assignment_folder/Assignments";
import { motion } from "framer-motion"; // Для анимаций

const TeacherProfile = () => {
  const { user, role, loading, error, logout } = useAuth();
  const navigate = useNavigate();

  // Проверка авторизации и роли
  useEffect(() => {
    if (!loading) {
      if (error || !user) {
        navigate("/login");
        return;
      }

      if (role !== "teacher") {
        navigate("/profile");
        return;
      }
    }
  }, [user, role, loading, error, navigate]);

  // Проверяем, загружены ли данные профиля
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

  // Элементы меню
  const menuItems = [
    {
      text: "Профиль",
      icon: <PersonIcon />,
      action: (setViewMode) => setViewMode("profile"),
      selected: (viewMode) => viewMode === "profile",
    },
    {
      text: "Задания",
      icon: <AssignmentIcon />,
      action: (setViewMode) => setViewMode("assignments"),
      selected: (viewMode) => viewMode === "assignments",
    },
    { text: "Ученики", icon: <PeopleIcon />, path: "/students" },
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

  // Контент профиля
  const profileContent = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          mb: 3,
          textAlign: "left", // Выравниваем заголовок по левому краю
        }}
      >
        Профиль учителя
      </Typography>
      <Card sx={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)", borderRadius: 3, maxWidth: "400px" }}>
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
              <strong>Роль:</strong> Учитель
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body1" component="span">
                <strong>Предметы:</strong>
              </Typography>
              {Array.isArray(user.subject) && user.subject.length > 0 ? (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {user.subject.map((subj) => (
                    <Chip
                      key={subj}
                      label={subj}
                      color="primary"
                      size="small"
                      sx={{ borderRadius: "8px" }}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body1" component="span">
                  Не указано
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Контент настроек
  const settingsContent = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          mb: 3,
          textAlign: "left", // Выравниваем заголовок по левому краю
        }}
      >
        Настройки
      </Typography>
      <Settings />
    </motion.div>
  );

  // Контент заданий
  const assignmentsContent = (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          mb: 3,
          textAlign: "left", // Выравниваем заголовок по левому краю
        }}
      >
        Управление заданиями
      </Typography>
      <Assignments />
    </motion.div>
  );

  return (
    <ProfileLayout
      user={user}
      menuItems={menuItems}
      defaultViewMode="profile"
      profileContent={profileContent}
      settingsContent={settingsContent}
      assignmentsContent={assignmentsContent}
      roleLabel="Учитель"
    />
  );
};

export default TeacherProfile;