import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserProfile, getUserRole, loginUser, logoutUser } from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [role, setRole] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoggedOut, setIsLoggedOut] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const fetchUserData = useCallback(async () => {
        if (isLoggedOut) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const roleResponse = await getUserRole();
            const userRole = roleResponse.data.role;
            if (!userRole) {
                throw new Error("Роль пользователя не определена");
            }
            setRole(userRole);

            const profileResponse = await getUserProfile();
            if (!profileResponse) {
                throw new Error("Данные профиля не получены");
            }
            setUser(profileResponse);

            const isOnAuthPage = location.pathname === "/login" || location.pathname === "/register";
            const isOnRootPage = location.pathname === "/";

            if (!isOnAuthPage && !isOnRootPage) {
                setLoading(false);
                return;
            }

            if (profileResponse.profileCompleted === 0) {
                if (userRole === "teacher") {
                    navigate("/complete-teacher-profile");
                } else if (userRole === "student") {
                    navigate("/complete-profile");
                } else {
                    navigate("/profile");
                }
            } else {
                navigate("/profile");
            }
        } catch (err) {
            console.error("Ошибка в fetchUserData:", err.message, err.response?.data);
            const isOnAuthPage = location.pathname === "/login" || location.pathname === "/register";
            if (err.response?.status === 401 && !isOnAuthPage) {
                setError(err.response?.data?.error || err.message || "Ошибка авторизации");
                setRole(null);
                setUser(null);
                setIsLoggedOut(true);
                navigate("/login");
            } else {
                setRole(null);
                setUser(null);
                setError(null);
            }
        } finally {
            setLoading(false);
        }
    }, [isLoggedOut, location, navigate]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const login = useCallback(async (credentials) => {
        try {
            const res = await loginUser(credentials);
            setIsLoggedOut(false);

            const { role, profileCompleted, userId, table_name } = res.data;
            setRole(role);
            setUser({ id: userId, table_name, role, profileCompleted });

            await fetchUserData();

            return res;
        } catch (err) {
            console.error("Ошибка в login:", err);
            throw err;
        }
    }, [fetchUserData]); // Зависимость от fetchUserData, так как login вызывает fetchUserData

    const logout = useCallback(async () => {
        try {
            await logoutUser();
            setRole(null);
            setUser(null);
            setIsLoggedOut(true);
            navigate("/login");
        } catch (err) {
            console.error("Ошибка при выходе:", err);
        }
    }, [navigate]); // Зависимость от navigate, так как logout использует navigate

    const refreshUser = useCallback(async () => {
        try {
            const profileResponse = await getUserProfile();
            setUser(profileResponse);
        } catch (err) {
            console.error("Ошибка при обновлении профиля:", err);
        }
    }, []); // Нет зависимостей, так как getUserProfile и setUser не меняются

    const value = useMemo(
        () => ({ role, user, loading, error, login, logout, refreshUser }),
        [role, user, loading, error, login, logout, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};