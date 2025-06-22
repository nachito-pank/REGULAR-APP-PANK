import React, { useState } from 'react';
import { LogOut, Building2, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header: React.FC = () => {
  const { user, company, signOut } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        {/* Logo and Company Info */}
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">PANK</h1>
          </div>
          <div className="hidden sm:block h-6 w-px bg-gray-300" />
          <div className="hidden sm:block min-w-0">
            <p className="text-sm text-gray-600 truncate">{company?.name}</p>
            <p className="text-xs text-gray-500 truncate">ID: {company?.company_id}</p>
          </div>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden sm:flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900 truncate max-w-32">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Déconnexion</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="sm:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="sm:hidden bg-white border-t border-gray-200 px-4 py-3">
          <div className="space-y-3">
            {/* Company Info on Mobile */}
            <div className="pb-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{company?.name}</p>
              <p className="text-xs text-gray-500">ID: {company?.company_id}</p>
            </div>
            
            {/* User Info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={() => {
                  signOut();
                  setShowMobileMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;