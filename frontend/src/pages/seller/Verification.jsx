import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { compressImage } from '../../utils/imageCompress';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

const ID_TYPES = ['Aadhaar', 'PAN', 'Voter ID', 'Driving Licence', 'Passport'];
const pick = (p) => ({
  shopName: p.shopName || '', shopType: p.shopType || '', ownerName: p.ownerName || '', phone: p.phone || '',
  shopAddress: p.shopAddress || '', city: p.city || '', state: p.state || '', pincode: p.pincode || '',
  gstNumber: p.gstNumber || '', idType: p.idType || 'Aadhaar', idNumber: p.idNumber || '',
  yearsInBusiness: p.yearsInBusiness || '', website: p.website || '', sells: p.sells || '', payoutDetails: p.payoutDetails || '',
});

const Row = ({ k, v }) => (v ? <div className="adm-list-row"><div className="adm-list-main"><span>{k}</span><b style={{ whiteSpace: 'normal' }}>{v}</b></div></div> : null);

// Seller ka detailed verification form (shop, identity) + status
const Verification = () => {
  const { profile, reload } = useOutletContext();
  const editable = ['Invited', 'Rejected'].includes(profile.status);
  const [f, setF] = useState(pick(profile));
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const onPhoto = async (e) => {
    try { setPhoto(await compressImage(e.target.files?.[0])); } catch (err) { toast.error(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await API.put('/seller/profile', { ...f, shopPhoto: photo });
      toast.success(data.message || 'Sent');
      await reload();
    } catch (err) { setError(err.response?.data?.message || 'Could not send the form'); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="adm-head">
        <div>
          <h1 className="adm-title">Shop verification</h1>
          <p className="adm-sub">Ek hi baar bharna hai. Isse manager ko pata chalta hai ki aap asli seller ho aur aapki shop hai.</p>
        </div>
      </div>

      {profile.status === 'Pending' && <div className="dl-banner info" role="status"><div><b>Manager review kar raha hai</b>Aapka form bhej diya gaya hai. Verify hote hi aapko items bhejne ka option mil jayega.</div></div>}
      {profile.status === 'Verified' && <div className="dl-banner ok" role="status"><div><b>Aap verified ho{profile.trusted ? ' aur Trusted seller ho ★' : ''}</b>{profile.trusted ? 'Aapka maal bik chuka hai, isliye agli baar koi form nahi bharna.' : 'Ab aap items bhej sakte ho. Pehla product bikte hi aap Trusted seller ban jaoge.'} <Link to="/seller/deals" style={{ fontWeight: 700 }}>Item bhejo →</Link></div></div>}
      {profile.status === 'Rejected' && <div className="dl-banner bad" role="alert"><div><b>Manager ne form wapas bheja hai</b>{profile.rejectReason}<br />Neeche theek karke dobara bhejo.</div></div>}

      {editable ? (
        <form className="adm-card adm-pad adm-form" onSubmit={submit}>
          <h2 className="adm-card-title" style={{ margin: 0 }}>Shop details</h2>
          <div className="dl-form-grid">
            <div><label className="adm-label" htmlFor="v-shop">Shop name</label><input id="v-shop" className="adm-input" required maxLength={120} value={f.shopName} onChange={set('shopName')} /></div>
            <div><label className="adm-label" htmlFor="v-type">Shop type</label><input id="v-type" className="adm-input" required maxLength={80} placeholder="e.g. Retail shop, Wholesaler" value={f.shopType} onChange={set('shopType')} /></div>
            <div className="dl-full"><label className="adm-label" htmlFor="v-addr">Shop address</label><input id="v-addr" className="adm-input" required maxLength={300} value={f.shopAddress} onChange={set('shopAddress')} /></div>
            <div><label className="adm-label" htmlFor="v-city">City</label><input id="v-city" className="adm-input" required value={f.city} onChange={set('city')} /></div>
            <div><label className="adm-label" htmlFor="v-state">State</label><input id="v-state" className="adm-input" required value={f.state} onChange={set('state')} /></div>
            <div><label className="adm-label" htmlFor="v-pin">Pincode</label><input id="v-pin" className="adm-input" required inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={f.pincode} onChange={set('pincode')} /></div>
            <div><label className="adm-label" htmlFor="v-years">Years in business</label><input id="v-years" className="adm-input" type="number" min="0" max="100" value={f.yearsInBusiness} onChange={set('yearsInBusiness')} /></div>
            <div><label className="adm-label" htmlFor="v-gst">GST number (optional)</label><input id="v-gst" className="adm-input" maxLength={15} placeholder="23ABCDE1234F1Z5" value={f.gstNumber} onChange={set('gstNumber')} /></div>
            <div><label className="adm-label" htmlFor="v-web">Website / Instagram (optional)</label><input id="v-web" className="adm-input" maxLength={200} value={f.website} onChange={set('website')} /></div>
            <div className="dl-full"><label className="adm-label" htmlFor="v-sells">What do you sell? (optional)</label><input id="v-sells" className="adm-input" maxLength={300} value={f.sells} onChange={set('sells')} /></div>
          </div>

          <h2 className="adm-card-title" style={{ margin: '8px 0 0' }}>Owner & identity</h2>
          <div className="dl-form-grid">
            <div><label className="adm-label" htmlFor="v-owner">Owner name</label><input id="v-owner" className="adm-input" required maxLength={80} value={f.ownerName} onChange={set('ownerName')} /></div>
            <div><label className="adm-label" htmlFor="v-phone">Mobile number</label><input id="v-phone" className="adm-input" required inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" value={f.phone} onChange={set('phone')} /></div>
            <div><label className="adm-label" htmlFor="v-idt">ID type</label><select id="v-idt" className="adm-select" value={f.idType} onChange={set('idType')}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="adm-label" htmlFor="v-idn">ID number</label><input id="v-idn" className="adm-input" required maxLength={30} value={f.idNumber} onChange={set('idNumber')} /><p className="dl-hint">Sirf manager dekhega.</p></div>
            <div className="dl-full"><label className="adm-label" htmlFor="v-pay">UPI ID / bank details (payment ke liye)</label><input id="v-pay" className="adm-input" required maxLength={200} value={f.payoutDetails} onChange={set('payoutDetails')} /></div>
          </div>

          <div>
            <label className="adm-upload" htmlFor="v-photo">
              {photo || profile.shopPhoto?.url ? 'Change shop photo' : 'Upload a photo of your shop'}
              <small>Dukaan ke bahar ki saaf photo (board ke saath)</small>
              <input id="v-photo" type="file" accept="image/*" onChange={onPhoto} />
            </label>
            {(photo || profile.shopPhoto?.url) && <div className="adm-previews"><img src={photo || profile.shopPhoto.url} alt="Shop" /></div>}
          </div>

          {error && <div className="dl-banner bad" role="alert" style={{ marginBottom: 0 }}><div>{error}</div></div>}
          <button type="submit" className="adm-btn block" style={{ height: 50 }} disabled={busy}>{busy ? 'Sending...' : 'SEND FOR VERIFICATION'}</button>
        </form>
      ) : (
        <div className="adm-card adm-pad">
          <h2 className="adm-card-title">Your details</h2>
          {profile.shopPhoto?.url && <img className="dl-shop" src={profile.shopPhoto.url} alt="Shop" />}
          <Row k="Shop" v={[profile.shopName, profile.shopType].filter(Boolean).join(' · ')} />
          <Row k="Address" v={[profile.shopAddress, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')} />
          <Row k="Owner" v={`${profile.ownerName} · ${profile.phone}`} />
          <Row k="ID" v={`${profile.idType} ${profile.idNumber}`} />
          <Row k="GST" v={profile.gstNumber} />
          <Row k="Payments to" v={profile.payoutDetails} />
        </div>
      )}
    </div>
  );
};

export default Verification;
