// Единое состояние приложения
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