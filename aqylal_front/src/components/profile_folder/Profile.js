import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Typography, Container } from "@mui/material";

const Profile = () => {
    const { role, user, loading, error } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        console.log("Profile.js: loading =", loading, "role =", role, "user =", user, "error =", error);
        if (!loading) {
            if (error || !user) {
                console.log("Profile.js: Перенаправление на /login из-за ошибки или отсутствия пользователя");
                navigate("/login");
                return;
            }

            switch (role) {
                case "admin":
                    navigate("/admin-profile");
                    break;
                case "moderator":
                    navigate("/moderator-profile");
                    break;
                case "teacher":
                    navigate("/teacher-profile");
                    break;
                case "student":
                    navigate("/student-profile");
                    break;
                default:
                    console.error("Profile.js: Неизвестная роль:", role);
                    navigate("/login");
            }
        }
    }, [role, user, loading, error, navigate]);

    if (loading) {
        return (
            <Container maxWidth="sm" sx={{ mt: 4 }}>
                <Typography variant="h5">Загрузка...</Typography>
            </Container>
        );
    }

    if (error || !user) {
        return null;
    }

    return (
        <Container maxWidth="sm" sx={{ mt: 4 }}>
            <Typography variant="h5">
                Неизвестная роль пользователя: {role || "не определена"}
            </Typography>
        </Container>
    );
};

export default Profile;