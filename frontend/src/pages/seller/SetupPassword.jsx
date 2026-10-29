import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { login } from '../../redux/slices/authSlice';
import API from '../../utils/api';
import '../../components/admin/admin.css';
import '../../components/deals/deals.css';

// Email wale link se seller apna password banata hai
const SetupPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    API.get(`/seller/setup/${token}`)
      .then((r) => setInfo(r.data))
      .catch((e) => setError(e.response?.data?.message || 'Could not reach the server'));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error('Password should be minimum 6 characters');
    if (pw !== pw2) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await API.post(`/seller/setup/${token}`, { password: pw });
      // Password set ho gaya: seedha login karke seller panel kholo
      const result = await dispatch(login({ email: info.email, password: pw }));
      if (login.fulfilled.match(result)) {
        toast.success('Welcome! Your seller panel is ready.');
        navigate('/seller', { replace: true });
        return;
      }
      toast.success('Password set. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not set the password');
    }
    setBusy(false);
  };

  return (
    <div className="dl-setup">
      <div className="adm-card">
        {error ? (
          <>
            <h1 className="adm-title" style={{ fontSize: 22 }}>Link not working</h1>
            <p className="adm-sub" style={{ margin: '8px 0 16px' }}>{error}</p>
            <p className="adm-sub" style={{ margin: '0 0 16px' }}>Agar aapne password pehle hi set kar liya hai, to seedha login karo.</p>
            <div className="adm-actions"><Link to="/login" className="adm-btn">Go to login</Link><Link to="/" className="adm-btn ghost">Back to store</Link></div>
          </>
        ) : !info ? (
          <div className="adm-spin-wrap" style={{ minHeight: 160 }}><div className="adm-spin" /></div>
        ) : (
          <>
            <h1 className="adm-title" style={{ fontSize: 24 }}>Welcome, {info.name}</h1>
            <p className="adm-sub" style={{ margin: '6px 0 18px' }}>Set a password for <b>{info.email}</b> to open your seller panel.</p>
            <form className="adm-form" onSubmit={submit}>
              <div>
                <label className="adm-label" htmlFor="sp-pw">New password</label>
                <input id="sp-pw" type="password" className="adm-input" autoComplete="new-password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
              </div>
              <div>
                <label className="adm-label" htmlFor="sp-pw2">Confirm password</label>
                <input id="sp-pw2" type="password" className="adm-input" autoComplete="new-password" minLength={6} required value={pw2} onChange={(e) => setPw2(e.target.value)} />
              </div>
              <button className="adm-btn block" style={{ height: 48 }} disabled={busy}>{busy ? 'Saving...' : 'SET PASSWORD'}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default SetupPassword;
