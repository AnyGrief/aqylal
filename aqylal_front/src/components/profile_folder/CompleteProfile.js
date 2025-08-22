import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Container,
    Typography,
    Box,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    FormHelperText,
} from "@mui/material";
import { getUserProfile, updateUserProfile } from "../../api";
import { useAuth } from "../AuthContext";

export default function CompleteProfile() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const [profile, setProfile] = useState({
        first_name: "",
        last_name: "",
        patronymic: "",
        phone: "",
        birth_date: "",
        grade: "",
        grade_letter: "",
    });
    const [errors, setErrors] = useState({
        first_name: "",
        last_name: "",
        patronymic: "",
        phone: "",
        birth_date: "",
        grade: "",
        grade_letter: "",
        general: "",
    });
    const [roleId, setRoleId] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userProfile = await getUserProfile();
                setRoleId(userProfile.role_id || 4);
                setProfile({
                    first_name: userProfile.first_name || "",
                    last_name: userProfile.last_name || "",
                    patronymic: userProfile.patronymic || "",
                    phone: userProfile.phone || "",
                    birth_date: userProfile.birth_date || "",
                    grade: userProfile.grade || "",
                    grade_letter: userProfile.grade_letter || "",
                });
            } catch (err) {
                console.error("Ошибка загрузки профиля:", err);
                setErrors((prev) => ({ ...prev, general: "Не удалось загрузить профиль" }));
                navigate("/login");
            }
        };
        fetchProfile();
    }, [navigate]);

    const validateField = (name, value) => {
        let error = "";
        switch (name) {
            case "first_name":
            case "last_name":
            case "patronymic":
                if (!value && (name === "first_name" || name === "last_name")) {
                    error = `${name === "first_name" ? "Имя" : "Фамилия"} обязательна для заполнения`;
                } else if (value && !/^[А-Яа-яA-Za-z\s-]*$/.test(value)) {
                    error = "Используйте только буквы, пробелы или дефисы";
                } else if (value.length > 50) {
                    error = "Максимальная длина 50 символов";
                }
                break;
            case "phone":
                if (value && !/^\+?\d{10,15}$/.test(value)) {
                    error = "Телефон должен быть в формате +79991234567 (10-15 цифр)";
                }
                break;
            case "birth_date":
                if (value) {
                    const today = new Date();
                    const birthDate = new Date(value);
                    if (birthDate >= today) {
                        error = "Дата рождения не может быть в будущем";
                    } else if (today.getFullYear() - birthDate.getFullYear() > 120) {
                        error = "Недопустимый возраст";
                    }
                }
                break;
            case "grade":
                if (roleId === 4 && !value) {
                    error = "Класс обязателен для ученика";
                }
                break;
            case "grade_letter":
                if (roleId === 4) {
                    if (!value) {
                        error = "Литера класса обязательна";
                    } else if (!/^[А-ЯA-Z]$/.test(value)) {
                        error = "Литера класса должна быть одной заглавной буквой (А-Я или A-Z)";
                    }
                }
                break;
            default:
                break;
        }
        setErrors((prev) => ({ ...prev, [name]: error }));
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;
        if (name === "grade_letter") {
            newValue = value.slice(0, 1).toUpperCase();
        }
        setProfile((prev) => ({ ...prev, [name]: newValue }));
        validateField(name, newValue);
    };

    const handleSubmit = async () => {
        try {
            setErrors((prev) => ({ ...prev, general: "" }));
            setSuccess(null);

            // Проверяем все поля
            const fieldsToValidate = Object.keys(profile);
            let hasError = false;
            fieldsToValidate.forEach((field) => {
                const error = validateField(field, profile[field]);
                if (error) hasError = true;
            });

            if (hasError) {
                setErrors((prev) => ({
                    ...prev,
                    general: "Пожалуйста, исправьте ошибки в форме",
                }));
                return;
            }

            await updateUserProfile(profile);
            await refreshUser();
            setSuccess("Профиль успешно заполнен!");
            setTimeout(() => navigate("/profile"), 1500);
        } catch (err) {
            console.error("Ошибка обновления профиля:", err);
            setErrors((prev) => ({
                ...prev,
                general: err.response?.data?.error || "Ошибка сохранения профиля",
            }));
        }
    };

    if (roleId === null) {
        return null;
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h5" gutterBottom align="center">
                Завершение профиля
            </Typography>

            {errors.general && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {errors.general}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            <Box
                component="form"
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    backgroundColor: "#f5f5f5",
                    p: 3,
                    borderRadius: 2,
                    boxShadow: 2,
                }}
            >
                <TextField
                    label="Имя"
                    name="first_name"
                    value={profile.first_name}
                    onChange={handleChange}
                    onBlur={() => validateField("first_name", profile.first_name)}
                    fullWidth
                    required
                    variant="outlined"
                    sx={{ backgroundColor: "white" }}
                    error={!!errors.first_name}
                    helperText={errors.first_name}
                />
                <TextField
                    label="Фамилия"
                    name="last_name"
                    value={profile.last_name}
                    onChange={handleChange}
                    onBlur={() => validateField("last_name", profile.last_name)}
                    fullWidth
                    required
                    variant="outlined"
                    sx={{ backgroundColor: "white" }}
                    error={!!errors.last_name}
                    helperText={errors.last_name}
                />
                <TextField
                    label="Отчество (необязательно)"
                    name="patronymic"
                    value={profile.patronymic}
                    onChange={handleChange}
                    onBlur={() => validateField("patronymic", profile.patronymic)}
                    fullWidth
                    variant="outlined"
                    sx={{ backgroundColor: "white" }}
                    error={!!errors.patronymic}
                    helperText={errors.patronymic}
                />
                <TextField
                    label="Телефон (необязательно)"
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    onBlur={() => validateField("phone", profile.phone)}
                    fullWidth
                    variant="outlined"
                    sx={{ backgroundColor: "white" }}
                    error={!!errors.phone}
                    helperText={errors.phone}
                />
                <TextField
                    label="Дата рождения (необязательно)"
                    type="date"
                    name="birth_date"
                    value={profile.birth_date}
                    onChange={handleChange}
                    onBlur={() => validateField("birth_date", profile.birth_date)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    sx={{ backgroundColor: "white" }}
                    error={!!errors.birth_date}
                    helperText={errors.birth_date}
                />

                {roleId === 4 && (
                    <>
                        <FormControl fullWidth variant="outlined" error={!!errors.grade}>
                            <InputLabel>Класс</InputLabel>
                            <Select
                                name="grade"
                                value={profile.grade}
                                onChange={handleChange}
                                onBlur={() => validateField("grade", profile.grade)}
                                label="Класс"
                                required
                                sx={{ backgroundColor: "white" }}
                            >
                                {[...Array(11)].map((_, i) => (
                                    <MenuItem key={i + 1} value={i + 1}>
                                        {i + 1}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.grade && <FormHelperText>{errors.grade}</FormHelperText>}
                        </FormControl>
                        <TextField
                            label="Литера класса"
                            name="grade_letter"
                            value={profile.grade_letter}
                            onChange={handleChange}
                            onBlur={() => validateField("grade_letter", profile.grade_letter)}
                            fullWidth
                            required
                            inputProps={{ maxLength: 1 }}
                            helperText={errors.grade_letter || "Только одна заглавная буква (например, А, Б)"}
                            variant="outlined"
                            sx={{ backgroundColor: "white" }}
                            error={!!errors.grade_letter}
                        />
                    </>
                )}

                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2, py: 1.5, fontSize: "1rem" }}
                >
                    Сохранить
                </Button>
            </Box>
        </Container>
    );
}