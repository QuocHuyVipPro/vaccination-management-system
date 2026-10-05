import { useState } from 'react';
import heroImg from '../../assets/hero.png';
import './Login.css';

function Login({ onRegister, onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!e.currentTarget.reportValidity()) return;
    onLogin?.();
  };

  return (
    /* ===== Full-screen hero background ===== */
    <main className="login-page" style={{ backgroundImage: `url(${heroImg})` }}>

      {/* Overlay rất nhẹ để card dễ đọc hơn */}
      <div className="login-overlay" aria-hidden="true" />

      {/* ===== Login Card nổi bên phải ===== */}
      <section className="login-card" aria-labelledby="login-title">

        <div className="login-brand">
          <span className="login-brand-mark">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" />
              <path d="M12 8v8m-4-4h8" />
            </svg>
          </span>
          <span className="login-brand-name">TIÊM CHỦNG<strong>CARE</strong></span>
        </div>

        <header className="login-heading">
          <h1 id="login-title" className="login-title">ĐĂNG NHẬP</h1>
          <p className="login-subtitle">Đăng nhập để quản lý lịch tiêm và hồ sơ sức khỏe</p>
        </header>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>

          {/* Email */}
          <div className="login-form-group">
            <label className="login-form-label" htmlFor="email">Email</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                id="email" autoComplete="email"
                type="email"
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                className="login-form-input"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div className="login-form-group">
            <label className="login-form-label" htmlFor="password">Mật khẩu</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                id="password" autoComplete="current-password"
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                className="login-form-input"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-password-toggle" aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? (
                  /* Eye-off icon */
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* Eye icon */
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Ghi nhớ + Quên mật khẩu */}
          <div className="login-form-options">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="login-checkbox-input"
              />
              <span className="login-checkbox-custom" aria-hidden="true" />
              <span className="login-checkbox-text">Ghi nhớ đăng nhập</span>
            </label>
            <button type="button" className="login-forgot-link">
              Quên mật khẩu?
            </button>
          </div>

          {/* Nút đăng nhập */}
          <button type="submit" className="login-submit">
            Đăng nhập
          </button>

        </form>

        {/* Đăng ký */}
        <p className="login-register-hint">
          Chưa có tài khoản?{' '}
          <button type="button" className="login-register-link" onClick={onRegister}>
            Đăng ký ngay
          </button>
        </p>

        <p className="login-tagline">An toàn · Chủ động · Vì sức khỏe cộng đồng</p>
      </section>
    </main>
  );
}

export default Login;
