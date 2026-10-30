import { useNavigate } from 'react-router-dom';
import { tokenStore } from './deliveryApi';

const KEY = 'deliveryViewAs';

// Super admin partner ki tarah dekh raha ho to upar chhota bar dikhta hai. Exit dabane par wapas super admin.
const ViewAsBar = () => {
  const navigate = useNavigate();
  let info = null;
  try { info = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { info = null; }
  if (!info || info.token !== tokenStore.get()) return null; // purana/bacha hua flag ho to nahi dikhata

  const exit = () => {
    tokenStore.clear();
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    navigate('/superadmin/delivery-partners', { replace: true });
  };

  return (
    <div role="status" style={{
      position: 'fixed', top: 6, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 6px 14px', borderRadius: 999,
      background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 16px rgba(0,0,0,.25)',
      maxWidth: '92vw',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Viewing as {info.name}</span>
      <button type="button" onClick={exit} style={{
        border: 0, cursor: 'pointer', borderRadius: 999, padding: '4px 12px', fontWeight: 800, fontSize: 12.5,
        background: '#fff', color: '#7c3aed',
      }}>Exit</button>
    </div>
  );
};

export default ViewAsBar;
