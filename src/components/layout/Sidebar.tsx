import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { 
  Home, 
  Users, 
  Baby, 
  GitMerge, 
  DollarSign, 
  FileText, 
  Bell, 
  Settings, 
  Heart,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: string;
  roles?: ('coordinator' | 'technician')[];
}

const navigation: NavigationItem[] = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: Home 
  },
  { 
    name: 'Famílias', 
    href: '/families', 
    icon: Users 
  },
  { 
    name: 'Crianças', 
    href: '/children', 
    icon: Baby 
  },
  { 
    name: 'Matching', 
    href: '/matching', 
    icon: GitMerge 
  },
  { 
    name: 'Orçamento', 
    href: '/budget', 
    icon: DollarSign,
    permission: 'budget:read',
    roles: ['coordinator']
  },
  { 
    name: 'Relatórios', 
    href: '/reports', 
    icon: FileText 
  },
  { 
    name: 'Notificações', 
    href: '/notifications', 
    icon: Bell 
  },
  { 
    name: 'Configurações', 
    href: '/settings', 
    icon: Settings,
    permission: 'settings:read',
    roles: ['coordinator']
  },
];

function Sidebar({ isOpen, onClose }: SidebarProps): JSX.Element {
  const { user, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  const isItemVisible = (item: NavigationItem): boolean => {
    // Check role restriction
    if (item.roles && !item.roles.some(role => hasRole(role))) {
      return false;
    }

    // Check permission
    if (item.permission && !hasPermission(item.permission as any)) {
      return false;
    }

    return true;
  };

  const isItemActive = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-primary-600" fill="currentColor" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">
                  Família Acolhedora
                </h1>
                <p className="text-xs text-gray-500">
                  Sistema de Gestão
                </p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="mt-6 px-6">
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role === 'coordinator' ? 'Coordenador' : 'Técnico'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4 space-y-1">
            {navigation.map((item) => {
              if (!isItemVisible(item)) return null;

              const Icon = item.icon;
              const isActive = isItemActive(item.href);

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive
                        ? 'text-primary-600'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>Versão 1.0.0</p>
              <p className="mt-1">© 2024 Família Acolhedora</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <Heart className="h-6 w-6 text-primary-600" fill="currentColor" />
              <h1 className="ml-2 text-lg font-bold text-gray-900">
                Família Acolhedora
              </h1>
            </div>
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4">
            <div className="bg-primary-50 rounded-lg p-3">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role === 'coordinator' ? 'Coordenador' : 'Técnico'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1">
            {navigation.map((item) => {
              if (!isItemVisible(item)) return null;

              const Icon = item.icon;
              const isActive = isItemActive(item.href);

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 flex-shrink-0 h-5 w-5 ${
                      isActive
                        ? 'text-primary-600'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              <p>Versão 1.0.0</p>
              <p className="mt-1">© 2024 Família Acolhedora</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;