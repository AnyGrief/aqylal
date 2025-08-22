import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Container,
    Typography,
    Box,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Chip,
    CircularProgress,
    IconButton,
    TextField,
    FormHelperText,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { getUserProfile, updateUserProfile, getSubjects } from "../../api";
import { useAuth } from "../AuthContext";

const MAX_SUBJECTS = 5;

const CompleteTeacherProfile = () => {
    const [profile, setProfile] = useState({
        first_name: "",
        last_name: "",
        subjects: [],
    });
    const [subjectsList, setSubjectsList] = useState([]);
    const [errors, setErrors] = useState({
        first_name: "",
        last_name: "",
        subjects: "",
        general: "",
    });
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const fetchData = async () => {
        try {
            setDataLoading(true);
            setErrors((prev) => ({ ...prev, general: "" }));

            const subjectsData = await getSubjects();
            console.log("Список предметов:", subjectsData);
            setSubjectsList(subjectsData);

            const userProfile = await getUserProfile();
            setProfile({
                first_name: userProfile.first_name || "",
                last_name: userProfile.last_name || "",
                subjects: userProfile.subject && Array.isArray(userProfile.subject) ? userProfile.subject : [],
            });
        } catch (err) {
            console.error("Ошибка загрузки данных:", err);
            setErrors((prev) => ({
                ...prev,
                general: "Не удалось загрузить данные. Пожалуйста, попробуйте снова.",
            }));
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const validateField = (name, value) => {
        let error = "";
        switch (name) {
            case "first_name":
            case "last_name":
                if (!value) {
                    error = `${name === "first_name" ? "Имя" : "Фамилия"} обязательна для заполнения`;
                } else if (!/^[А-Яа-яA-Za-z\s-]*$/.test(value)) {
                    error = "Используйте только буквы, пробелы или дефисы";
                } else if (value.length > 50) {
                    error = "Максимальная длина 50 символов";
                }
                break;
            case "subjects":
                if (value.length === 0) {
                    error = "Пожалуйста, выберите хотя бы один предмет";
                } else if (value.length > MAX_SUBJECTS) {
                    error = `Вы можете выбрать не более ${MAX_SUBJECTS} предметов`;
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
        setProfile((prev) => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors((prev) => ({ ...prev, general: "" }));

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

        try {
            setLoading(true);
            console.log("Saving profile:", profile);
            await updateUserProfile({
                first_name: profile.first_name,
                last_name: profile.last_name,
                subject: profile.subjects,
            });
            await refreshUser();
            setErrors((prev) => ({
                ...prev,
                general: "Профиль успешно сохранён! Перенаправляем...",
            }));
            setTimeout(() => navigate("/teacher-profile"), 1500);
        } catch (err) {
            setErrors((prev) => ({
                ...prev,
                general: err.response?.data?.error || "Не удалось обновить профиль",
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", color: "primary.main" }}>
                Завершение профиля учителя
            </Typography>

            {dataLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {errors.general && (
                        <Alert
                            severity={errors.general.includes("успешно") ? "success" : "error"}
                            sx={{ mb: 2 }}
                            action={
                                errors.general.includes("успешно") ? null : (
                                    <IconButton
                                        color="inherit"
                                        size="small"
                                        onClick={fetchData}
                                        aria-label="Повторить попытку"
                                    >
                                        <RefreshIcon />
                                    </IconButton>
                                )
                            }
                        >
                            {errors.general}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
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
                            <FormControl fullWidth variant="outlined" error={!!errors.subjects}>
                                <InputLabel id="subjects-label">Предметы</InputLabel>
                                <Select
                                    labelId="subjects-label"
                                    multiple
                                    name="subjects"
                                    value={profile.subjects}
                                    onChange={handleChange}
                                    onBlur={() => validateField("subjects", profile.subjects)}
                                    label="Предметы"
                                    renderValue={(selected) => (
                                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                            {selected.map((value) => (
                                                <Chip
                                                    key={value}
                                                    label={value}
                                                    color="primary"
                                                    size="small"
                                                    sx={{ borderRadius: "8px" }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                    required
                                    disabled={loading || dataLoading}
                                    MenuProps={{
                                        PaperProps: {
                                            style: {
                                                maxHeight: 300,
                                            },
                                        },
                                    }}
                                >
                                    {subjectsList.map((subj) => (
                                        <MenuItem key={subj} value={subj}>
                                            {subj}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.subjects && <FormHelperText>{errors.subjects}</FormHelperText>}
                            </FormControl>

                            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    color="primary"
                                    disabled={loading || dataLoading}
                                    sx={{ px: 3 }}
                                >
                                    {loading ? (
                                        <CircularProgress size={24} color="inherit" />
                                    ) : (
                                        "Сохранить"
                                    )}
                                </Button>
                            </Box>
                        </Box>
                    </form>
                </>
            )}
        </Container>
    );
};

export default CompleteTeacherProfile;