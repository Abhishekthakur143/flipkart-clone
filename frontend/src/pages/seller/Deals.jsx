import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineRefresh, HiOutlineX } from 'react-icons/hi';
import API from '../../utils/api';
import { formatPrice } from '../../utils/constants';
import { compressImage } from '../../utils/imageCompress';
import Thread from '../../components/deals/Thread';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';
import { useRealtime } from '../../utils/realtime';
 
const msg = (e, f = 'Something went wrong') => e?.response?.data?.message || f;
const LABEL = { Proposed: 'Manager ka jawab baaki', Countered: 'Aapka jawab baaki', Agreed: 'Rate tay, manager aage bhej raha hai', PendingAdmin: 'Admin ke approval me', Approved: 'Live in store', Rejected: 'Admin ne approve nahi kiya', Closed: 'Closed' };
const TONE = { Proposed: 'warn', Countered: 'purple', Agreed: 'info', PendingAdmin: 'info', Approved: 'ok', Rejected: 'bad', Closed: 'gray' };
const EMPTY = { productName: '', category: '', brand: '', description: '', highlights: '', quantity: '', askPrice: '', costPrice: '', note: '' };
 
const Deals = () => {
  const { profile } = useOutletContext();
  const verified = profile.status === 'Verified';
  const [deals, setDeals] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState('');
  const [counter, setCounter] = useState({}); // dealId -> { open, price, note }
  const [channel, setChannel] = useState(null); // Pusher channel (server batata hai)
 
  const load = useCallback(async () => {
    try {
      const { data } = await API.get('/deals/seller');
      setDeals(data.deals || []);
      setChannel(data.channel || null);
    } catch (e) { toast.error(msg(e, 'Deals load nahi hue')); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  useRealtime(channel, 'deal-updated', load);
  useEffect(() => {
    if (!adding || cats.length) return;
    API.get('/seller/categories').then((r) => setCats(r.data.categories || [])).catch(() => toast.error('Categories load nahi hui'));
  }, [adding, cats.length]);
 
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const onImages = async (e) => {
    try {
      const files = [...(e.target.files || [])].slice(0, 4 - images.length);
      const out = [];
      for (const file of files) out.push(await compressImage(file));
      setImages([...images, ...out].slice(0, 4));
    } catch (err) { toast.error(err.message); }
    e.target.value = '';
  };
 
  const create = async (e) => {
    e.preventDefault();
    setBusy('create');
    try {
      const { data } = await API.post('/deals/seller', { ...f, images });
      toast.success(data.message || 'Sent');
      setAdding(false); setF(EMPTY); setImages([]);
      await load();
    } catch (err) { toast.error(msg(err)); }
    setBusy('');
  };
 
  const act = async (deal, kind, body = {}) => {
    setBusy(deal._id + kind);
    try {
      const { data } = await API.put(`/deals/seller/${deal._id}/${kind}`, body);
      toast.success(data.message || 'Done');
      setCounter((c) => ({ ...c, [deal._id]: undefined }));
      await load();
    } catch (err) { toast.error(msg(err)); }
    setBusy('');
  };
  const lastManager = (d) => [...d.events].reverse().find((e) => e.by === 'manager' && e.price != null);
 
  return (
    <div>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">My items & deals</h1>
          <p className="adm-sub">Item aur rate manager ko bhejo. Dono sahmat hon to deal admin ke paas jati hai.</p>
        </div>
        <div className="adm-actions">
          <button className="adm-btn ghost" onClick={() => { setLoading(true); load(); }}><HiOutlineRefresh /> Refresh</button>
          <button className="adm-btn" disabled={!verified} onClick={() => setAdding(true)}><HiOutlinePlus /> New item</button>
        </div>
      </div>
 
      {!verified && <div className="dl-banner warn" role="status"><div><b>Pehle verification poori karo</b>Item tabhi bhej sakte ho jab manager aapki shop verify kar de. <Link to="/seller/verification" style={{ fontWeight: 700 }}>Verification →</Link></div></div>}
 
      {loading ? <div className="adm-spin-wrap" style={{ minHeight: 200 }}><div className="adm-spin" /></div>
        : deals.length === 0 ? <div className="adm-card"><div className="adm-empty">Abhi koi item nahi bheja. “New item” se shuru karo.</div></div>
        : (
          <div className="dl-grid">
            {deals.map((d) => {
              const c = counter[d._id];
              const offer = lastManager(d);
              return (
                <div className="adm-card adm-pad" key={d._id}>
                  <div className="dl-top">
                    {d.images?.[0]?.url ? <img src={d.images[0].url} alt="" /> : <span className="dl-ph" />}
                    <div style={{ minWidth: 0 }}>
                      <b>{d.productName}</b>
                      <small>{d.quantity} units · ask {formatPrice(d.askPrice)}</small>
                    </div>
                  </div>
                  <span className={`adm-badge ${TONE[d.status]}`}>{LABEL[d.status]}</span>
                  {d.agreedPrice != null && <div className="dl-money"><div><small>AGREED RATE</small><b>{formatPrice(d.agreedPrice)}</b></div><div><small>TOTAL FOR {d.quantity}</small><b>{formatPrice(d.agreedPrice * d.quantity)}</b></div></div>}
                  <Thread events={d.events} viewer="seller" />
 
                  {d.status === 'Countered' && offer && (
                    <>
                      <div className="dl-actions">
                        <button className="adm-btn sm" disabled={!!busy} onClick={() => act(d, 'accept')}>Accept {formatPrice(offer.price)}</button>
                        <button className="adm-btn sm ghost" onClick={() => setCounter({ ...counter, [d._id]: c ? undefined : { price: '', note: '' } })}>Counter</button>
                        <button className="adm-del-text" disabled={!!busy} onClick={() => window.confirm('Is deal ko hatana hai?') && act(d, 'withdraw')}>Withdraw</button>
                      </div>
                      {c && (
                        <div className="adm-form" style={{ marginTop: 12 }}>
                          <div className="adm-row2">
                            <div><label className="adm-label" htmlFor={`cp-${d._id}`}>Your new price (per unit)</label><input id={`cp-${d._id}`} className="adm-input" type="number" min="1" value={c.price} onChange={(e) => setCounter({ ...counter, [d._id]: { ...c, price: e.target.value } })} /></div>
                            <div><label className="adm-label">Note (optional)</label><input className="adm-input" maxLength={500} value={c.note} onChange={(e) => setCounter({ ...counter, [d._id]: { ...c, note: e.target.value } })} /></div>
                          </div>
                          <button className="adm-btn sm" disabled={!c.price || !!busy} onClick={() => act(d, 'counter', { price: Number(c.price), note: c.note })}>Send new price</button>
                        </div>
                      )}
                    </>
                  )}
                  {['Proposed', 'Agreed'].includes(d.status) && (
                    <div className="dl-actions"><button className="adm-del-text" disabled={!!busy} onClick={() => window.confirm('Is deal ko hatana hai?') && act(d, 'withdraw')}>Withdraw</button></div>
                  )}
                </div>
              );
            })}
          </div>
        )}
 
      {adding && (
        <div className="adm-modal-back" onClick={() => !busy && setAdding(false)}>
          <div className="adm-modal dl-modal-wide" role="dialog" aria-label="New item" onClick={(e) => e.stopPropagation()}>
            <button className="adm-modal-x" onClick={() => setAdding(false)} aria-label="Close"><HiOutlineX /></button>
            <h2>New item for the store</h2>
            <p className="adm-modal-sub">Item ki detail aur apna rate bhejo. Manager rate par baat karega.</p>
            <form className="adm-form" onSubmit={create}>
              <div className="dl-form-grid">
                <div className="dl-full"><label className="adm-label" htmlFor="n-name">Product name</label><input id="n-name" className="adm-input" required maxLength={200} placeholder="e.g. Laptop Pro 15" value={f.productName} onChange={set('productName')} /></div>
                <div><label className="adm-label" htmlFor="n-cat">Category</label><select id="n-cat" className="adm-select" required value={f.category} onChange={set('category')}><option value="">Choose…</option>{cats.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                <div><label className="adm-label" htmlFor="n-brand">Brand (optional)</label><input id="n-brand" className="adm-input" maxLength={80} value={f.brand} onChange={set('brand')} /></div>
                <div className="dl-full"><label className="adm-label" htmlFor="n-desc">Description</label><textarea id="n-desc" className="adm-textarea" rows={3} required minLength={10} maxLength={3000} value={f.description} onChange={set('description')} /></div>
                <div className="dl-full"><label className="adm-label" htmlFor="n-hl">Highlights (comma se alag)</label><input id="n-hl" className="adm-input" placeholder="16GB RAM, 512GB SSD" value={f.highlights} onChange={set('highlights')} /></div>
                <div><label className="adm-label" htmlFor="n-qty">Quantity (units)</label><input id="n-qty" className="adm-input" type="number" min="1" step="1" required value={f.quantity} onChange={set('quantity')} /></div>
                <div><label className="adm-label" htmlFor="n-ask">Your price per unit (₹)</label><input id="n-ask" className="adm-input" type="number" min="1" required value={f.askPrice} onChange={set('askPrice')} /></div>
                <div><label className="adm-label" htmlFor="n-cost">Your own cost per unit (₹)</label><input id="n-cost" className="adm-input" type="number" min="0" required value={f.costPrice} onChange={set('costPrice')} /><p className="dl-hint">Sirf aapko dikhega, profit nikalne ke liye.</p></div>
                <div><label className="adm-label" htmlFor="n-note">Note for manager (optional)</label><input id="n-note" className="adm-input" maxLength={500} value={f.note} onChange={set('note')} /></div>
              </div>
              <div>
                <label className="adm-upload" htmlFor="n-img">Add photos ({images.length}/4)<small>Saaf photo lagao, store par yahi dikhegi</small><input id="n-img" type="file" accept="image/*" multiple onChange={onImages} disabled={images.length >= 4} /></label>
                {images.length > 0 && <div className="adm-previews">{images.map((src, i) => <img key={i} src={src} alt="" onClick={() => setImages(images.filter((_, j) => j !== i))} title="Click to remove" />)}</div>}
              </div>
              <button type="submit" className="adm-btn block" style={{ height: 50 }} disabled={busy === 'create'}>{busy === 'create' ? 'Sending...' : 'SEND TO MANAGER'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default Deals;
 