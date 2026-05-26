import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Pages
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminResults from './pages/admin/AdminResults';
import AdminViolations from './pages/admin/AdminViolations';
import AdminMonitoring from './pages/admin/AdminMonitoring';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import ExamPage from './pages/employee/ExamPage';
import ResultPage from './pages/employee/ResultPage';
import ExamTerminatedPage from './pages/employee/ExamTerminatedPage';

// Layout
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

const ProtectedRoute = ({ children, role }) => {
  const { user, token, isLoading } = useAuthStore();
  if (isLoading && !user) {
    return <div className="loading-center"><div className="loading-spinner" /></div>;
  }
  if (!token) return <Navigate to="/login" replace />;
  if (role && user && user.role !== role) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  return children;
};

function App() {
  const { fetchMe, token } = useAuthStore();
  useEffect(() => { if (token) fetchMe(); }, [token, fetchMe]);

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#12141f', color: '#f1f5f9', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '14px 18px' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/exam-terminated" element={<ExamTerminatedPage />} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="assessments" element={<AdminAssessments />} />
          <Route path="questions/:assessmentId" element={<AdminQuestions />} />
          <Route path="results" element={<AdminResults />} />
          <Route path="violations" element={<AdminViolations />} />
          <Route path="monitoring" element={<AdminMonitoring />} />
        </Route>

        {/* Employee */}
        <Route path="/dashboard" element={<ProtectedRoute role="employee"><EmployeeLayout /></ProtectedRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="result/:resultId" element={<ResultPage />} />
        </Route>

        {/* Exam - fullscreen mode, no layout */}
        <Route path="/exam/:assessmentId" element={<ProtectedRoute role="employee"><ExamPage /></ProtectedRoute>} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default App;
