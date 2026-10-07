import heroImg from '../../assets/hero.png';
import vaccineIllustration from '../../assets/vaccine-illustration.png';
import './LandingPage.css';

function LandingIcon({ name, size = 24 }) {
  const paths = {
    shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z" /><path d="M12 8v8m-4-4h8" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="m9.5 15 1.7 1.7 3.5-3.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /><path d="m8 15 2.2 2.2L16 12" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /><path d="m9 12 2 2 4-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="m9 5 7 7-7 7" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <a className="landing-brand" href="#trang-chu" aria-label="Tiêm chủng Care - về đầu trang">
      <span className="landing-brand-mark"><LandingIcon name="shield" size={31} /></span>
      <span className="landing-brand-name">TIÊM CHỦNG<strong>CARE</strong></span>
    </a>
  );
}

const benefits = [
  {
    icon: 'lock',
    title: 'An toàn',
    description: 'Thông tin tiêm chủng được quản lý tập trung, rõ ràng và thuận tiện tra cứu.',
  },
  {
    icon: 'calendar',
    title: 'Chủ động',
    description: 'Dễ dàng theo dõi lịch hẹn và lịch sử tiêm của bạn cùng người thân.',
  },
  {
    icon: 'bell',
    title: 'Nhắc lịch tự động',
    description: 'Hỗ trợ nhắc lịch tiêm và mũi tiếp theo để bạn không bỏ lỡ thời điểm quan trọng.',
  },
];

export default function LandingPage({ onLogin, onRegister, onVaccinationCta }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Brand />
          <nav className="landing-nav" aria-label="Điều hướng trang chủ">
            <a href="#trang-chu">Trang chủ</a>
            <a href="#vac-xin">Vắc xin</a>
            <a href="#gioi-thieu">Giới thiệu</a>
          </nav>
          <div className="landing-header-actions">
            <button className="landing-login-button" type="button" onClick={onLogin}>Đăng nhập</button>
            <button className="landing-button landing-button-small" type="button" onClick={onRegister}>Đăng ký</button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" id="trang-chu">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-content">
              <p className="landing-eyebrow"><span><LandingIcon name="shield" size={17} /></span> Chăm sóc sức khỏe chủ động</p>
              <h1>Chủ động bảo vệ sức khỏe với lịch tiêm thông minh</h1>
              <p className="landing-hero-description">Quản lý hồ sơ tiêm chủng, đăng ký lịch tiêm và nhận nhắc lịch tự động trên một hệ thống duy nhất.</p>
              <div className="landing-hero-actions">
                <button className="landing-button" type="button" onClick={onVaccinationCta}>Đăng ký tiêm <LandingIcon name="arrow" size={18} /></button>
                <button className="landing-button landing-button-secondary" type="button" onClick={onRegister}>Đăng ký tài khoản</button>
              </div>
              <p className="landing-hero-note"><LandingIcon name="check" size={17} /> An toàn · Chủ động · Thuận tiện</p>
            </div>

            <figure className="landing-hero-visual">
              <img src={heroImg} alt="Nhân viên y tế thực hiện tiêm chủng an toàn cho trẻ em" />
              <figcaption><span><LandingIcon name="bell" size={21} /></span><strong>Nhắc lịch tự động</strong><small>Đồng hành cùng mỗi mũi tiêm</small></figcaption>
            </figure>
          </div>
        </section>

        <section className="landing-section landing-benefits" aria-labelledby="landing-benefits-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-section-label">LỢI ÍCH NỔI BẬT</p>
              <h2 id="landing-benefits-title">Tại sao chọn Tiêm chủng CARE?</h2>
              <p>Một nơi để bạn quản lý hành trình tiêm chủng đơn giản và chủ động hơn.</p>
            </div>
            <div className="landing-benefit-grid">
              {benefits.map((benefit) => (
                <article className="landing-benefit-card" key={benefit.title}>
                  <span className="landing-feature-icon"><LandingIcon name={benefit.icon} size={27} /></span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section landing-vaccine" id="vac-xin" aria-labelledby="landing-vaccine-title">
          <div className="landing-container landing-vaccine-panel">
            <div className="landing-vaccine-content">
              <p className="landing-section-label">THÔNG TIN VẮC XIN</p>
              <h2 id="landing-vaccine-title">Thông tin vắc xin</h2>
              <p>Hệ thống hỗ trợ quản lý thông tin vắc xin và phác đồ tiêm chủng. Đăng nhập để xem danh sách vắc xin và thông tin chi tiết.</p>
              <button className="landing-button" type="button" onClick={onLogin}>Đăng nhập để xem <LandingIcon name="arrow" size={18} /></button>
            </div>
            <figure className="landing-vaccine-visual">
              <img src={vaccineIllustration} alt="Minh họa lọ vắc xin và dụng cụ tiêm chủng trong môi trường y tế" />
            </figure>
          </div>
        </section>

        <section className="landing-section landing-about" id="gioi-thieu" aria-labelledby="landing-about-title">
          <div className="landing-container landing-about-grid">
            <div className="landing-about-copy">
              <p className="landing-section-label">VỀ CHÚNG TÔI</p>
              <h2 id="landing-about-title">Về Tiêm chủng CARE</h2>
              <p>Hệ thống hỗ trợ người dùng chủ động theo dõi thông tin tiêm chủng, đồng thời giúp hoạt động quản lý được thống nhất và thuận tiện.</p>
            </div>
            <ul className="landing-about-list">
              {['Quản lý hồ sơ người tiêm', 'Đăng ký lịch tiêm', 'Theo dõi lịch sử tiêm', 'Quản lý vắc xin', 'Nhắc lịch tự động'].map((item) => (
                <li key={item}><span><LandingIcon name="check" size={16} /></span>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-container landing-cta-inner">
            <div>
              <p className="landing-section-label">BẮT ĐẦU NGAY HÔM NAY</p>
              <h2 id="landing-cta-title">Chủ động lịch tiêm ngay hôm nay</h2>
              <p>Tạo tài khoản để quản lý hồ sơ và theo dõi hành trình tiêm chủng thuận tiện hơn.</p>
            </div>
            <div className="landing-cta-actions">
              <button className="landing-button landing-button-light" type="button" onClick={onRegister}>Đăng ký tài khoản</button>
              <button className="landing-button landing-button-outline-light" type="button" onClick={onLogin}>Đăng nhập</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-inner">
          <div><Brand /><p>Hệ thống quản lý và nhắc lịch tiêm chủng tự động.</p><p className="landing-footer-note">Hệ thống được xây dựng phục vụ mục đích học tập và nghiên cứu.</p></div>
          <p className="landing-footer-tagline">An toàn <span>•</span> Chủ động <span>•</span> Vì sức khỏe cộng đồng</p>
        </div>
      </footer>
    </div>
  );
}
