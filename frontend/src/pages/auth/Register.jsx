import { useState } from 'react';
import heroImg from '../../assets/hero.png';
import { registerCustomer } from '../../services/authService';
import './Register.css';

function RegisterIcon({ name }) {
  const paths = {
    shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" /><path d="M12 8v8m-4-4h8" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    email: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7L22 6" /></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L9 11a16 16 0 0 0 4 4l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 2.7 2Z" />,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function RegisterField({ name, label, icon, value, onChange, error, type = 'text', autoComplete, required = false }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const id = `register-${name}`;

  return (
    <div className="register-form-group">
      <label className="register-form-label" htmlFor={id}>{label}{required && <span aria-hidden="true"> *</span>}</label>
      <div className="register-input-wrapper">
        <span className="register-input-icon"><RegisterIcon name={icon} /></span>
        <input id={id} name={name} className="register-form-input" type={isPassword && visible ? 'text' : type} autoComplete={autoComplete} value={value} onChange={onChange} required={required} minLength={isPassword ? 8 : undefined} placeholder={label} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
        {isPassword && <button type="button" className="register-password-toggle" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Ẩn' : 'Hiện'} ${label.toLowerCase()}`} aria-pressed={visible}><RegisterIcon name={visible ? 'eyeOff' : 'eye'} /></button>}
      </div>
      {error && <p id={`${id}-error`} className="register-error" role="alert">{error}</p>}
    </div>
  );
}

function validateRegistration({ fullName, email, password, confirmPassword, agreeTerms }) {
  const errors = {};
  if (!fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên.';
  if (!email.trim()) errors.email = 'Vui lòng nhập email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Email không đúng định dạng.';
  if (password.length < 8) errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (!confirmPassword) errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
  if (!agreeTerms) errors.agreeTerms = 'Vui lòng đồng ý với điều khoản và chính sách bảo mật.';
  return errors;
}

export default function Register({ onLogin, onRegistered }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegistration({ fullName, email, password, confirmPassword, agreeTerms });
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      event.currentTarget.elements.namedItem(firstError)?.focus();
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await registerCustomer({ fullName, email, phone, password });
      onRegistered?.(email.trim());
    } catch (requestError) {
      setSubmitError(requestError.message || 'Không thể đăng ký. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="register-page" style={{ backgroundImage: `url(${heroImg})` }}>
      <div className="register-overlay" aria-hidden="true" />
      <section className="register-card" aria-labelledby="register-title">
        <div className="register-brand"><span className="register-brand-mark"><RegisterIcon name="shield" /></span><span className="register-brand-name">TIÊM CHỦNG<strong>CARE</strong></span></div>
        <header className="register-heading"><h1 id="register-title" className="register-title">ĐĂNG KÝ TÀI KHOẢN</h1><p className="register-subtitle">Tạo tài khoản để đăng ký và theo dõi lịch tiêm chủng</p></header>
        <form className="register-form" onSubmit={handleSubmit} noValidate>
          {submitError && <p className="register-server-error" role="alert">{submitError}</p>}
          <RegisterField name="fullName" label="Họ và tên" icon="user" value={fullName} onChange={(event) => setFullName(event.target.value)} autoComplete="name" required error={errors.fullName} />
          <RegisterField name="email" label="Email" icon="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required error={errors.email} />
          <RegisterField name="phone" label="Số điện thoại" icon="phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
          <RegisterField name="password" label="Mật khẩu" icon="lock" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required error={errors.password} />
          <RegisterField name="confirmPassword" label="Xác nhận mật khẩu" icon="lock" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required error={errors.confirmPassword} />
          <div className="register-terms">
            <label className="register-checkbox-label" htmlFor="register-agreeTerms"><input id="register-agreeTerms" name="agreeTerms" type="checkbox" className="register-checkbox-input" checked={agreeTerms} onChange={(event) => setAgreeTerms(event.target.checked)} required aria-invalid={Boolean(errors.agreeTerms)} aria-describedby={errors.agreeTerms ? 'register-terms-error' : undefined} /><span className="register-checkbox-custom" aria-hidden="true" /><span className="register-checkbox-text">Tôi đồng ý với <span className="register-policy-link">Điều khoản sử dụng</span> và <span className="register-policy-link">Chính sách bảo mật</span></span></label>
            {errors.agreeTerms && <p id="register-terms-error" className="register-error" role="alert">{errors.agreeTerms}</p>}
          </div>
          <button type="submit" className="register-submit" disabled={submitting}>{submitting ? 'Đang đăng ký...' : 'Đăng ký'}</button>
        </form>
        <p className="register-login-hint">Đã có tài khoản?{' '}<button type="button" className="register-login-link" onClick={onLogin}>Đăng nhập</button></p>
      </section>
    </main>
  );
}
