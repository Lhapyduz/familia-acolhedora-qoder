import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/index.js';
import type { 
  User, 
  LoginCredentials, 
  Permission 
} from '../types/index.js';

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Auth actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

// Auth context interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (role: User['role']) => boolean;
  clearError: () => void;
  checkPermissions: (permissions: Permission[]) => boolean;
  isCoordinator: () => boolean;
  isTechnician: () => boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize authentication state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        dispatch({ type: 'AUTH_SUCCESS', payload: currentUser });
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const authResponse = await authService.login(credentials);
      
      dispatch({ type: 'AUTH_SUCCESS', payload: authResponse.user });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      dispatch({ type: 'AUTH_LOGOUT' });
    } catch (error) {
      console.error('Logout failed:', error);
      // Force logout even if service call fails
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!state.user) return false;
    return state.user.permissions.includes(permission);
  };

  const hasRole = (role: User['role']): boolean => {
    if (!state.user) return false;
    return state.user.role === role;
  };

  const checkPermissions = (permissions: Permission[]): boolean => {
    if (!state.user) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  const isCoordinator = (): boolean => {
    return hasRole('coordinator');
  };

  const isTechnician = (): boolean => {
    return hasRole('technician');
  };

  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const contextValue: AuthContextType = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    login,
    logout,
    hasPermission,
    hasRole,
    clearError,
    checkPermissions,
    isCoordinator,
    isTechnician,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Hook for permission checking
export function usePermissions() {
  const { hasPermission, checkPermissions, hasRole } = useAuth();
  
  return {
    hasPermission,
    checkPermissions,
    hasRole,
    canRead: (resource: string) => hasPermission(`${resource}:read` as Permission),
    canWrite: (resource: string) => hasPermission(`${resource}:write` as Permission),
    canDelete: (resource: string) => hasPermission(`${resource}:delete` as Permission),
  };
}

// Higher-order component for permission-based rendering
interface WithPermissionProps {
  permission?: Permission;
  permissions?: Permission[];
  role?: User['role'];
  fallback?: ReactNode;
  children: ReactNode;
}

export function WithPermission({ 
  permission, 
  permissions, 
  role, 
  fallback = null, 
  children 
}: WithPermissionProps): JSX.Element | null {
  const { hasPermission, checkPermissions, hasRole } = useAuth();

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = checkPermissions(permissions);
  } else if (role) {
    hasAccess = hasRole(role);
  }

  if (!hasAccess) {
    return fallback as JSX.Element;
  }

  return children as JSX.Element;
}

export default AuthContext;