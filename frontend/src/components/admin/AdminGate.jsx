import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../../utils/api';
import {
  ADMIN_LOCKED_EVENT,
  getUnlockExpiry,
  lockAdminPanel,
  removeAdminUnlock,
  saveAdminUnlock,
} from '../../utils/adminUnlock';
import AdminUnlock from '../../pages/admin/AdminUnlock';

// Admin panel ke upar ka gate. Children tabhi render hote hain jab server ne
// bola ho "unlocked" (password + code word + security answer verify ho chuke).
// phase: checking | error | setup | locked | open
const AdminGate = ({ children }) => {
  const [phase, setPhase] = useState('checking');
  const [info, setInfo] = useState({ question: '', minutes: 30, lockedUntil: null });
  const timer = useRef(null);

  // Token ki expiry par apne aap lock
  const armTimer = useCallback(() => {
    clearTimeout(timer.current);
    const expiry = getUnlockExpiry();
    if (!expiry) return;
    timer.current = setTimeout(lockAdminPanel, Math.max(expiry - Date.now(), 0));
  }, []);

  const check = useCallback(async () => {
    setPhase('checking');
    try {
      const { data } = await API.get('/admin/security/status');
      setInfo({
        question: data.question || '',
        minutes: data.unlockMinutes || 30,
        lockedUntil: data.lockedUntil || null,
      });
      if (!data.required) return setPhase('open');
      if (!data.configured) {
        removeAdminUnlock();
        return setPhase('setup');
      }
      if (data.unlocked) {
        armTimer();
        return setPhase('open');
      }
      removeAdminUnlock();
      return setPhase('locked');
    } catch {
      return setPhase('error');
    }
  }, [armTimer]);

  useEffect(() => {
    check();
    return () => clearTimeout(timer.current);
  }, [check]);

  // Lock button / expiry / server ke ADMIN_LOCKED jawab se
  useEffect(() => {
    const onLocked = () => {
      clearTimeout(timer.current);
      setPhase((p) => (p === 'open' ? 'locked' : p));
    };
    window.addEventListener(ADMIN_LOCKED_EVENT, onLocked);
    return () => window.removeEventListener(ADMIN_LOCKED_EVENT, onLocked);
  }, []);

  // Lock hone par server se taaza info (question, lockout) lo
  useEffect(() => {
    if (phase !== 'locked') return;
    API.get('/admin/security/status')
      .then(({ data }) =>
        setInfo((i) => ({ ...i, question: data.question || i.question, lockedUntil: data.lockedUntil || null }))
      )
      .catch(() => {});
  }, [phase]);

  const handleSuccess = (data) => {
    saveAdminUnlock(data);
    armTimer();
    setPhase('open');
  };

  if (phase === 'open') return children;

  return (
    <AdminUnlock
      mode={phase}
      question={info.question}
      minutes={info.minutes}
      lockedUntil={info.lockedUntil}
      onSuccess={handleSuccess}
      onRetry={check}
    />
  );
};

export default AdminGate;
