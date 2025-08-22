import React from "react";
import { Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const NotFound = () => {
    const navigate = useNavigate();
    const { role } = useAuth();

    return (
        <Container maxWidth="sm" sx={{ mt: 8, textAlign: "center" }}>
            <Typography variant="h4" gutterBottom>
                Страница не найдена
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
                К сожалению, страница, которую вы ищете, не существует.
            </Typography>
            <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(role ? "/profile" : "/login")}
                sx={{ mt: 2 }}
            >
                Вернуться на главную
            </Button>
        </Container>
    );
};

export default NotFound;