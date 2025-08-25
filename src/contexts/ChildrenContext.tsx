import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import { childrenService } from '../services/index.js';
import type {
  Child,
  CreateChildRequest,
  UpdateChildRequest,
  ChildStatus,
  ChildFilters,
  EntityId,
  PaginatedResponse,
  QueryOptions
} from '../types/index.js';

// Children state interface
interface ChildrenState {
  children: Child[];
  selectedChild: Child | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Children actions
type ChildrenAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CHILDREN'; payload: PaginatedResponse<Child> }
  | { type: 'ADD_CHILD'; payload: Child }
  | { type: 'UPDATE_CHILD'; payload: Child }
  | { type: 'DELETE_CHILD'; payload: EntityId }
  | { type: 'SET_SELECTED_CHILD'; payload: Child | null }
  | { type: 'CLEAR_ERROR' };

// Children context interface
interface ChildrenContextType {
  children: Child[];
  selectedChild: Child | null;
  isLoading: boolean;
  error: string | null;
  pagination: ChildrenState['pagination'];
  loadChildren: (options?: QueryOptions) => Promise<void>;
  getChildById: (id: EntityId) => Promise<Child | null>;
  createChild: (childData: CreateChildRequest) => Promise<Child>;
  updateChild: (id: EntityId, updates: UpdateChildRequest) => Promise<Child>;
  deleteChild: (id: EntityId) => Promise<boolean>;
  setSelectedChild: (child: Child | null) => void;
  updateChildStatus: (id: EntityId, status: ChildStatus) => Promise<Child>;
  searchChildren: (filters: ChildFilters) => Promise<Child[]>;
  assignToFamily: (childId: EntityId, familyId: EntityId) => Promise<void>;
  clearError: () => void;
  refreshChildren: () => Promise<void>;
  getAwaitingChildren: () => Child[];
  getChildrenInPlacement: () => Child[];
  getChildrenWithSpecialNeeds: () => Child[];
}

// Initial state
const initialState: ChildrenState = {
  children: [],
  selectedChild: null,
  isLoading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  }
};

