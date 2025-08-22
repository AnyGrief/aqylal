// ErrorBoundary.js
import React from "react";
import { Typography, Button, Box } from "@mui/material";

class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null, errorInfo: null };

    static getDerivedStateFromError(error) {
        // Обновляем состояние, чтобы отобразить резервный UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Логируем ошибку для отладки
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        // Перезагружаем страницу
        window.location.reload();
    };

    handleGoHome = () => {
        // Перенаправляем на главную страницу
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100vh",
                        textAlign: "center",
                        p: 3,
                    }}
                >
                    <Typography variant="h4" color="error" gutterBottom>
                        Что-то пошло не так
                    </Typography>
                    <Typography variant="body1" color="textSecondary" paragraph>
                        Произошла ошибка: {this.state.error?.message || "Неизвестная ошибка"}
                    </Typography>
                    {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                        <details style={{ whiteSpace: "pre-wrap", marginTop: "16px" }}>
                            <summary>Подробности ошибки</summary>
                            <Typography variant="body2" color="textSecondary">
                                {this.state.errorInfo.componentStack}
                            </Typography>
                        </details>
                    )}
                    <Box sx={{ mt: 3 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={this.handleReload}
                            sx={{ mr: 2 }}
                        >
                            Перезагрузить страницу
                        </Button>
                        <Button
                            variant="outlined"
                            color="primary"
                            onClick={this.handleGoHome}
                        >
                            На главную
                        </Button>
                    </Box>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;