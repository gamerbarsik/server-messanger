import os
import random
import string
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder="static")

# === Настройка базы данных ===
database_url = os.environ.get("DATABASE_URL")
if database_url:
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url.replace(
        "postgres://", "postgresql://"
    )
else:
    os.makedirs("instance", exist_ok=True)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///../instance/messenger.db"

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# === Модели ===
class User(db.Model):
    id = db.Column(db.String(10), primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), default="")
    password_hash = db.Column(db.Text, nullable=False)
    is_online = db.Column(db.Boolean, default=False)
    last_seen = db.Column(db.DateTime, default=db.func.current_timestamp())


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, unique=True, nullable=False)
    from_user_id = db.Column(db.String(10), db.ForeignKey("user.id"), nullable=False)
    to_user_id = db.Column(db.String(10), db.ForeignKey("user.id"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())


class FriendRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.String(10), db.ForeignKey("user.id"), nullable=False)
    to_user_id = db.Column(db.String(10), db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())

    from_user = db.relationship("User", foreign_keys=[from_user_id])
    to_user = db.relationship("User", foreign_keys=[to_user_id])


# === Вспомогательная функция: получение реального IP ===
def get_real_ip():
    if request.environ.get("HTTP_X_FORWARDED_FOR"):
        # Render, Heroku и другие прокси
        ip = request.environ["HTTP_X_FORWARDED_FOR"].split(",")[0].strip()
    else:
        # Локальный запуск
        ip = request.remote_addr
    return ip


# === Логирование IP при каждом запросе ===
@app.before_request
def log_request_info():
    ip = get_real_ip()
    print(f"📥 Запрос от IP: {ip} → {request.method} {request.path}")


# === Создание таблиц ===
with app.app_context():
    db.create_all()


def generate_user_id():
    return "fz" + "".join(random.choices(string.digits, k=6))


def generate_message_id():
    while True:
        msg_id = random.randint(1, 999999999)
        if not Message.query.filter_by(message_id=msg_id).first():
            return msg_id


# === Роуты ===
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/messenger.html")
def messenger_page():
    return send_from_directory(app.static_folder, "messenger.html")


@app.route("/<path:path>")
def static_files(path):
    try:
        if path.startswith("api/"):
            return jsonify({"error": "Not found"}), 404
        return send_from_directory(app.static_folder, path)
    except FileNotFoundError:
        return send_from_directory(app.static_folder, "index.html")


# Регистрация
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    display_name = data.get("displayName", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "")
    password2 = data.get("password2", "")

    if (
        not display_name
        or not username.startswith("@")
        or len(password) < 6
        or password != password2
    ):
        return jsonify({"error": "Неверные данные"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Юзернейм уже существует"}), 409

    user_id = generate_user_id()
    hashed = generate_password_hash(password)
    new_user = User(
        id=user_id, username=username, display_name=display_name, password_hash=hashed
    )
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"success": True})


# Вход
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    identifier = data.get("identifier", "").strip()
    password = data.get("password", "")

    user = User.query.filter_by(username=identifier).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Неверный логин или пароль"}), 401

    user.is_online = True
    user.last_seen = db.func.current_timestamp()
    db.session.commit()

    ip = get_real_ip()
    print(f"✅ Пользователь {user.username} вошёл с IP: {ip}")

    return jsonify(
        {
            "success": True,
            "userId": user.id,
            "username": user.username,
            "displayName": user.display_name,
        }
    )


# Выход
@app.route("/api/logout", methods=["POST"])
def logout():
    data = request.get_json()
    user_id = data.get("userId")
    if user_id:
        user = User.query.get(user_id)
        if user:
            user.is_online = False
            db.session.commit()
    return jsonify({"success": True})


# Heartbeat
@app.route("/api/heartbeat", methods=["POST"])
def heartbeat():
    data = request.get_json()
    user_id = data.get("userId")
    if user_id:
        user = User.query.get(user_id)
        if user:
            user.is_online = True
            user.last_seen = db.func.current_timestamp()
            db.session.commit()
    return jsonify({"success": True})


# Онлайн-пользователи
@app.route("/api/online")
def online_users():
    q = request.args.get("q", "").strip().lower()
    if q:
        users = User.query.filter(
            (User.is_online == True)
            & (User.display_name.ilike(f"%{q}%") | User.username.ilike(f"%{q}%"))
        ).all()
    else:
        users = User.query.filter_by(is_online=True).all()

    result = []
    for u in users:
        result.append(
            {
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name,
                "is_online": u.is_online,
            }
        )
    return jsonify(result)


# Список друзей
@app.route("/api/friends")
def get_all_friends():
    user_id = request.args.get("userId")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    accepted_requests = FriendRequest.query.filter(
        (
            (FriendRequest.from_user_id == user_id)
            | (FriendRequest.to_user_id == user_id)
        )
        & (FriendRequest.status == "accepted")
    ).all()

    friend_ids = set()
    for req in accepted_requests:
        if req.from_user_id == user_id:
            friend_ids.add(req.to_user_id)
        else:
            friend_ids.add(req.from_user_id)

    users = User.query.filter(User.id.in_(friend_ids)).all()

    result = []
    for u in users:
        result.append(
            {
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name,
                "is_online": u.is_online,
            }
        )
    return jsonify(result)


