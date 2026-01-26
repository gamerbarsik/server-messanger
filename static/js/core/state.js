// Глобальное состояние приложения
export const state = {
  user: null,
  currentTab: 'online',
  currentChatUser: null,
  lastMessageTimestamps: {},
  unreadMessages: {},
  friendList: [],
  isFirstLoad: true,
  hasShownSummary: false
};

// Инициализация состояния
export function init() {
  state.user = JSON.parse(localStorage.getItem('user'));
  if (!state.user || !state.user.id || !state.user.username) {
    window.location.href = 'index.html';
  }
}