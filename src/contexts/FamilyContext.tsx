import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import { familyService } from '../services/index.js';
import type {
  Family,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  FamilyStatus,
  FamilyFilters,
  EntityId,
  PaginatedResponse,
  QueryOptions
} from '../types/index.js';

// Family state interface
interface FamilyState {
  families: Family[];
  selectedFamily: Family | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Family actions
type FamilyAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FAMILIES'; payload: PaginatedResponse<Family> }
  | { type: 'ADD_FAMILY'; payload: Family }
  | { type: 'UPDATE_FAMILY'; payload: Family }
  | { type: 'DELETE_FAMILY'; payload: EntityId }
  | { type: 'SET_SELECTED_FAMILY'; payload: Family | null }
  | { type: 'CLEAR_ERROR' };

// Family context interface
interface FamilyContextType {
  families: Family[];
  selectedFamily: Family | null;
  isLoading: boolean;
  error: string | null;
  pagination: FamilyState['pagination'];
  loadFamilies: (options?: QueryOptions) => Promise<void>;
  getFamilyById: (id: EntityId) => Promise<Family | null>;
  createFamily: (familyData: CreateFamilyRequest) => Promise<Family>;
  updateFamily: (id: EntityId, updates: UpdateFamilyRequest) => Promise<Family>;
  deleteFamily: (id: EntityId) => Promise<boolean>;
  setSelectedFamily: (family: Family | null) => void;
  updateFamilyStatus: (id: EntityId, status: FamilyStatus) => Promise<Family>;
  searchFamilies: (filters: FamilyFilters) => Promise<Family[]>;
  clearError: () => void;
  refreshFamilies: () => Promise<void>;
}

// Initial state
const initialState: FamilyState = {
  families: [],
  selectedFamily: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  }
};

// Family reducer
function familyReducer(state: FamilyState, action: FamilyAction): FamilyState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };

    case 'SET_FAMILIES':
      return {
        ...state,
        families: action.payload.data,
        pagination: {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages
        },
        isLoading: false,
        error: null
      };

    case 'ADD_FAMILY':
      return {
        ...state,
        families: [action.payload, ...state.families],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1
        },
        isLoading: false,
        error: null
      };

    case 'UPDATE_FAMILY':
      return {
        ...state,
        families: state.families.map(family =>
          family.id === action.payload.id ? action.payload : family
        ),
        selectedFamily: state.selectedFamily?.id === action.payload.id
          ? action.payload
          : state.selectedFamily,
        isLoading: false,
        error: null
      };

    case 'DELETE_FAMILY':
      return {
        ...state,
        families: state.families.filter(family => family.id !== action.payload),
        selectedFamily: state.selectedFamily?.id === action.payload
          ? null
          : state.selectedFamily,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1)
        },
        isLoading: false,
        error: null
      };

    case 'SET_SELECTED_FAMILY':
      return {
        ...state,
        selectedFamily: action.payload
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// Create context
const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

// Family provider props
interface FamilyProviderProps {
  children: ReactNode;
}

// Family provider component
export function FamilyProvider({ children }: FamilyProviderProps) {
  const [state, dispatch] = useReducer(familyReducer, initialState);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    console.error(defaultMessage, error);
  }, []);

  const loadFamilies = useCallback(async (options: QueryOptions = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await familyService.list(options);
      dispatch({ type: 'SET_FAMILIES', payload: response });
    } catch (error) {
      handleError(error, 'Failed to load families');
    }
  }, [handleError]);

  const getFamilyById = useCallback(async (id: EntityId): Promise<Family | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const family = await familyService.getById(id);
      dispatch({ type: 'SET_LOADING', payload: false });
      return family;
    } catch (error) {
      handleError(error, `Failed to get family with id ${id}`);
      return null;
    }
  }, [handleError]);

  const createFamily = useCallback(async (familyData: CreateFamilyRequest): Promise<Family> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newFamily = await familyService.create(familyData);
      dispatch({ type: 'ADD_FAMILY', payload: newFamily });
      return newFamily;
    } catch (error) {
      handleError(error, 'Failed to create family');
      throw error;
    }
  }, [handleError]);

  const updateFamily = useCallback(async (id: EntityId, updates: UpdateFamilyRequest): Promise<Family> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedFamily = await familyService.update(id, updates);
      dispatch({ type: 'UPDATE_FAMILY', payload: updatedFamily });
      return updatedFamily;
    } catch (error) {
      handleError(error, `Failed to update family with id ${id}`);
      throw error;
    }
  }, [handleError]);

  const deleteFamily = useCallback(async (id: EntityId): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await familyService.delete(id);
      if (result) {
        dispatch({ type: 'DELETE_FAMILY', payload: id });
      }
      return result;
    } catch (error) {
      handleError(error, `Failed to delete family with id ${id}`);
      return false;
    }
  }, [handleError]);

  const setSelectedFamily = useCallback((family: Family | null) => {
    dispatch({ type: 'SET_SELECTED_FAMILY', payload: family });
  }, []);

  const updateFamilyStatus = useCallback(async (id: EntityId, status: FamilyStatus): Promise<Family> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedFamily = await familyService.updateStatus(id, status);
      dispatch({ type: 'UPDATE_FAMILY', payload: updatedFamily });
      return updatedFamily;
    } catch (error) {
      handleError(error, `Failed to update family status for id ${id}`);
      throw error;
    }
  }, [handleError]);

  const searchFamilies = useCallback(async (filters: FamilyFilters): Promise<Family[]> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const families = await familyService.search(filters);
      dispatch({ type: 'SET_LOADING', payload: false });
      return families;
    } catch (error) {
      handleError(error, 'Failed to search families');
      return [];
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshFamilies = useCallback(async () => {
    await loadFamilies({ page: state.pagination.page, limit: state.pagination.limit });
  }, [loadFamilies, state.pagination.page, state.pagination.limit]);

  const contextValue: FamilyContextType = {
    families: state.families,
    selectedFamily: state.selectedFamily,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
    loadFamilies,
    getFamilyById,
    createFamily,
    updateFamily,
    deleteFamily,
    setSelectedFamily,
    updateFamilyStatus,
    searchFamilies,
    clearError,
    refreshFamilies
  };

  return (
    <FamilyContext.Provider value={contextValue}>
      {children}
    </FamilyContext.Provider>
  );
}

// Custom hook to use family context
export function useFamily(): FamilyContextType {
  const context = useContext(FamilyContext);
  
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  
  return context;
}

export default FamilyContext;