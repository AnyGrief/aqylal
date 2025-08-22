import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Container, Typography } from "@mui/material";

const ProtectedRoute = ({ element, allowedRoles }) => {
    const { role, loading, error } = useAuth();

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Typography variant="h5">Загрузка...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Typography variant="h5" color="error">
                    {error}
                </Typography>
            </Container>
        );
    }

    if (!role) {
        console.log("ProtectedRoute: Пользователь не авторизован, перенаправляем на логин");
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
        console.log(`ProtectedRoute: role = ${role} не входит в allowedRoles = ${allowedRoles}`);
        return <Navigate to="/profile" replace />;
    }

    return element;
};

export default ProtectedRoute;