require("dotenv").config();
const db = require("./db");

const args = process.argv.slice(2); // Получаем аргументы из командной строки

if (args.length < 2) {
    console.log("❌ Использование: node changeRole.js user_id new_role");
    console.log("   Доступные роли: 1 (admin), 2 (moderator), 3 (teacher), 4 (student)");
    console.log("   Пример: node changeRole.js 1 teacher или node changeRole.js 1 3");
    process.exit(1);
}

const [userId, newRole] = args;
const validRoles = {
    student: 4,
    teacher: 3,
    moderator: 2,
    admin: 1
};

// Проверка корректности роли
const roleId = validRoles[newRole.toLowerCase()] || parseInt(newRole);
if (!Object.values(validRoles).includes(roleId)) {
    console.log(`❌ Ошибка: недопустимая роль "${newRole}".`);
    console.log("   Доступные роли: 1 (admin), 2 (moderator), 3 (teacher), 4 (student)");
    process.exit(1);
}

// Маппинг таблиц по ролям
const roleToTable = {
    1: "admins",
    2: "moders",
    3: "teachers",
    4: "users"
};

(async () => {
    let connection;
    try {
        connection = await db.getConnection(); // Предполагается, что db поддерживает пул соединений
        console.log("Транзакция отключена для отладки.");

        // Поиск текущей таблицы пользователя
        const tables = ["users", "teachers", "moders", "admins"];
        let currentTable = null;
        let currentUser = null;

        for (const table of tables) {
            const [rows] = await connection.query(
                `SELECT id, email, login, password, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted 
                 FROM ${table} WHERE id = ?`,
                [userId]
            );
            if (rows.length > 0) {
                currentTable = table;
                currentUser = rows[0];
                break;
            }
        }

        if (!currentTable) {
            console.log(`❌ Пользователь с ID ${userId} не найден.`);
            process.exit(1);
        }

        console.log(`Найден пользователь в таблице ${currentTable}:`, currentUser);

        // Если роль не меняется, просто выходим
        if (currentUser.role_id === roleId) {
            console.log(`✅ Роль пользователя с ID ${userId} уже является "${newRole}" (role_id = ${roleId}).`);
            process.exit(0);
        }

        const targetTable = roleToTable[roleId];

        // Убедимся, что user_id есть в user_ids
        await connection.query(
            "INSERT IGNORE INTO user_ids (id) VALUES (?)",
            [userId]
        );

        // Проверяем, существует ли пользователь в целевой таблице
        const [existingTarget] = await connection.query(
            `SELECT id FROM ${targetTable} WHERE id = ?`,
            [userId]
        );
        if (existingTarget.length > 0) {
            console.log(`❌ Пользователь с ID ${userId} уже существует в таблице ${targetTable}. Удаляем старую запись.`);
            await connection.query(
                `DELETE FROM ${targetTable} WHERE id = ?`,
                [userId]
            );
        }

        // Форматируем birth_date в строку YYYY-MM-DD
        const formattedBirthDate = currentUser.birth_date ? new Date(currentUser.birth_date).toISOString().split('T')[0] : null;

        // Перенос данных в новую таблицу
        const insertQuery = `
            INSERT INTO ${targetTable} (id, email, login, password, role_id, first_name, last_name, patronymic, phone, birth_date, profileCompleted) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertValues = [
            userId, currentUser.email, currentUser.login, currentUser.password, roleId,
            currentUser.first_name, currentUser.last_name, currentUser.patronymic,
            currentUser.phone, formattedBirthDate, currentUser.profileCompleted
        ];
        console.log("Значения для вставки:", insertValues);
        const [insertResult] = await connection.query(insertQuery, insertValues);
        console.log(`Результат вставки в ${targetTable}:`, insertResult);

        // Проверка сразу после вставки
        const [immediateCheck] = await connection.query(
            `SELECT id FROM ${targetTable} WHERE id = ?`,
            [userId]
        );
        console.log(`Проверка сразу после вставки:`, immediateCheck);
        if (immediateCheck.length === 0) {
            throw new Error(`Пользователь с ID ${userId} не был вставлен в таблицу ${targetTable}.`);
        }

        console.log(`Перенос пользователя в таблицу ${targetTable} выполнен.`);

        // Обновление зависимостей в sessions
        await connection.query(
            "UPDATE sessions SET user_id = ? WHERE user_id = ?",
            [userId, userId]
        );
        console.log(`Обновление sessions для user_id=${userId} выполнено.`);

        // Проверка после обновления sessions
        const [checkAfterSessions] = await connection.query(
            `SELECT id FROM ${targetTable} WHERE id = ?`,
            [userId]
        );
        console.log(`Проверка после обновления sessions:`, checkAfterSessions);
        if (checkAfterSessions.length === 0) {
            throw new Error(`Пользователь с ID ${userId} потерян после обновления sessions.`);
        }

        // Обновление зависимостей в user_settings
        await connection.query(
            "UPDATE user_settings SET user_id = ? WHERE user_id = ?",
            [userId, userId]
        );
        console.log(`Обновление user_settings для user_id=${userId} выполнено.`);

        // Проверка после обновления user_settings
        const [checkAfterSettings] = await connection.query(
            `SELECT id FROM ${targetTable} WHERE id = ?`,
            [userId]
        );
        console.log(`Проверка после обновления user_settings:`, checkAfterSettings);
        if (checkAfterSettings.length === 0) {
            throw new Error(`Пользователь с ID ${userId} потерян после обновления user_settings.`);
        }

        // Удаление из старой таблицы
        await connection.query(`DELETE FROM ${currentTable} WHERE id = ?`, [userId]);
        console.log(`Удаление из таблицы ${currentTable} выполнено.`);

        // Финальная проверка
        const [finalCheck] = await connection.query(
            `SELECT id FROM ${targetTable} WHERE id = ?`,
            [userId]
        );
        console.log(`Финальная проверка:`, finalCheck);
        if (finalCheck.length === 0) {
            throw new Error(`Пользователь с ID ${userId} не найден в таблице ${targetTable} после переноса.`);
        }

        console.log(`✅ Роль пользователя с ID ${userId} изменена на "${newRole}" (role_id = ${roleId}).`);
        process.exit(0);
    } catch (err) {
        console.error("Ошибка изменения роли:", err);
        process.exit(1);
    } finally {
        if (connection) connection.release();
    }
})();