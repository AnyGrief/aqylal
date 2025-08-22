import axios from "axios";

const API_URL = "http://192.168.0.44:3001";

const api = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
});

// Интерцептор для обработки ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Проверяем, не находимся ли мы уже на странице логина или регистрации
        const isOnAuthPage = window.location.pathname === "/login" || window.location.pathname === "/register";
        if ((error.response?.status === 401 || error.response?.status === 403) && !isOnAuthPage) {
            console.log("Недействительный токен, перенаправляем на логин");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

// Авторизация
export const registerUser = (userData) => api.post("/auth/register", userData);
export const loginUser = (credentials) => api.post("/auth/login", credentials);
export const logoutUser = () => api.post("/sessions/logout");

// Задания
export const createAssignment = (assignmentData) => api.post("/results/assignments", assignmentData);
export const getAssignments = (params) => api.get("/results/assignments", { params }).then(res => res.data);
export const getAssignmentById = (id) => api.get(`/results/assignments/${id}`).then(res => res.data);
export const updateAssignment = (id, assignmentData) => api.put(`/results/assignments/${id}`, assignmentData);
export const deleteAssignment = (id) => api.delete(`/results/assignments/${id}`);
export const submitAssignment = (id, answers) => api.post(`/results/assignments/${id}/submit`, { answers });

// Получение списка предметов
export const getSubjects = () => api.get("/users/subjects").then(res => res.data);

// Результаты
export const submitResult = (resultData) => api.post("/results", resultData);

// Задания для ученика
export const getStudentAssignments = () => api.get("/results/student-assignments").then(res => res.data);

// Загрузка изображений
export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/results/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
};

// Профиль
export const getUserProfile = async () => {
    const response = await api.get("/users/profile");
    return response.data;
};

export const updateUserProfile = (profileData) => api.put("/users/profile", profileData);

export const checkProfile = async () => {
    const response = await api.get("/users/check-profile");
    return response.data;
};

// Смена пароля и языка
export const changePassword = (passwordData) => api.put("/users/change-password", passwordData);
export const changeLanguage = (languageData) => api.put("/users/change-language", languageData);

// Управление пользователями (для модераторов и администраторов)
export const getUsersList = () => api.get("/users/list");
export const updateUserRole = (userId, newRoleId) => api.put("/users/update-role", { userId, newRoleId });

// Роль пользователя
export const getUserRole = () => api.get("/users/role");

export default api;