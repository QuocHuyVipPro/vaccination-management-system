import { useEffect, useState } from 'react';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import PatientProfiles from './pages/customer/PatientProfiles';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import VaccinationRegistration from './pages/customer/VaccinationRegistration';
import Appointments from './pages/customer/Appointments';
import VaccinationHistory from './pages/customer/VaccinationHistory';
import Notifications from './pages/customer/Notifications';
import { NotificationContext, initialNotifications } from './pages/customer/notificationState';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffAppointments from './pages/staff/StaffAppointments';
import StaffPatients from './pages/staff/StaffPatients';
import StaffVaccination from './pages/staff/StaffVaccination';
import StaffHistory from './pages/staff/StaffHistory';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminVaccines from './pages/admin/AdminVaccines';
import AdminInventory from './pages/admin/AdminInventory';
import AdminReports from './pages/admin/AdminReports';
import { initialVaccines } from './pages/admin/adminVaccineData';
import { initialInventory } from './pages/admin/inventoryState';
import { initialVaccinationState, completeVaccination } from './pages/staff/vaccinationState';
import { AUTH_ROLES, clearSession, restoreSession } from './services/authService';


const roleHomePages = {
  [AUTH_ROLES.CUSTOMER]: 'dashboard',
  [AUTH_ROLES.STAFF]: 'staff-dashboard',
  [AUTH_ROLES.ADMIN]: 'admin-dashboard',
};

const rolePages = {
  [AUTH_ROLES.CUSTOMER]: new Set([
    'dashboard', 'profiles', 'registration', 'appointments', 'history', 'notifications',
  ]),
  [AUTH_ROLES.STAFF]: new Set([
    'staff-dashboard', 'staff-appointments', 'staff-patients', 'staff-vaccination', 'staff-history',
  ]),
  [AUTH_ROLES.ADMIN]: new Set([
    'admin-dashboard', 'admin-users', 'admin-vaccines', 'admin-inventory', 'admin-reports',
  ]),
};

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginNotice, setLoginNotice] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [appointments, setAppointments] = useState(null);
  const [adminUsers, setAdminUsers] = useState(null);
  const [adminVaccines, setAdminVaccines] = useState(null);
  const [inventory, setInventory] = useState(initialInventory);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [staffState, setStaffState] = useState(initialVaccinationState);
  const [staffEntry, setStaffEntry] = useState({ key: 0 });

  useEffect(() => {
    let active = true;
    restoreSession()
      .then((user) => {
        if (!active) return;
        if (user && roleHomePages[user.vai_tro]) {
          setCurrentUser(user);
          setCurrentPage(roleHomePages[user.vai_tro]);
        } else {
          setCurrentUser(null);
          setCurrentPage('login');
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleLogin = (user) => {
    const homePage = roleHomePages[user?.vai_tro];
    if (!homePage) {
      clearSession();
      setCurrentUser(null);
      setCurrentPage('login');
      return;
    }
    setLoginNotice('');
    setRegisteredEmail('');
    setCurrentUser(user);
    setCurrentPage(homePage);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setCurrentPage('login');
    setLoginNotice('');
    setRegisteredEmail('');
  };

  const handleRegistered = (email) => {
    setRegisteredEmail(email);
    setLoginNotice('Đăng ký thành công. Vui lòng đăng nhập bằng tài khoản vừa tạo.');
    setCurrentPage('login');
  };

  const navigateForRole = (page) => {
    if (page === 'logout') {
      handleLogout();
      return;
    }
    if (rolePages[currentUser?.vai_tro]?.has(page)) setCurrentPage(page);
  };

  const navigateAdmin = (page) => navigateForRole(page);
  const setStaffAppointments = (update) => setStaffState((current) => ({
    ...current,
    appointments: typeof update === 'function' ? update(current.appointments) : update,
  }));
  const navigateStaff = (page, payload) => {
    if (page === 'logout') {
      handleLogout();
    } else if (['staff-vaccination', 'staff-history'].includes(page)) {
      if (!rolePages[currentUser?.vai_tro]?.has(page)) return;
      setStaffEntry((current) => ({ ...payload, key: current.key + 1 }));
      setCurrentPage(page);
    } else {
      navigateForRole(page);
    }
  };
  const navigateCustomer = (menu) => {
    const pages = {
      overview: 'dashboard',
      users: 'profiles',
      vaccine: 'registration',
      calendar: 'appointments',
      history: 'history',
      bell: 'notifications',
      logout: 'logout',
    };
    if (pages[menu]) navigateForRole(pages[menu]);
  };

  if (authLoading) {
    return <main className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập...</main>;
  }

  if (!currentUser) {
    if (currentPage === 'register') {
      return <Register onLogin={() => setCurrentPage('login')} onRegistered={handleRegistered} />;
    }
    return (
      <Login
        initialEmail={registeredEmail}
        successMessage={loginNotice}
        onRegister={() => { setLoginNotice(''); setCurrentPage('register'); }}
        onLogin={handleLogin}
      />
    );
  }

  const allowedPage = rolePages[currentUser.vai_tro]?.has(currentPage)
    ? currentPage
    : roleHomePages[currentUser.vai_tro];

  return <NotificationContext.Provider value={{ notifications, setNotifications, onOpenNotifications: () => navigateForRole('notifications') }}>
    {allowedPage === 'admin-dashboard' && <AdminDashboard onNavigate={navigateAdmin} />}
    {allowedPage === 'admin-users' && <AdminUsers onNavigate={navigateAdmin} users={adminUsers} setUsers={setAdminUsers} />}
    {allowedPage === 'admin-vaccines' && <AdminVaccines onNavigate={navigateAdmin} vaccines={adminVaccines} setVaccines={setAdminVaccines} />}
    {allowedPage === 'admin-inventory' && <AdminInventory onNavigate={navigateAdmin} vaccines={adminVaccines ?? initialVaccines} inventory={inventory} setInventory={setInventory} />}
    {allowedPage === 'admin-reports' && <AdminReports onNavigate={navigateAdmin} />}
    {allowedPage === 'staff-dashboard' && <StaffDashboard onNavigate={navigateStaff} />}
    {allowedPage === 'staff-patients' && <StaffPatients onNavigate={navigateStaff} />}
    {allowedPage === 'staff-history' && <StaffHistory key={staffEntry.key} patientId={staffEntry.patientId} records={staffState.records} onNavigate={navigateStaff} />}
    {allowedPage === 'staff-appointments' && <StaffAppointments onNavigate={navigateStaff} appointments={staffState.appointments} setAppointments={setStaffAppointments} />}
    {allowedPage === 'staff-vaccination' && <StaffVaccination key={staffEntry.key} entry={staffEntry} state={staffState} onComplete={(draft) => setStaffState((current) => completeVaccination(current, draft))} onNavigate={navigateStaff} />}
    {allowedPage === 'notifications' && <Notifications onNavigate={navigateCustomer} />}
    {allowedPage === 'history' && <VaccinationHistory onNavigate={navigateCustomer} />}
    {allowedPage === 'appointments' && <Appointments appointments={appointments} setAppointments={setAppointments} onNavigate={navigateCustomer} onRegister={() => navigateForRole('registration')} />}
    {allowedPage === 'registration' && <VaccinationRegistration onNavigate={navigateCustomer} onOverview={() => navigateForRole('dashboard')} onAppointments={() => navigateForRole('appointments')} />}
    {allowedPage === 'profiles' && <PatientProfiles onNavigate={navigateCustomer} />}
    {allowedPage === 'dashboard' && <CustomerDashboard onNavigate={navigateCustomer} />}
  </NotificationContext.Provider>;
}

export default App;
