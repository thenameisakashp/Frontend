import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Browse from './pages/Browse';
import ItemDetails from './pages/ItemDetails';
import ReportLost from './pages/ReportLost';
import LostRequestsPage from './pages/LostRequestsPage';
import Claims from './pages/Claims';
import StaffAdd from './pages/StaffAdd';
import AdminDashboard from './pages/AdminDashboard';
import { useAuth } from './context/AuthContext';

function Guard({ children, requiredRole = null, disallowRole = null }) {
  const { isAuthenticated, profile } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRole && profile?.role !== requiredRole) {
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile?.role === 'office_staff') return <Navigate to="/staff/add" replace />;
    return <Navigate to="/" replace />;
  }

  if (disallowRole && profile?.role === disallowRole) {
    if (profile?.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
}

function HomeRoute() {
  return <Dashboard />;
}

export default function App() {
  const { isAuthenticated, profile } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={profile?.role === 'admin' ? '/admin' : '/'} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        {/* Home: Redirects Admin to /admin, others to Lost & Found Dashboard */}
        <Route index element={<HomeRoute />} />

        {/* Students & Staff browse found items */}
        <Route path="browse" element={<Browse />} />
        <Route path="items/:id" element={<ItemDetails />} />

        {/* Non-admin report lost item (spec: non-admin) */}
        <Route
          path="lost/report"
          element={
            <Guard disallowRole="admin">
              <ReportLost />
            </Guard>
          }
        />

        {/* Non-admin lost requests */}
        <Route path="lost-requests" element={<LostRequestsPage />} />

        {/* Claims tracking (staff & admin see all, students see their own) */}
        <Route path="claims" element={<Claims />} />

        {/* Office Staff post found items */}
        <Route
          path="staff/add"
          element={
            <Guard requiredRole="office_staff">
              <StaffAdd />
            </Guard>
          }
        />

        {/* Admin Dashboard & Management */}
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/overview" element={<AdminDashboard />} />
        <Route path="admin/users" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
