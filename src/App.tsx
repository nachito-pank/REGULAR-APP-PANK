import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthForm from './components/Auth/AuthForm';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './components/Admin/Dashboard';
import EmployeeManagement from './components/Admin/EmployeeManagement';
import AttendanceManagement from './components/Admin/AttendanceManagement';
import ReportsManagement from './components/Admin/ReportsManagement';
import Statistics from './components/Admin/Statistics';
import Exports from './components/Admin/Exports';
import Settings from './components/Admin/Settings';
import PunchClock from './components/Employee/PunchClock';
import DailyReport from './components/Employee/DailyReport';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0 lg:ml-0">
          <div className="w-full">
            <Routes>
              {user.role === 'admin' ? (
                <>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/employees" element={<EmployeeManagement />} />
                  <Route path="/attendance" element={<AttendanceManagement />} />
                  <Route path="/reports" element={<ReportsManagement />} />
                  <Route path="/statistics" element={<Statistics />} />
                  <Route path="/exports" element={<Exports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </>
              ) : (
                <>
                  <Route path="/employee-dashboard" element={<div className="p-4 sm:p-6">Tableau de bord Employé - En développement ⌛</div>} />
                  <Route path="/punch-clock" element={<PunchClock />} />
                  <Route path="/daily-report" element={<DailyReport />} />
                  <Route path="/my-reports" element={<div className="p-4 sm:p-6">Mes Rapports - En développement</div>} />
                  <Route path="/" element={<Navigate to="/punch-clock" replace />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;