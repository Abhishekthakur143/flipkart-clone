import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { HiOutlineLockClosed } from 'react-icons/hi';
import API from '../utils/api';
import toast from 'react-hot-toast';
import { AuthShell, Field, Spinner, strengthOf } from '../components/AuthShell';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const strength = strengthOf(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    setBusy(true);
    try {
      await API.put(`/auth/password/reset/${token}`, { password, confirmPassword });
      toast.success('Password Reset Successful');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed');
    }
    setBusy(false);
  };

  return (
    <AuthShell
      heading="Create a new password"
      lead="Choose a strong password you have not used before to keep your account secure."
      title="Reset Password"
      subtitle="Enter and confirm your new password."
      footer={<Link to="/login" className="auth-link">Back to login</Link>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <Field icon={HiOutlineLockClosed} label="New password" type="password" required autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {password && (
          <div className="auth-strength">
            {[0, 1, 2].map((i) => <i key={i} className={i < strength ? `s${strength}` : ''} />)}
          </div>
        )}
        <Field icon={HiOutlineLockClosed} label="Confirm password" type="password" required autoComplete="new-password"
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        <button type="submit" className="auth-btn" disabled={busy}>
          {busy && <Spinner />}{busy ? 'Resetting...' : 'RESET PASSWORD'}
        </button>
      </form>
    </AuthShell>
  );
};

export default ResetPassword;