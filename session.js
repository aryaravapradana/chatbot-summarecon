// In-memory session store
// Keeps track of what menu step each phone number is currently on
const sessions = {};

function getSession(phoneNumber) {
    if (!sessions[phoneNumber]) {
        sessions[phoneNumber] = {
            step: 'START',
            data: {}
        };
    }
    return sessions[phoneNumber];
}

function updateSession(phoneNumber, updates) {
    if (sessions[phoneNumber]) {
        sessions[phoneNumber] = { ...sessions[phoneNumber], ...updates };
    }
}

function clearSession(phoneNumber) {
    delete sessions[phoneNumber];
}

module.exports = {
    getSession,
    updateSession,
    clearSession
};
