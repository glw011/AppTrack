import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Applications from '@/pages/Applications';
import NewApplication from '@/pages/NewApplication';
import ApplicationDetail from '@/pages/ApplicationDetail';
import Companies from '@/pages/Companies';
import CompanyDetail from '@/pages/CompanyDetail';
import Contacts from '@/pages/Contacts';
import Resumes from '@/pages/Resumes';
import Reminders from '@/pages/Reminders';
import Pipeline from '@/pages/Pipeline';
import PipelineProfile from '@/pages/PipelineProfile';
import Review from '@/pages/Review';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.token);
  if(!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return(
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/review/:applicationId" element={<Review />} />

      {/* Protected */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/new" element={<NewApplication />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetail />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/resumes" element={<Resumes />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/pipeline/profile" element={<PipelineProfile />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
