// Authorization.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    Alert,
    Tabs,
    Tab,
    Divider,
    Fade,
    CircularProgress,
} from "@mui/material";
import { registerUser } from "../api";
import { useAuth } from "./AuthContext";

export default function Authorization() {
    const [tab, setTab] = useState(0);
    const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });
    const [registerForm, setRegisterForm] = useState({ email: "", login: "", password: "" });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, loading: authLoading } = useAuth(); // Добавляем authLoading из useAuth

    const handleLoginChange = (e) =>
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
    const handleRegisterChange = (e) =>
        setRegisterForm({ ...registerForm, [e.target.name]: e.target.value });

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            console.log("Попытка входа с данными:", loginForm);
            const response = await login(loginForm);
            console.log("Ответ от login:", response);
            setSuccess("Вход успешен! Перенаправляем...");
            navigate("/profile"); // Перенаправление после авторизации
        } catch (err) {
            console.error("Ошибка входа:", err);
            if (err.response?.data?.errors) {
                setError(err.response.data.errors.map(e => e.msg).join(", "));
            } else {
                setError(err.response?.data?.error || "Ошибка входа");
            }
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            console.log("Попытка регистрации с данными:", registerForm);
            const response = await registerUser(registerForm);
            console.log("Ответ от registerUser:", response);
            setSuccess("Регистрация успешна! Теперь войдите.");
            setTab(0);
            setLoginForm({ identifier: registerForm.login, password: "" });
            setRegisterForm({ email: "", login: "", password: "" });
        } catch (err) {
            console.error("Ошибка регистрации:", err);
            if (err.response?.data?.errors) {
                setError(err.response.data.errors.map(e => e.msg).join(", "));
            } else {
                setError(err.response?.data?.error || "Ошибка регистрации");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTab(newValue);
        setError("");
        setSuccess("");
    };

    // Если идёт загрузка авторизации из AuthContext, показываем индикатор
    if (authLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xs" sx={{ mt: 8, mb: 4 }}>
            <Fade in={true} timeout={800}>
                <Box
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                        background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
                        transition: "all 0.3s ease-in-out",
                    }}
                >
                    <Typography
                        variant="h4"
                        align="center"
                        gutterBottom
                        sx={{
                            fontWeight: "bold",
                            color: "#1976d2",
                            mb: 3,
                            letterSpacing: "0.5px",
                        }}
                    >
                        {tab === 0 ? "Вход" : "Регистрация"}
                    </Typography>

                    <Tabs
                        value={tab}
                        onChange={handleTabChange}
                        centered
                        sx={{
                            mb: 3,
                            "& .MuiTab-root": {
                                fontSize: "1.1rem",
                                fontWeight: "medium",
                                textTransform: "none",
                                color: "#666",
                            },
                            "& .Mui-selected": {
                                color: "#1976d2",
                                fontWeight: "bold",
                            },
                            "& .MuiTabs-indicator": {
                                backgroundColor: "#1976d2",
                                height: "3px",
                            },
                        }}
                    >
                        <Tab label="Вход" />
                        <Tab label="Регистрация" />
                    </Tabs>
                    <Divider sx={{ mb: 3 }} />

                    {error && (
                        <Fade in={!!error} timeout={500}>
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        </Fade>
                    )}
                    {success && (
                        <Fade in={!!success} timeout={500}>
                            <Alert severity="success" sx={{ mb: 2 }}>
                                {success}
                            </Alert>
                        </Fade>
                    )}

                    {tab === 0 && (
                        <Fade in={tab === 0} timeout={500}>
                            <Box
                                component="form"
                                onSubmit={handleLoginSubmit}
                                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                            >
                                <TextField
                                    label="Email или Логин"
                                    name="identifier"
                                    value={loginForm.identifier}
                                    onChange={handleLoginChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    disabled={loading}
                                    sx={{
                                        backgroundColor: "white",
                                        borderRadius: 1,
                                        "& .MuiInputBase-root": {
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f9f9f9",
                                            },
                                        },
                                    }}
                                />
                                <TextField
                                    label="Пароль"
                                    name="password"
                                    type="password"
                                    value={loginForm.password}
                                    onChange={handleLoginChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    disabled={loading}
                                    sx={{
                                        backgroundColor: "white",
                                        borderRadius: 1,
                                        "& .MuiInputBase-root": {
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f9f9f9",
                                            },
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    disabled={loading}
                                    sx={{
                                        py: 1.5,
                                        fontSize: "1rem",
                                        fontWeight: "bold",
                                        textTransform: "none",
                                        backgroundColor: "#1976d2",
                                        "&:hover": {
                                            backgroundColor: "#1565c0",
                                            transform: "scale(1.02)",
                                            transition: "all 0.3s ease",
                                        },
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} /> : "Войти"}
                                </Button>
                            </Box>
                        </Fade>
                    )}

                    {tab === 1 && (
                        <Fade in={tab === 1} timeout={500}>
                            <Box
                                component="form"
                                onSubmit={handleRegisterSubmit}
                                sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                            >
                                <TextField
                                    label="Email"
                                    name="email"
                                    value={registerForm.email}
                                    onChange={handleRegisterChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    disabled={loading}
                                    sx={{
                                        backgroundColor: "white",
                                        borderRadius: 1,
                                        "& .MuiInputBase-root": {
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f9f9f9",
                                            },
                                        },
                                    }}
                                />
                                <TextField
                                    label="Логин"
                                    name="login"
                                    value={registerForm.login}
                                    onChange={handleRegisterChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    disabled={loading}
                                    sx={{
                                        backgroundColor: "white",
                                        borderRadius: 1,
                                        "& .MuiInputBase-root": {
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f9f9f9",
                                            },
                                        },
                                    }}
                                />
                                <TextField
                                    label="Пароль"
                                    name="password"
                                    type="password"
                                    value={registerForm.password}
                                    onChange={handleRegisterChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                    disabled={loading}
                                    sx={{
                                        backgroundColor: "white",
                                        borderRadius: 1,
                                        "& .MuiInputBase-root": {
                                            transition: "all 0.3s ease",
                                            "&:hover": {
                                                backgroundColor: "#f9f9f9",
                                            },
                                        },
                                    }}
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    disabled={loading}
                                    sx={{
                                        py: 1.5,
                                        fontSize: "1rem",
                                        fontWeight: "bold",
                                        textTransform: "none",
                                        backgroundColor: "#1976d2",
                                        "&:hover": {
                                            backgroundColor: "#1565c0",
                                            transform: "scale(1.02)",
                                            transition: "all 0.3s ease",
                                        },
                                    }}
                                >
                                    {loading ? <CircularProgress size={24} /> : "Зарегистрироваться"}
                                </Button>
                            </Box>
                        </Fade>
                    )}
                </Box>
            </Fade>
        </Container>
    );
}