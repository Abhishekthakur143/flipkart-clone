// Admin panel unlock token: sirf is tab me (sessionStorage), tab band => lock.
const KEY = 'adminUnlock';
export const ADMIN_LOCKED_EVENT = 'admin-locked';

const read = () => {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Valid token (expire nahi hua) ya null
export const getUnlockToken = () => {
  const v = read();
  if (!v || !v.token || Date.now() >= v.expiresAt) return null;
  return v.token;
};

export const getUnlockExpiry = () => {
  const v = read();
  return v && v.token ? v.expiresAt : null;
};

// expiresInSec server se aata hai; clock skew se bachne ke liye client ka apna time use karte hain
export const saveAdminUnlock = ({ unlockToken, expiresInSec }) => {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ token: unlockToken, expiresAt: Date.now() + expiresInSec * 1000 })
    );
  } catch {
    /* storage blocked: panel ek page tak hi khula rahega */
  }
};

// Chup-chaap hatao (event nahi)
export const removeAdminUnlock = () => {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

// Panel ko lock karo aur gate ko batao
export const lockAdminPanel = () => {
  removeAdminUnlock();
  window.dispatchEvent(new Event(ADMIN_LOCKED_EVENT));
};
