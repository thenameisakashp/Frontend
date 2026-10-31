import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Mail, KeyRound, ArrowRight, ShieldCheck, Info, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]               = useState('');

  const goToRole = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'office_staff') navigate('/staff/add');
    else navigate('/');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login(email.trim(), password.trim(), isAdminLogin);
      goToRole(user.role);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left Art Column */}
      <div className="login-art">
        <div className="art-brand">
          <div className="art-brand-icon"><Search size={22} strokeWidth={2.8} /></div>
          <span>FindIt</span>
        </div>
        <div className="art-copy">
          <span className="eyebrow light">CAMPUS LOST &amp; FOUND</span>
          <h1>Lost something?<br /><em>Found your way.</em></h1>
          <p>
            Connect as <b>Admin</b>, <b>Office Staff</b>, or <b>Student</b>.
            Post found items, claim lost belongings, and coordinate return handoffs.
          </p>
          <div className="art-stats">
            <div><b>01</b><span>Admin Provisions Users</span></div>
            <div><b>02</b><span>Office Staff Posts Items</span></div>
            <div><b>03</b><span>Students Claim Items</span></div>
          </div>
        </div>
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
      </div>

      {/* Right Form Column */}
      <div className="login-panel">
        <div className="login-box">
          <div className="mobile-brand">
            <Search size={20} className="brand-blue" /><span>FindIt</span>
          </div>

          <span className="eyebrow">SECURE ACCESS</span>
          <h2>Campus Member Sign In</h2>
          <p className="muted">
            Enter your campus email and OTP (provided by Admin) to access your portal.
          </p>

          <form onSubmit={handleLoginSubmit}>
            <label className="login-field-label">Campus Email Address</label>
            <div className="input-wrap">
              <Mail size={18} />
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. you@team18.com"
                autoComplete="email"
              />
            </div>

            <label className="login-field-label">OTP / Password</label>
            <div className="input-wrap">
              <KeyRound size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your OTP (from Admin)"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer',
                         color: 'var(--text-muted)', padding: '0 4px' }}
                title={showPassword ? 'Hide' : 'Show'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Admin checkbox */}
            <label className="check-row">
              <input
                type="checkbox"
                checked={isAdminLogin}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsAdminLogin(checked);
                  if (checked) {
                    setEmail('admin@team18.com');
                    setPassword('');
                  }
                }}
              />
              <span>Sign in as Primary Admin (admin@team18.com)</span>
            </label>

            {error && <div className="alert error">{error}</div>}

            <button type="submit" className="btn primary full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In to FindIt'} <ArrowRight size={18} />
            </button>
          </form>

          {/* Info notice */}
          <div style={{
            margin: '16px 0 14px', padding: '10px 12px',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 8, display: 'flex', alignItems: 'center',
            gap: 8, fontSize: 11, color: 'var(--text-muted)',
          }}>
            <Info size={15} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} />
            <span>
              Accounts &amp; OTPs are provisioned by <b>Primary Admin</b>.
              Contact your admin if you need credentials.
            </span>
          </div>

          <div className="secure-note">
            <ShieldCheck size={16} /> Authenticated campus access via{' '}
            campus-os-backend-8sjf.onrender.com
          </div>
        </div>
      </div>
    </div>
  );
}
