const jwt = require("jsonwebtoken");
const db = require("../db");

// Функция проверки роли
const hasRole = (userRole, requiredRoles) => {
    const roleHierarchy = {
        'admin': 1,
        'teacher': 2,
        'moderator': 3,
        'student': 4
    };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRoles];
};

const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({ 
                error: "Токен отсутствует",
                code: "TOKEN_MISSING"
            });
        }

        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        });

        const userId = decoded.id;
        const tableName = decoded.table_name;

        if (!tableName || !["users", "teachers", "admins", "moders"].includes(tableName)) {
            return res.status(400).json({ 
                error: "Некорректный токен: неизвестная таблица",
                code: "INVALID_TABLE_NAME"
            });
        }

        const [users] = await db.query(
            `SELECT id, role_id FROM ${tableName} WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            console.log(`Пользователь с id ${userId} не найден в таблице ${tableName}`);
            return res.status(404).json({ 
                error: "Пользователь не найден",
                code: "USER_NOT_FOUND"
            });
        }

        const roleMap = { 1: "admin", 2: "moderator", 3: "teacher", 4: "student" };
        req.user = { 
            id: decoded.id, 
            role: roleMap[users[0].role_id], 
            role_id: users[0].role_id,
            table_name: tableName 
        };
        next();
    } catch (err) {
        console.error("Ошибка проверки токена:", err);
        if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
            return res.status(403).json({ 
                error: "Недействительный токен",
                code: "INVALID_TOKEN"
            });
        }
        res.status(500).json({ 
            error: "Ошибка сервера",
            code: "SERVER_ERROR"
        });
    }
};

// Middleware для проверки ролей
const checkRole = (requiredRole) => (req, res, next) => {
    if (!req.user || !hasRole(req.user.role, requiredRole)) {
        return res.status(403).json({ 
            error: `Доступ запрещен. Требуется роль ${requiredRole} или выше`,
            code: "INSUFFICIENT_PERMISSIONS"
        });
    }
    next();
};

const checkTeacher = (req, res, next) => {
    if (req.user.role_id !== 3) {
        return res.status(403).json({ 
            error: "Доступ разрешён только учителям",
            code: "ACCESS_DENIED"
        });
    }
    next();
};

const checkStudent = (req, res, next) => {
    if (req.user.role_id !== 4) {
        return res.status(403).json({ error: "Доступ разрешён только ученикам" });
    }
    next();
};

const checkModerator = (req, res, next) => {
    if (req.user.role_id !== 1 && req.user.role_id !== 2) {
        return res.status(403).json({ 
            error: "Доступ разрешён только администраторам и модераторам",
            code: "ACCESS_DENIED"
        });
    }
    next();
};

module.exports = { 
    verifyToken, 
    checkRole,
    checkAdmin: checkRole('admin'),
    checkModerator: checkRole('moderator'),
    checkTeacher: checkRole('teacher')
};