import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login, clearErrors } from '../redux/slices/authSlice';
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { AuthShell, Field, Spinner } from '../components/AuthShell';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const result = await dispatch(login({ email, password }));
    setBusy(false);
    if (login.fulfilled.match(result)) {
      toast.success('Login Successful');
      navigate('/');
    } else {
      toast.error(result.payload || 'Login failed');
      dispatch(clearErrors());
    }
  };

  return (
    <AuthShell
      heading="Welcome back"
      lead="Sign in to see your orders, wishlist and recommendations picked just for you."
      title="Login"
      subtitle="Enter your email and password to continue."
      footer={<>New to Flipkart? <Link to="/register" className="auth-link">Create an account</Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <Field icon={HiOutlineMail} label="Email address" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field icon={HiOutlineLockClosed} label="Password" type="password" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="auth-row">
          <span />
          <Link to="/forgot-password-otp" className="auth-link">Forgot password?</Link>
        </div>
        <p className="auth-terms">By continuing, you agree to Flipkart's Terms of Use and Privacy Policy.</p>
        <button type="submit" className="auth-btn" disabled={busy}>
          {busy && <Spinner />}{busy ? 'Signing in...' : 'Login'}
        </button>
        <div className="auth-or">OR</div>
        <button type="button" className="auth-btn ghost" onClick={() => navigate('/login-otp')}>
          Login with OTP
        </button>
      </form>
    </AuthShell>
  );
};

export default Login;
