import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { Menu, Bell, User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps): JSX.Element {
  const { user, logout, isCoordinator } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center">
          <button
            type="button"
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            onClick={onMenuClick}
          >
            <span className="sr-only">Abrir menu</span>
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo for mobile */}
          <div className="lg:hidden ml-2">
            <h1 className="text-xl font-semibold text-gray-900">
              Família Acolhedora
            </h1>
          </div>
        </div>

        {/* Right side - User menu and notifications */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
            >
              <span className="sr-only">Ver notificações</span>
              <Bell className="h-6 w-6" />
              {/* Notification badge */}
              <span className="absolute top-0 right-0 block h-3 w-3 bg-red-400 rounded-full ring-2 ring-white"></span>
            </button>

            {/* Notifications dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Notificações
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          Nova família cadastrada aguardando avaliação
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          2 horas atrás
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-2 w-2 bg-caring-600 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          Relatório mensal vence em 3 dias
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          1 dia atrás
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button className="text-sm text-primary-600 hover:text-primary-500 font-medium">
                      Ver todas as notificações
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center text-sm bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="sr-only">Abrir menu do usuário</span>
              <div className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 rounded-lg">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || 'Usuário'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role === 'coordinator' ? 'Coordenador' : 'Técnico'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </button>

            {/* User dropdown */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">
                      {user?.role === 'coordinator' ? 'Coordenador' : 'Técnico'}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {isCoordinator() && (
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Configurações</span>
                      </button>
                    )}
                    
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(dropdownOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setDropdownOpen(false);
            setNotificationsOpen(false);
          }}
        ></div>
      )}
    </header>
  );
}

export default Header;