import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile } from "../../api";
import {
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    CardActions,
    Button,
    CircularProgress,
    Snackbar,
    Alert,
    Grid,
} from "@mui/material";
import { motion } from "framer-motion";

// Анимации для элементов
const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            staggerChildren: 0.2,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};


const CreateAssignment = () => {
    const navigate = useNavigate();
    const [format, setFormat] = useState("");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const user = await getUserProfile();
                if (user.role_id !== 3) {
                    setError("Только учителя могут создавать задания.");
                    setOpenSnackbar(true);
                    setTimeout(() => navigate("/profile"), 2000);
                }
            } catch (err) {
                setError(err.response?.data?.error || "Не удалось загрузить данные.");
                setOpenSnackbar(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [navigate]);

    const handleFormatSelect = (selectedFormat) => {
        setFormat(selectedFormat);
        setTimeout(() => {
            if (selectedFormat === "standard") {
                navigate("/create-standard-assignment");
            } else {
                navigate("/create-interactive-assignment");
            }
        }, 300); // Небольшая задержка для анимации
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 4 }}>
            {/* Заголовок с анимацией */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <Typography
                    variant="h4"
                    gutterBottom
                    align="center"
                    sx={{ fontWeight: "bold", color: "primary.main" }}
                >
                    Создание нового задания
                </Typography>
                <Typography
                    variant="h6"
                    gutterBottom
                    align="center"
                    color="text.secondary"
                    sx={{ mb: 4 }}
                >
                    Выберите формат задания, чтобы начать
                </Typography>

                {/* Индикатор загрузки */}
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={3} justifyContent="center">
                        {/* Карточка для стандартного задания */}
                        <Grid item xs={12} sm={6} md={4}>
                            <motion.div variants={itemVariants}>
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        boxShadow: format === "standard" ? "0 8px 24px rgba(0, 0, 0, 0.2)" : 3,
                                        transition: "all 0.3s ease",
                                        "&:hover": {
                                            transform: "translateY(-5px)",
                                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                                        },
                                        bgcolor: format === "standard" ? "primary.light" : "background.paper",
                                    }}
                                    onClick={() => setFormat("standard")}
                                    role="button"
                                    tabIndex={0}
                                    onKeyPress={(e) => e.key === "Enter" && setFormat("standard")}
                                >
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
                                            Стандартное задание
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Создайте задание с текстовыми вопросами и ответами для классического формата обучения.
                                        </Typography>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => handleFormatSelect("standard")}
                                            sx={{ borderRadius: 2 }}
                                            aria-label="Выбрать стандартное задание"
                                        >
                                            Выбрать
                                        </Button>
                                    </CardActions>
                                </Card>
                            </motion.div>
                        </Grid>

                        {/* Карточка для интерактивного задания */}
                        <Grid item xs={12} sm={6} md={4}>
                            <motion.div variants={itemVariants}>
                                <Card
                                    sx={{
                                        borderRadius: 3,
                                        boxShadow: format === "interactive" ? "0 8px 24px rgba(0, 0, 0, 0.2)" : 3,
                                        transition: "all 0.3s ease",
                                        "&:hover": {
                                            transform: "translateY(-5px)",
                                            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
                                        },
                                        bgcolor: format === "interactive" ? "secondary.light" : "background.paper",
                                    }}
                                    onClick={() => setFormat("interactive")}
                                    role="button"
                                    tabIndex={0}
                                    onKeyPress={(e) => e.key === "Enter" && setFormat("interactive")}
                                >
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: "medium" }}>
                                            Интерактивное задание
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Создайте увлекательное задание с игровыми элементами, викторинами и головоломками.
                                        </Typography>
                                    </CardContent>
                                    <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                                        <Button
                                            variant="contained"
                                            color="secondary"
                                            onClick={() => handleFormatSelect("interactive")}
                                            sx={{ borderRadius: 2 }}
                                            aria-label="Выбрать интерактивное задание"
                                        >
                                            Выбрать
                                        </Button>
                                    </CardActions>
                                </Card>
                            </motion.div>
                        </Grid>
                    </Grid>
                )}

                {/* Snackbar для отображения ошибок */}
                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={6000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: "100%" }}>
                        {error}
                    </Alert>
                </Snackbar>
            </motion.div>
        </Container>
    );
};

export default CreateAssignment;