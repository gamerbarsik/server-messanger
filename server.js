// server.js
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// === Подключение к SQLite ===
const dbPath = path.resolve(__dirname, 'messenger.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Ошибка БД:', err.message);
    else console.log('Подключено к SQLite');
});

// === Создание таблиц при старте ===
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_seen DATETIME,
    is_online BOOLEAN DEFAULT 0
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS friend_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER,
    to_user_id INTEGER,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(from_user_id) REFERENCES users(id),
    FOREIGN KEY(to_user_id) REFERENCES users(id)
  )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id TEXT NOT NULL,
    author_id INTEGER,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(author_id) REFERENCES users(id)
  )`);
});

// === Вспомогательные функции ===
function markUserOnline(userId) {
    db.run(`UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);
}

function markUserOffline(userId) {
    db.run(`UPDATE users SET is_online = 0 WHERE id = ?`, [userId]);
}

// === Маршруты ===

// Регистрация
app.post('/api/register', async(req, res) => {
    const { username, password } = req.body;
    if (!username || !password || username.length < 3 || password.length < 6) {
        return res.status(400).json({ error: 'Некорректные данные' });
    }
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hashed], function(err) {
            if (err && err.message.includes('UNIQUE')) {
                return res.status(409).json({ error: 'Пользователь уже существует' });
            }
            if (err) return res.status(500).json({ error: 'Ошибка регистрации' });
            res.status(201).json({ success: true, userId: this.lastID, username });
        });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка хэширования' });
    }
});

// Вход
app.post('/api/login', async(req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT id, username, password_hash FROM users WHERE username = ?`, [username], async(err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Неверный логин/пароль' });
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Неверный логин/пароль' });
        markUserOnline(user.id);
        res.json({ success: true, userId: user.id, username: user.username });
    });
});

// Получить онлайн-статусы
app.get('/api/online-status', (req, res) => {
    db.all(`SELECT id, username, is_online FROM users ORDER BY username`, [], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// Получить друзей и заявки (упрощённо)
app.get('/api/friends/:userId', (req, res) => {
    const { userId } = req.params;
    // Здесь можно расширить до настоящих "друзей", но пока просто все пользователи
    db.all(`SELECT id, username, is_online FROM users WHERE id != ? ORDER BY username`, [userId], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// Отправить заявку в друзья (заглушка)
app.post('/api/friend-requests', (req, res) => {
    // Для MVP просто имитируем
    res.json({ success: true });
});

// Каналы (оставим как mock)
app.get('/api/channels', (req, res) => {
    res.json([{ id: '1', name: 'общий' }, { id: '2', name: 'игры' }]);
});

// Сообщения
app.get('/api/messages/:channelId', (req, res) => {
    const { channelId } = req.params;
    db.all(`SELECT m.text, u.username as author, m.timestamp 
          FROM messages m 
          JOIN users u ON m.author_id = u.id 
          WHERE m.channel_id = ? 
          ORDER BY m.timestamp`, [channelId], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows.map(r => ({...r, id: r.timestamp })));
    });
});

app.post('/api/messages', (req, res) => {
    const { channelId, authorId, text } = req.body;
    if (!channelId || !authorId || !text) return res.status(400).json({ error: 'Не хватает данных' });
    db.run(`INSERT INTO messages (channel_id, author_id, text) VALUES (?, ?, ?)`, [channelId, authorId, text], function(err) {
        if (err) return res.status(500).json({ error: 'Не удалось отправить' });
        res.status(201).json({ success: true });
    });
});

// Эмуляция "покидания страницы" — помечаем offline
app.post('/api/logout', (req, res) => {
    const { userId } = req.body;
    if (userId) markUserOffline(userId);
    res.json({ success: true });
});

// Запуск
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});