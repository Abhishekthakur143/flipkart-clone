import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { register } from '../redux/slices/authSlice';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { AuthShell, Field, Spinner } from '../components/AuthShell';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await dispatch(register({ name, email, password }));
    setBusy(false);
    if (register.fulfilled.match(result)) {
      toast.success('Registration Successful! Please verify your email.');
      navigate('/verify-email');
    } else {
      toast.error(result.payload || 'Registration failed');
    }
  };

  return (
    <AuthShell
      heading="Join Flipkart"
      lead="Create your account to track orders, save your wishlist and get offers made for you."
      title="Sign up"
      subtitle="We do not share your personal details with anyone."
      footer={<>Existing user? <Link to="/login" className="auth-link">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <Field icon={HiOutlineUser} label="Full name" type="text" required autoComplete="name"
          value={name} onChange={(e) => setName(e.target.value)} />
        <Field icon={HiOutlineMail} label="Email address" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field icon={HiOutlineLockClosed} label="Password" type="password" required autoComplete="new-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="auth-terms">By continuing, you agree to Flipkart's Terms of Use and Privacy Policy.</p>
        <button type="submit" className="auth-btn" disabled={busy}>
          {busy && <Spinner />}{busy ? 'Creating account...' : 'Continue'}
        </button>
      </form>
    </AuthShell>
  );
};

export default Register;