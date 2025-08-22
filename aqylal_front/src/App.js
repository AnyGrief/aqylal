import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import Authorization from "./components/Authorization";
import Assignments from "./components/assignment_folder/Assignments";
import AssignmentDetail from "./components/assignment_folder/AssignmentDetail";
import CreateAssignment from "./components/assignment_folder/CreateAssignment";
import CreateStandardAssignment from "./components/assignment_folder/CreateStandardAssignment";
import CreateInteractiveAssignment from "./components/assignment_folder/CreateInteractiveAssignment.tsx";
import EditAssignment from "./components/assignment_folder/EditAssignment";
import TeacherAssignment from "./components/assignment_folder/TeacherAssignment";
import StudentAssignment from "./components/assignment_folder/StudentAssignment";
import Profile from "./components/profile_folder/Profile";
import StudentProfile from "./components/profile_folder/StudentProfile";
import TeacherProfile from "./components/profile_folder/TeacherProfile";
import ModerProfile from "./components/profile_folder/ModerProfile";
import AdminProfile from "./components/profile_folder/AdminProfile";
import CompleteProfile from "./components/profile_folder/CompleteProfile";
import Students from "./components/Students";
import CompleteTeacherProfile from "./components/profile_folder/CompleteTeacherProfile";
import Settings from "./components/Settings";
import PlayQuiz from "./components/games_folder/PlayQuiz";
import UserManagement from "./components/UserManagement";
import NotFound from "./components/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import { Typography, CircularProgress, Box } from "@mui/material";
import { useAuth } from "./components/AuthContext";

// Компонент для маршрутов
const AppRoutes = () => {
    const { loading } = useAuth();

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Routes>
            {/* Страницы авторизации (доступны всем) */}
            <Route path="/" element={<Authorization />} />
            <Route path="/login" element={<Authorization />} />
            <Route path="/register" element={<Authorization />} />

            {/* Маршрут для выхода из системы */}
            <Route path="/logout" element={<Logout />} />

            {/* Страница профиля (доступна всем авторизованным пользователям) */}
            <Route
                path="/profile"
                element={
                    <ProtectedRoute
                        element={<Profile />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />

            {/* Защищённые маршруты */}
            <Route
                path="/student-profile"
                element={
                    <ProtectedRoute element={<StudentProfile />} allowedRoles={["student"]} />
                }
            />
            <Route
                path="/teacher-profile"
                element={
                    <ProtectedRoute element={<TeacherProfile />} allowedRoles={["teacher"]} />
                }
            />
            <Route
                path="/moderator-profile"
                element={
                    <ProtectedRoute element={<ModerProfile />} allowedRoles={["moderator"]} />
                }
            />
            <Route
                path="/admin-profile"
                element={<ProtectedRoute element={<AdminProfile />} allowedRoles={["admin"]} />}
            />
            <Route
                path="/complete-teacher-profile"
                element={
                    <ProtectedRoute
                        element={<CompleteTeacherProfile />}
                        allowedRoles={["teacher"]}
                    />
                }
            />
            <Route
                path="/complete-profile"
                element={
                    <ProtectedRoute
                        element={<CompleteProfile />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />

            {/* Страницы заданий с защитой */}
            <Route
                path="/assignments"
                element={
                    <ProtectedRoute
                        element={<Assignments />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />
            <Route
                path="/assignments/:id"
                element={
                    <ProtectedRoute
                        element={<AssignmentDetail />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />
            <Route
                path="/create-assignment"
                element={
                    <ProtectedRoute element={<CreateAssignment />} allowedRoles={["teacher"]} />
                }
            />
            <Route
                path="/create-standard-assignment"
                element={<ProtectedRoute element={<CreateStandardAssignment />} allowedRoles={["teacher"]} />}
            />
            <Route
                path="/create-interactive-assignment"
                element={<ProtectedRoute element={<CreateInteractiveAssignment />} allowedRoles={["teacher"]} />}
            />
            <Route
                path="/edit-assignment/:id"
                element={
                    <ProtectedRoute element={<EditAssignment />} allowedRoles={["teacher"]} />
                }
            />
            <Route
                path="/teacher-assignments"
                element={
                    <ProtectedRoute element={<TeacherAssignment />} allowedRoles={["teacher"]} />
                }
            />
            <Route
                path="/student-assignments"
                element={
                    <ProtectedRoute element={<StudentAssignment />} allowedRoles={["student"]} />
                }
            />

            {/* Страницы игр с защитой */}
            <Route
                path="/play-quiz/:id"
                element={<ProtectedRoute element={<PlayQuiz />} allowedRoles={["student"]} />}
            />

            {/* Список учеников (доступен учителям, модераторам и администраторам) */}
            <Route
                path="/students"
                element={
                    <ProtectedRoute
                        element={<Students />}
                        allowedRoles={["admin", "moderator", "teacher"]}
                    />
                }
            />

            {/* Страницы настроек и управления пользователями с защитой */}
            <Route
                path="/settings"
                element={
                    <ProtectedRoute
                        element={<Settings />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />
            <Route
                path="/user-management"
                element={
                    <ProtectedRoute
                        element={<UserManagement />}
                        allowedRoles={["admin", "moderator"]}
                    />
                }
            />

            {/* Страницы заглушки (доступны всем авторизованным пользователям) */}
            <Route
                path="/grades"
                element={
                    <ProtectedRoute
                        element={<Grades />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />
            <Route
                path="/help"
                element={
                    <ProtectedRoute
                        element={<Help />}
                        allowedRoles={["admin", "moderator", "teacher", "student"]}
                    />
                }
            />

            {/* Обработка несуществующих маршрутов */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
};

// Компонент для выхода из системы
const Logout = () => {
    const { logout } = useAuth();
    React.useEffect(() => {
        logout();
    }, [logout]);
    return <Navigate to="/login" replace />;
};

// Заглушки для новых страниц
const Grades = () => <Typography variant="h5">Оценки (в разработке)</Typography>;
const Help = () => <Typography variant="h5">Помощь (в разработке)</Typography>;

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </Router>
    );
}

export default App;