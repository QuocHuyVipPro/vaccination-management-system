import { useState } from 'react';
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


function App() {
  const [currentPage, setCurrentPage] = useState(() => {
    const preview = new URLSearchParams(window.location.search).get('preview');
    return preview === 'admin' ? 'admin-dashboard' : preview === 'staff' ? 'staff-dashboard' : 'login';
  });
  const navigateAdmin = (page) => {
    if (page === 'logout') setCurrentPage('login');
    else if (['admin-dashboard', 'admin-users', 'admin-vaccines', 'admin-inventory', 'admin-reports'].includes(page)) setCurrentPage(page);
    else console.log('Admin navigation preview:', page);
  };

  const [appointments, setAppointments] = useState(null);
  const [adminUsers, setAdminUsers] = useState(null);
  const [adminVaccines, setAdminVaccines] = useState(null);
  const [inventory, setInventory] = useState(initialInventory);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [staffState, setStaffState] = useState(initialVaccinationState);
  const [staffEntry, setStaffEntry] = useState({ key: 0 });
  const setStaffAppointments = (update) => setStaffState((current) => ({ ...current, appointments: typeof update === 'function' ? update(current.appointments) : update }));
  const navigateStaff = (page, payload) => {
    if (page === 'logout') setCurrentPage('login');
    else if (['staff-vaccination', 'staff-history'].includes(page)) {
      setStaffEntry((current) => ({ ...payload, key: current.key + 1 }));
      setCurrentPage(page);
    }
    else if (['staff-dashboard', 'staff-appointments', 'staff-patients'].includes(page)) setCurrentPage(page);
    else console.log('Staff navigation preview:', page, payload);
  };

  const navigate = (menu) => {
    const pages = { overview: 'dashboard', users: 'profiles', vaccine: 'registration', calendar: 'appointments', history: 'history', bell: 'notifications', logout: 'login' };
    if (pages[menu]) setCurrentPage(pages[menu]);
  };

  // Keep the appointment demo state when switching customer pages.
  return <NotificationContext.Provider value={{ notifications, setNotifications, onOpenNotifications: () => setCurrentPage('notifications') }}>
    {currentPage === 'admin-dashboard' && <AdminDashboard onNavigate={navigateAdmin} />}
    {currentPage === 'admin-users' && <AdminUsers onNavigate={navigateAdmin} users={adminUsers} setUsers={setAdminUsers} />}
    {currentPage === 'admin-vaccines' && <AdminVaccines onNavigate={navigateAdmin} vaccines={adminVaccines} setVaccines={setAdminVaccines} />}
    {currentPage === 'admin-inventory' && <AdminInventory onNavigate={navigateAdmin} vaccines={adminVaccines ?? initialVaccines} inventory={inventory} setInventory={setInventory} />}
    {currentPage === 'admin-reports' && <AdminReports onNavigate={navigateAdmin} />}
    {currentPage === 'staff-dashboard' && <StaffDashboard onNavigate={navigateStaff} />}
    {currentPage === 'staff-patients' && <StaffPatients onNavigate={navigateStaff} />}
    {currentPage === 'staff-history' && <StaffHistory key={staffEntry.key} patientId={staffEntry.patientId} records={staffState.records} onNavigate={navigateStaff} />}
    {currentPage === 'staff-appointments' && <StaffAppointments onNavigate={navigateStaff} appointments={staffState.appointments} setAppointments={setStaffAppointments} />}
    {currentPage === 'staff-vaccination' && <StaffVaccination key={staffEntry.key} entry={staffEntry} state={staffState} onComplete={(draft) => setStaffState((current) => completeVaccination(current, draft))} onNavigate={navigateStaff} />}
    {currentPage === 'notifications' && <Notifications onNavigate={navigate} />}
    {currentPage === 'history' && <VaccinationHistory onNavigate={navigate} />}
    {currentPage === 'appointments' && <Appointments appointments={appointments} setAppointments={setAppointments} onNavigate={navigate} onRegister={() => setCurrentPage('registration')} />}
    {currentPage === 'registration' && <VaccinationRegistration onNavigate={navigate} onOverview={() => setCurrentPage('dashboard')} onAppointments={() => setCurrentPage('appointments')} />}
    {currentPage === 'profiles' && <PatientProfiles onNavigate={navigate} />}
    {currentPage === 'dashboard' && <CustomerDashboard onNavigate={navigate} />}

    {currentPage === 'register' && <Register onLogin={() => setCurrentPage('login')} />}
    {currentPage === 'login' && <Login onRegister={() => setCurrentPage('register')} onLogin={() => setCurrentPage('dashboard')} />}
  </NotificationContext.Provider>;
}

export default App;
