// Проверка авторизации (выполняется внутри DOMContentLoaded)
function checkAuth() {
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id || !user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
    return user;
}