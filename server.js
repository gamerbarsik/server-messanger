// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Разрешаем запросы с любого origin (для разработки)
app.use(cors());
app.use(express.json());

// === In-memory хранилище ===
let messages = [];
let channels = [{ id: '1', name: 'общий' }, { id: '2', name: 'игры' }];
let users = [{ id: '1', username: 'user1' }];
let friendRequests = [];

// === Маршруты ===

// Получить все каналы
app.get('/api/channels', (req, res) => {
    res.json(channels);
});

// Получить сообщения канала
app.get('/api/messages/:channelId', (req, res) => {
    const { channelId } = req.params;
    const channelMessages = messages.filter(m => m.channelId === channelId);
    res.json(channelMessages);
});

// Отправить сообщение
app.post('/api/messages', (req, res) => {
    const { channelId, author, text } = req.body;
    if (!channelId || !author || !text) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    const newMessage = {
        id: Date.now().toString(),
        channelId,
        author,
        text,
        timestamp: new Date().toISOString()
    };
    messages.push(newMessage);
    res.status(201).json(newMessage);
});

// Получить заявки в друзья
app.get('/api/friend-requests', (req, res) => {
    res.json(friendRequests);
});

// Отправить заявку
app.post('/api/friend-requests', (req, res) => {
    const { from, to } = req.body;
    friendRequests.push({ from, to, status: 'pending', id: Date.now().toString() });
    res.status(201).json({ success: true });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});