// Children reducer
function childrenReducer(state: ChildrenState, action: ChildrenAction): ChildrenState {
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

    case 'SET_CHILDREN':
      return {
        ...state,
        children: action.payload.data,
        pagination: {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages
        },
        isLoading: false,
        error: null
      };

    case 'ADD_CHILD':
      return {
        ...state,
        children: [action.payload, ...state.children],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1
        },
        isLoading: false,
        error: null
      };

    case 'UPDATE_CHILD':
      return {
        ...state,
        children: state.children.map(child =>
          child.id === action.payload.id ? action.payload : child
        ),
        selectedChild: state.selectedChild?.id === action.payload.id
          ? action.payload
          : state.selectedChild,
        isLoading: false,
        error: null
      };

    case 'DELETE_CHILD':
      return {
        ...state,
        children: state.children.filter(child => child.id !== action.payload),
        selectedChild: state.selectedChild?.id === action.payload
          ? null
          : state.selectedChild,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1)
        },
        isLoading: false,
        error: null
      };

    case 'SET_SELECTED_CHILD':
      return {
        ...state,
        selectedChild: action.payload
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
const ChildrenContext = createContext<ChildrenContextType | undefined>(undefined);

// Children provider props
interface ChildrenProviderProps {
  children: ReactNode;
}

// Children provider component
export function ChildrenProvider({ children }: ChildrenProviderProps) {
  const [state, dispatch] = useReducer(childrenReducer, initialState);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    console.error(defaultMessage, error);
  }, []);

  const loadChildren = useCallback(async (options: QueryOptions = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await childrenService.list(options);
      dispatch({ type: 'SET_CHILDREN', payload: response });
    } catch (error) {
      handleError(error, 'Failed to load children');
    }
  }, [handleError]);

  const getChildById = useCallback(async (id: EntityId): Promise<Child | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const child = await childrenService.getById(id);
      dispatch({ type: 'SET_LOADING', payload: false });
      return child;
    } catch (error) {
      handleError(error, `Failed to get child with id ${id}`);
      return null;
    }
  }, [handleError]);

  const createChild = useCallback(async (childData: CreateChildRequest): Promise<Child> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const newChild = await childrenService.create(childData);
      dispatch({ type: 'ADD_CHILD', payload: newChild });
      return newChild;
    } catch (error) {
      handleError(error, 'Failed to create child');
      throw error;
    }
  }, [handleError]);

  const updateChild = useCallback(async (id: EntityId, updates: UpdateChildRequest): Promise<Child> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedChild = await childrenService.update(id, updates);
      dispatch({ type: 'UPDATE_CHILD', payload: updatedChild });
      return updatedChild;
    } catch (error) {
      handleError(error, `Failed to update child with id ${id}`);
      throw error;
    }
  }, [handleError]);

  const deleteChild = useCallback(async (id: EntityId): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await childrenService.delete(id);
      if (result) {
        dispatch({ type: 'DELETE_CHILD', payload: id });
      }
      return result;
    } catch (error) {
      handleError(error, `Failed to delete child with id ${id}`);
      return false;
    }
  }, [handleError]);

  const setSelectedChild = useCallback((child: Child | null) => {
    dispatch({ type: 'SET_SELECTED_CHILD', payload: child });
  }, []);

  const updateChildStatus = useCallback(async (id: EntityId, status: ChildStatus): Promise<Child> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedChild = await childrenService.updateStatus(id, status);
      dispatch({ type: 'UPDATE_CHILD', payload: updatedChild });
      return updatedChild;
    } catch (error) {
      handleError(error, `Failed to update child status for id ${id}`);
      throw error;
    }
  }, [handleError]);

  const searchChildren = useCallback(async (filters: ChildFilters): Promise<Child[]> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const children = await childrenService.search(filters);
      dispatch({ type: 'SET_LOADING', payload: false });
      return children;
    } catch (error) {
      handleError(error, 'Failed to search children');
      return [];
    }
  }, [handleError]);

  const assignToFamily = useCallback(async (childId: EntityId, familyId: EntityId): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await childrenService.assignToFamily(childId, familyId);
      
      // Refresh the child data to get updated placement info
      const updatedChild = await childrenService.getById(childId);
      if (updatedChild) {
        dispatch({ type: 'UPDATE_CHILD', payload: updatedChild });
      }
      
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      handleError(error, `Failed to assign child ${childId} to family ${familyId}`);
      throw error;
    }
  }, [handleError]);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshChildren = useCallback(async () => {
    await loadChildren({ page: state.pagination.page, limit: state.pagination.limit });
  }, [loadChildren, state.pagination.page, state.pagination.limit]);

  // Helper functions to filter children by status
  const getAwaitingChildren = useCallback((): Child[] => {
    return state.children.filter(child => child.currentStatus === 'awaiting');
  }, [state.children]);

  const getChildrenInPlacement = useCallback((): Child[] => {
    return state.children.filter(child => child.currentStatus === 'in_placement');
  }, [state.children]);

  const getChildrenWithSpecialNeeds = useCallback((): Child[] => {
    return state.children.filter(child => child.specialNeeds.hasSpecialNeeds);
  }, [state.children]);

  const contextValue: ChildrenContextType = {
    children: state.children,
    selectedChild: state.selectedChild,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
    loadChildren,
    getChildById,
    createChild,
    updateChild,
    deleteChild,
    setSelectedChild,
    updateChildStatus,
    searchChildren,
    assignToFamily,
    clearError,
    refreshChildren,
    getAwaitingChildren,
    getChildrenInPlacement,
    getChildrenWithSpecialNeeds
  };

  return (
    <ChildrenContext.Provider value={contextValue}>
      {children}
    </ChildrenContext.Provider>
  );
}

// Custom hook to use children context
export function useChildren(): ChildrenContextType {
  const context = useContext(ChildrenContext);
  
  if (context === undefined) {
    throw new Error('useChildren must be used within a ChildrenProvider');
  }
  
  return context;
}

export default ChildrenContext;