# Поиск друзей
@app.route("/api/friends/search")
def search_friends():
    q = request.args.get("q", "").strip().lower()
    if not q:
        return jsonify([])

    users = User.query.filter(
        User.display_name.ilike(f"%{q}%") | User.username.ilike(f"%{q}%")
    ).all()
    result = []
    for u in users:
        result.append(
            {
                "id": u.id,
                "username": u.username,
                "display_name": u.display_name,
                "is_online": u.is_online,
            }
        )
    return jsonify(result)


# Отправить заявку
@app.route("/api/friends/add", methods=["POST"])
def add_friend():
    data = request.get_json()
    target_username = data.get("targetUsername")
    requester_id = data.get("requesterId")

    if not target_username or not requester_id:
        return jsonify({"error": "Не хватает данных"}), 400

    target_user = User.query.filter_by(username=target_username).first()
    if not target_user:
        return jsonify({"error": "Пользователь не найден"}), 404

    if requester_id == target_user.id:
        return jsonify({"error": "Нельзя отправить заявку самому себе"}), 409

    existing = FriendRequest.query.filter(
        (
            (FriendRequest.from_user_id == requester_id)
            & (FriendRequest.to_user_id == target_user.id)
        )
        | (
            (FriendRequest.from_user_id == target_user.id)
            & (FriendRequest.to_user_id == requester_id)
        )
    ).first()

    if existing:
        return jsonify({"error": "Заявка уже существует"}), 409

    new_request = FriendRequest(from_user_id=requester_id, to_user_id=target_user.id)
    db.session.add(new_request)
    db.session.commit()

    return jsonify({"success": True})


# Заявки в ожидании
@app.route("/api/friend-requests/pending", methods=["POST"])
def get_pending_requests():
    data = request.get_json()
    user_id = data.get("userId")
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    requests = FriendRequest.query.filter_by(to_user_id=user_id, status="pending").all()

    result = []
    for req in requests:
        result.append(
            {
                "id": req.id,
                "from_user": {
                    "id": req.from_user.id,
                    "username": req.from_user.username,
                    "display_name": req.from_user.display_name,
                    "is_online": req.from_user.is_online,
                },
            }
        )
    return jsonify(result)


# Принять заявку
@app.route("/api/friend-requests/accept", methods=["POST"])
def accept_friend_request():
    data = request.get_json()
    request_id = data.get("requestId")
    user_id = data.get("userId")

    req = FriendRequest.query.filter_by(id=request_id, to_user_id=user_id).first()
    if not req:
        return jsonify({"error": "Заявка не найдена"}), 404

    req.status = "accepted"
    db.session.commit()
    return jsonify({"success": True})


# Отклонить заявку
@app.route("/api/friend-requests/reject", methods=["POST"])
def reject_friend_request():
    data = request.get_json()
    request_id = data.get("requestId")
    user_id = data.get("userId")

    req = FriendRequest.query.filter_by(id=request_id, to_user_id=user_id).first()
    if not req:
        return jsonify({"error": "Заявка не найдена"}), 404

    req.status = "rejected"
    db.session.commit()
    return jsonify({"success": True})


# Обновить профиль
@app.route("/api/profile/update", methods=["POST"])
def update_profile():
    data = request.get_json()
    user_id = data.get("userId")
    display_name = data.get("displayName", "").strip()

    if not user_id or not display_name or len(display_name) < 2:
        return jsonify({"error": "Неверные данные"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    user.display_name = display_name
    db.session.commit()

    return jsonify({"success": True})


# Получить данные пользователя
@app.route("/api/user", methods=["POST"])
def get_user():
    data = request.get_json()
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "Не указан ID"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "is_online": user.is_online,
        }
    )


# Отправить сообщение
@app.route("/api/messages/send", methods=["POST"])
def send_dm_message():
    data = request.get_json()
    from_user_id = data.get("from_user_id")
    to_user_id = data.get("to_user_id")
    text = data.get("text", "").strip()

    if not from_user_id or not to_user_id or not text:
        return jsonify({"error": "Не хватает данных"}), 400

    message_id = generate_message_id()
    msg = Message(
        message_id=message_id,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        text=text,
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify({"success": True})


# Получить историю сообщений
@app.route("/api/messages/history")
def get_dm_history():
    user1_id = request.args.get("user1_id")
    user2_id = request.args.get("user2_id")

    if not user1_id or not user2_id:
        return jsonify({"error": "Не хватает данных"}), 400

    messages = (
        Message.query.filter(
            ((Message.from_user_id == user1_id) & (Message.to_user_id == user2_id))
            | ((Message.from_user_id == user2_id) & (Message.to_user_id == user1_id))
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    result = []
    for msg in messages:
        author = User.query.get(msg.from_user_id)
        result.append(
            {
                "message_id": msg.message_id,
                "author_name": author.display_name if author else "Unknown",
                "text": msg.text,
                "is_own": msg.from_user_id == user1_id,
                "is_read": msg.is_read,
                "timestamp": msg.created_at.strftime("%H:%M") if msg.created_at else "",
            }
        )
    return jsonify(result)


@app.route("/api/messages/mark-read", methods=["POST"])
def mark_messages_as_read():
    data = request.get_json()
    user_id = data.get("user_id")
    sender_id = data.get("sender_id")

    if not user_id or not sender_id:
        return jsonify({"error": "Не хватает данных"}), 400

    # Отмечаем все сообщения от sender_id как прочитанные
    messages = Message.query.filter_by(
        to_user_id=user_id, from_user_id=sender_id, is_read=False
    ).all()

    for msg in messages:
        msg.is_read = True

    db.session.commit()
    return jsonify({"success": True, "count": len(messages)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
