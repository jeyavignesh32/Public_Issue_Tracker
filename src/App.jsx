import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import TrackComplaint from './pages/TrackComplaint';
import PublicFeed from './pages/PublicFeed';
import AdminDashboard from './pages/AdminDashboard';
import AdminComplaints from './pages/AdminComplaints';
import WorkerDashboard from './pages/WorkerDashboard';

function ProtectedRoute({ children, roles }) {
  const { user, isLoggedIn, loading } = useAuth();
  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { isLoggedIn, user } = useAuth();
  return (
    <>
      <div className="bg-gradient-orb orb-blue" />
      <div className="bg-gradient-orb orb-orange" />
      <div className="bg-gradient-orb orb-purple" />
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<PublicFeed />} />
        <Route path="/login" element={!isLoggedIn ? <Login /> : <Navigate to={getDashboard(user?.role)} />} />
        <Route path="/register" element={!isLoggedIn ? <Register /> : <Navigate to={getDashboard(user?.role)} />} />

        {/* User */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['user']}><UserDashboard /></ProtectedRoute>} />
        <Route path="/submit" element={<ProtectedRoute roles={['user']}><SubmitComplaint /></ProtectedRoute>} />
        <Route path="/complaints/:id" element={<ProtectedRoute><TrackComplaint /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute roles={['admin']}><AdminComplaints /></ProtectedRoute>} />

        {/* Worker */}
        <Route path="/worker" element={<ProtectedRoute roles={['worker']}><WorkerDashboard /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function getDashboard(role) {
  if (role === 'admin') return '/admin';
  if (role === 'worker') return '/worker';
  return '/dashboard';
}

export default function App() {
  return (
    <CopilotKit publicApiKey="ck_pub_d0b2fbd6292060a9bed8be96f2d94221">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
      <CopilotPopup
        instructions="You are the CivicTrack AI assistant. Help users report civic issues, track complaint statuses, and give guidance on how to provide accurate location details and photo proof."
        labels={{
          title: "CivicTrack AI",
          initial: "Hello! I am the CivicTrack Assistant. Need help writing a complaint or tracking an issue?"
        }}
      />
    </CopilotKit>
  );
}
