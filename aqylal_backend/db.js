const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10, // Максимум 10 соединений
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Ошибка подключения к БД:", err);
  } else {
    console.log("✅ MySQL подключен (через пул)");
    connection.release(); // Освобождаем соединение
  }
});

module.exports = pool.promise();
