import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import Thread from '../../components/deals/Thread';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';
import { useRealtime } from '../../utils/realtime';

const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const TABS = [
  { k: 'reply', t: 'Needs reply', s: ['Proposed'] },
  { k: 'wait', t: 'Waiting for seller', s: ['Countered'] },
  { k: 'agreed', t: 'Price agreed', s: ['Agreed'] },
  { k: 'admin', t: 'With admin', s: ['PendingAdmin'] },
  { k: 'done', t: 'Done', s: ['Approved', 'Rejected', 'Closed'] },
];
const TONE = { Proposed: 'warn', Countered: 'purple', Agreed: 'info', PendingAdmin: 'info', Approved: 'ok', Rejected: 'bad', Closed: 'gray' };
const lastSeller = (d) => [...d.events].reverse().find((e) => e.by === 'seller' && e.price != null);

const Deals = () => {
  const [deals, setDeals] = useState([]);
  const [tab, setTab] = useState('reply');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [sell, setSell] = useState('');
  const [mrp, setMrp] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await API.get('/deals/manager'); setDeals(data.deals || []); return data.deals || []; }
    catch (e) { toast.error(msg(e, 'Deals load nahi hue')); return []; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtime('private-deals-managers', 'deal-updated', load);
// modal khula ho to uska thread bhi turant naya dikhe
useEffect(() => { setOpen((o) => (o ? deals.find((d) => d._id === o._id) || o : o)); }, [deals]);

  const rows = (k) => deals.filter((d) => TABS.find((t) => t.k === k).s.includes(d.status));
  const openDeal = (d) => { setOpen(d); setPrice(''); setNote(''); setSell(d.sellingPrice || ''); setMrp(d.cuttedPrice || ''); };

  const act = async (kind, body = {}, ok) => {
    setBusy(true);
    try {
      const { data } = await API.put(`/deals/manager/${open._id}/${kind}`, body);
      toast.success(ok || data.message || 'Done');
      setOpen(null);
      await load();
    } catch (e) { toast.error(msg(e)); }
    setBusy(false);
  };

  const sp = Number(sell), agreed = open?.agreedPrice;
  const margin = open && agreed != null && sp ? sp - agreed : null;

  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Seller deals</h1>
          <p className="adm-sub">Seller ke items par rate ki baat karo, phir customer ka price tay karke admin ko bhejo.</p>
        </div>
        <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
      </div>

      <div className="adm-chips">
        {TABS.map((t) => <button key={t.k} className={`adm-chip ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>{t.t}<em>{rows(t.k).length}</em></button>)}
      </div>

      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div> : (
        <div className="adm-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Item</th><th>Seller</th><th>Qty</th><th>Seller asks</th><th>Agreed</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {rows(tab).map((d) => (
                  <tr key={d._id}>
                    <td><div className="adm-prod">{d.images?.[0]?.url ? <img src={d.images[0].url} alt="" /> : <span style={{ width: 48 }} />}<span>{d.productName}</span></div></td>
                    <td>{d.sellerInfo?.shopName || d.sellerInfo?.name || '—'}{d.sellerInfo?.trusted && <span className="dl-trusted" style={{ marginLeft: 6 }}>★</span>}<p className="adm-muted" style={{ margin: 0 }}>{d.sellerInfo?.city}</p></td>
                    <td>{d.quantity}</td>
                    <td>{formatPrice(d.askPrice)}</td>
                    <td className="adm-strong">{d.agreedPrice != null ? formatPrice(d.agreedPrice) : '—'}</td>
                    <td><span className={`adm-badge ${TONE[d.status]}`}>{d.status === 'PendingAdmin' ? 'With admin' : d.status}</span></td>
                    <td><button className="adm-btn sm ghost" onClick={() => openDeal(d)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows(tab).length === 0 && <div className="adm-empty">Is section me abhi kuch nahi hai.</div>}
          </div>
        </div>
      )}

      {open && (
        <div className="adm-modal-back" onClick={() => busy || setOpen(null)}>
          <div className="adm-modal dl-modal-wide" role="dialog" aria-label="Deal" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setOpen(null)} aria-label="Close"><HiOutlineX /></button>
            <h2>{open.productName}</h2>
            <p className="adm-modal-sub">{open.quantity} units · {open.sellerInfo?.shopName || open.sellerInfo?.name}{open.sellerInfo?.trusted ? ' · ★ Trusted' : ''}{open.sellerInfo?.unitsSold ? ` · ${open.sellerInfo.unitsSold} sold so far` : ''}</p>
            {open.images?.length > 0 && <div className="dl-photos">{open.images.map((im, i) => <img key={i} src={im.url} alt="" />)}</div>}
            {open.description && <p className="adm-sub" style={{ whiteSpace: 'pre-wrap' }}>{open.description}</p>}
            <Thread events={open.events} viewer="staff" />

            {open.status === 'Proposed' && (() => {
              const o = lastSeller(open);
              return (
                <div className="adm-form" style={{ marginTop: 14 }}>
                  <button className="adm-btn block" disabled={busy} onClick={() => act('accept', { note: '' })}>Accept seller's {formatPrice(o?.price)}</button>
                  <div className="adm-row2">
                    <div><label className="adm-label" htmlFor="dm-price">Counter offer (per unit)</label><input id="dm-price" className="adm-input" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
                    <div><label className="adm-label" htmlFor="dm-note">Note (optional)</label><input id="dm-note" className="adm-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  </div>
                  <div className="adm-actions">
                    <button className="adm-btn ghost" disabled={busy || !price} onClick={() => act('counter', { price: Number(price), note })}>Send counter</button>
                    <button className="adm-del-text" disabled={busy} onClick={() => window.confirm('Deal band kar dein?') && act('reject', { note })}>Reject deal</button>
                  </div>
                </div>
              );
            })()}

            {open.status === 'Agreed' && (
              <div className="adm-form" style={{ marginTop: 14 }}>
                <div className="dl-money"><div><small>BUY PRICE (AGREED)</small><b>{formatPrice(open.agreedPrice)}</b></div><div><small>BUY TOTAL</small><b>{formatPrice(open.agreedPrice * open.quantity)}</b></div></div>
                <div className="adm-row2">
                  <div><label className="adm-label" htmlFor="dm-sell">Customer selling price</label><input id="dm-sell" className="adm-input" type="number" min="1" value={sell} onChange={(e) => setSell(e.target.value)} /></div>
                  <div><label className="adm-label" htmlFor="dm-mrp">MRP / cut price (optional)</label><input id="dm-mrp" className="adm-input" type="number" min="0" value={mrp} onChange={(e) => setMrp(e.target.value)} /></div>
                </div>
                {margin != null && <p className={`dl-hint ${margin < 0 ? 'bad' : ''}`}>Margin: {formatPrice(margin)} per unit · {formatPrice(margin * open.quantity)} total</p>}
                <label className="adm-label" htmlFor="dm-n2">Note for admin (optional)</label>
                <input id="dm-n2" className="adm-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="adm-actions">
                  <button className="adm-btn" disabled={busy || !sp || sp < agreed} onClick={() => act('submit', { sellingPrice: sp, cuttedPrice: mrp ? Number(mrp) : 0, note })}>Send to admin</button>
                  <button className="adm-del-text" disabled={busy} onClick={() => window.confirm('Deal band kar dein?') && act('reject', { note })}>Reject deal</button>
                </div>
              </div>
            )}

            {open.status === 'Countered' && <p className="dl-hint" style={{ marginTop: 12 }}>Seller ke jawab ka intezaar hai.</p>}
            {['PendingAdmin', 'Approved', 'Rejected'].includes(open.status) && open.sellingPrice != null && (
              <div className="dl-money" style={{ marginTop: 12 }}><div><small>SELLING PRICE</small><b>{formatPrice(open.sellingPrice)}</b></div><div><small>MARGIN / UNIT</small><b>{formatPrice(open.marginPerUnit)}</b></div></div>
            )}
            {open.adminNote && <p className="dl-hint">Admin note: {open.adminNote}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Deals;
