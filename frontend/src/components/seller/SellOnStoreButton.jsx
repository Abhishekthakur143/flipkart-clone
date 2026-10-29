import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { HiOutlineChevronLeft } from 'react-icons/hi';
import './sellTab.css';

// Screen ke right side par chhupa hua tab. Arrow par tap karo to "Become a seller" button nikalta hai.
// Footer (ya kisi bhi layout) me ek baar <SellOnStoreButton /> laga do.
const SellOnStoreButton = () => {
  const user = useSelector((s) => s.auth?.user);
  const isSeller = user?.role === 'seller';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('touchstart', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} className={`sell-tab ${open ? 'open' : ''}`}>
      <button type="button" className="sell-tab-handle" aria-expanded={open} aria-label={open ? 'Hide seller option' : 'Show seller option'} onClick={() => setOpen((o) => !o)}>
        <HiOutlineChevronLeft />
      </button>
      <div className="sell-tab-body" aria-hidden={!open}>
        <small>{isSeller ? 'Manage your items and sales' : 'Sell your products on our store'}</small>
        <Link to={isSeller ? '/seller' : '/become-seller'} className="sell-tab-btn" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
          {isSeller ? 'Seller panel' : 'Become a seller'}
        </Link>
        {!user && <Link to="/login" className="sell-tab-link" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>Already a seller? Log in</Link>}
      </div>
    </div>
  );
};

export default SellOnStoreButton;
