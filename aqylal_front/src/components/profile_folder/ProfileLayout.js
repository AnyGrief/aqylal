import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Container,
  Box,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ListItemButton,
} from "@mui/material";
import { useAuth } from "../AuthContext";
import logo from "../../assets/logo.png";
import { motion, AnimatePresence } from "framer-motion"; // Оставляем для анимаций

const drawerWidth = 240;

// Оборачиваем компонент в memo, чтобы избежать лишних перерисовок
const ProfileLayout = memo(
  ({
    user,
    menuItems,
    defaultViewMode = "profile",
    profileContent,
    settingsContent,
    assignmentsContent,
    roleLabel,
  }) => {
    const [viewMode, setViewMode] = useState(defaultViewMode);
    const [openLogoutDialog, setOpenLogoutDialog] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = () => {
      setOpenLogoutDialog(true);
    };

    const confirmLogout = () => {
      logout();
      setOpenLogoutDialog(false);
    };

    const handleMenuItemClick = (item) => {
      if (item.action) {
        item.action(setViewMode);
      } else if (item.path) {
        navigate(item.path);
      }
    };

    return (
      <Box sx={{ display: "flex" }}>
        {/* Верхняя панель (возвращаем старый стиль) */}
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            bgcolor: "purple", // Возвращаем оригинальный цвет
          }}
        >
          <Toolbar>
            <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
              <img src={logo} alt="AQYLAL Logo" style={{ height: 40, marginRight: 10 }} />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography variant="body1" sx={{ mr: 2 }}>
                {user.first_name} {user.last_name}, {roleLabel}
              </Typography>
              <IconButton onClick={handleLogout} aria-label="Выйти из системы">
                <Avatar>{user.first_name?.[0] || "U"}</Avatar>
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Боковая панель (возвращаем старый стиль) */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box" }, // Убираем новые стили
          }}
        >
          <Toolbar />
          <Box sx={{ overflow: "auto", display: "flex", flexDirection: "column", height: "100%" }}>
            <List>
              {menuItems.map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => handleMenuItemClick(item)}
                    selected={item.selected ? item.selected(viewMode) : false}
                    sx={{
                      "&.Mui-selected": {
                        backgroundColor: "primary.light",
                        "&:hover": {
                          backgroundColor: "primary.main",
                        },
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
            <Box sx={{ mt: "auto", p: 2 }}>
              <center>
                <Typography variant="caption" color="textSecondary" display="block">
                  Версия 0.0.0.1
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  <br />
                  © 2025-2026 AQYLAL
                  <br />
                  All rights reserved
                </Typography>
              </center>
            </Box>
          </Box>
        </Drawer>

        {/* Основной контент (уменьшаем отступ слева, но сохраняем старый стиль) */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 8,
          }}
        >
          <Container maxWidth="lg" sx={{ pl: 1, pr: 3 }}> {/* Уменьшаем отступ слева */}
            <AnimatePresence mode="wait">
              {viewMode === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {profileContent}
                </motion.div>
              )}
              {viewMode === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {settingsContent}
                </motion.div>
              )}
              {viewMode === "assignments" && (
                <motion.div
                  key="assignments"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {assignmentsContent}
                </motion.div>
              )}
            </AnimatePresence>
          </Container>
        </Box>

        {/* Диалог подтверждения выхода (возвращаем старый стиль) */}
        <Dialog open={openLogoutDialog} onClose={() => setOpenLogoutDialog(false)}>
          <DialogTitle>Подтверждение выхода</DialogTitle>
          <DialogContent>
            <Typography>Вы уверены, что хотите выйти из системы?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenLogoutDialog(false)} color="secondary">
              Отмена
            </Button>
            <Button onClick={confirmLogout} color="primary" variant="contained">
              Выйти
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

export default ProfileLayout;