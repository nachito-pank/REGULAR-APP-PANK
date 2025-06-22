import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  FileText, 
  Settings, 
  BarChart3,
  Download,
  CheckCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const adminMenuItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/employees', icon: Users, label: 'Employés' },
    { to: '/attendance', icon: Clock, label: 'Présences' },
    { to: '/reports', icon: FileText, label: 'Rapports' },
    { to: '/statistics', icon: BarChart3, label: 'Statistiques' },
    { to: '/exports', icon: Download, label: 'Exportations' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const employeeMenuItems = [
    { to: '/employee-dashboard', icon: LayoutDashboard, label: 'Mon tableau de bord' },
    { to: '/punch-clock', icon: Clock, label: 'Pointage' },
    { to: '/daily-report', icon: FileText, label: 'Rapport journalier' },
    { to: '/my-reports', icon: CheckCircle, label: 'Mes rapports' },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : employeeMenuItems;

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Menu Button - Fixed Position */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        w-64 h-screen bg-gray-900 text-white
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6">
          <h2 className="text-lg lg:text-xl font-semibold truncate">
            {user?.role === 'admin' ? 'Administration' : 'Espace Employé'}
          </h2>
          <button
            onClick={closeMobileMenu}
            className="lg:hidden p-1 text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-2 lg:mt-6 pb-20 lg:pb-0 overflow-y-auto">
          <ul className="space-y-1 lg:space-y-2 px-3 lg:px-4">
            {menuItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 lg:px-4 py-3 rounded-lg transition-colors text-sm lg:text-base ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;