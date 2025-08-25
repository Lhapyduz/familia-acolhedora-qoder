import React from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import type { Permission } from '../../types/index.js';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: Permission[];
  redirectTo?: string;
}

function ProtectedRoute({ 
  children, 
  permissions = [], 
  redirectTo = '/login' 
}: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading, checkPermissions, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check permissions if specified
  if (permissions.length > 0 && !checkPermissions(permissions)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Acesso Negado
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Usuário: {user?.name} ({user?.role})
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
}

export default ProtectedRoute;