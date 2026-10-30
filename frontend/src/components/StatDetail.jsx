import { useEffect } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import '../components/admin/admin.css';
import './deals/deals.css';

// Dashboard card dabane par khulne wali detail: kis cheez se ye number bana.
// cols: ['Product', 'Units', ...]  rows: [[cell, cell, ...]]  foot: ['Total', '', ..] (optional)
const StatDetail = ({ title, note, cols, rows, foot, empty = 'Abhi koi detail nahi hai.', children, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="adm-modal-back" onClick={onClose}>
      <div className="adm-modal dl-modal-wide" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <button className="adm-modal-x" onClick={onClose} aria-label="Close"><HiOutlineX /></button>
        <h2>{title}</h2>
        {note && <p className="adm-modal-sub">{note}</p>}
        {rows && (rows.length === 0 ? <div className="adm-empty">{empty}</div> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j === r.length - 1 ? 'adm-strong' : ''}>{c}</td>)}</tr>)}</tbody>
              {foot && <tfoot><tr>{foot.map((c, j) => <td key={j} className="adm-strong" style={{ borderTop: '2px solid rgba(120,130,160,.3)' }}>{c}</td>)}</tr></tfoot>}
            </table>
          </div>
        ))}
        {children}
      </div>
    </div>
  );
};

export default StatDetail;
