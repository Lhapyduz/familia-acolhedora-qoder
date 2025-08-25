import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';
import { budgetService } from '../services/index.js';
import type {
  Budget,
  BudgetSummary,
  Child,
  EntityId
} from '../types/index.js';

// Budget state interface
interface BudgetState {
  currentBudget: Budget | null;
  budgetSummary: BudgetSummary | null;
  isLoading: boolean;
  error: string | null;
  settings: {
    minimumWage: number;
    siblingMultiplier: number;
    specialNeedsMultiplier: number;
  };
}

// Budget actions
type BudgetAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BUDGET'; payload: Budget }
  | { type: 'SET_BUDGET_SUMMARY'; payload: BudgetSummary }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<BudgetState['settings']> }
  | { type: 'CLEAR_ERROR' };

// Budget context interface
interface BudgetContextType {
  currentBudget: Budget | null;
  budgetSummary: BudgetSummary | null;
  isLoading: boolean;
  error: string | null;
  settings: BudgetState['settings'];
  loadBudgetSummary: () => Promise<void>;
  updateTotalBudget: (amount: number) => Promise<void>;
  calculateChildCost: (child: Child, siblings?: Child[]) => Promise<number>;
  calculatePlacementCost: (child: Child, siblings?: Child[]) => number;
  updateBudgetSettings: (settings: Partial<BudgetState['settings']>) => void;
  clearError: () => void;
  refreshBudget: () => Promise<void>;
  getBudgetUtilizationPercentage: () => number;
  getAvailableBudgetFormatted: () => string;
  getTotalBudgetFormatted: () => string;
  getAllocatedBudgetFormatted: () => string;
}

// Initial state
const initialState: BudgetState = {
  currentBudget: null,
  budgetSummary: null,
  isLoading: false,
  error: null,
  settings: {
    minimumWage: 1320, // 2024 Brazilian minimum wage
    siblingMultiplier: 0.30, // 30%
    specialNeedsMultiplier: 0.50 // 50%
  }
};

// Budget reducer
function budgetReducer(state: BudgetState, action: BudgetAction): BudgetState {
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

    case 'SET_BUDGET':
      return {
        ...state,
        currentBudget: action.payload,
        settings: action.payload.settings,
        isLoading: false,
        error: null
      };

    case 'SET_BUDGET_SUMMARY':
      return {
        ...state,
        budgetSummary: action.payload,
        isLoading: false,
        error: null
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
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
const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

// Budget provider props
interface BudgetProviderProps {
  children: ReactNode;
}

// Budget provider component
export function BudgetProvider({ children }: BudgetProviderProps) {
  const [state, dispatch] = useReducer(budgetReducer, initialState);

  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    dispatch({ type: 'SET_ERROR', payload: errorMessage });
    console.error(defaultMessage, error);
  }, []);

  const loadBudgetSummary = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const summary = await budgetService.getBudgetSummary();
      dispatch({ type: 'SET_BUDGET_SUMMARY', payload: summary });
    } catch (error) {
      handleError(error, 'Failed to load budget summary');
    }
  }, [handleError]);

  const updateTotalBudget = useCallback(async (amount: number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const updatedBudget = await budgetService.updateTotalBudget(amount);
      dispatch({ type: 'SET_BUDGET', payload: updatedBudget });
      
      // Refresh budget summary
      await loadBudgetSummary();
    } catch (error) {
      handleError(error, 'Failed to update total budget');
      throw error;
    }
  }, [handleError, loadBudgetSummary]);

  const calculateChildCost = useCallback(async (child: Child, siblings: Child[] = []): Promise<number> => {
    try {
      return await budgetService.calculateChildCost(child, siblings);
    } catch (error) {
      handleError(error, 'Failed to calculate child cost');
      return 0;
    }
  }, [handleError]);

  // Synchronous calculation for immediate UI updates
  const calculatePlacementCost = useCallback((child: Child, siblings: Child[] = []): number => {
    let baseCost = state.settings.minimumWage;

    // Special needs calculation (50% additional)
    if (child.specialNeeds.hasSpecialNeeds) {
      baseCost += state.settings.minimumWage * state.settings.specialNeedsMultiplier;
    }

    // Sibling calculation (30% per additional sibling)
    if (siblings.length > 0) {
      const siblingCost = state.settings.minimumWage * state.settings.siblingMultiplier * siblings.length;
      baseCost += siblingCost;
    }

    return baseCost;
  }, [state.settings]);

  const updateBudgetSettings = useCallback((newSettings: Partial<BudgetState['settings']>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const refreshBudget = useCallback(async () => {
    await loadBudgetSummary();
  }, [loadBudgetSummary]);

  // Helper functions for budget formatting and calculations
  const getBudgetUtilizationPercentage = useCallback((): number => {
    if (!state.budgetSummary || state.budgetSummary.totalBudget === 0) {
      return 0;
    }
    return (state.budgetSummary.allocatedBudget / state.budgetSummary.totalBudget) * 100;
  }, [state.budgetSummary]);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }, []);

  const getAvailableBudgetFormatted = useCallback((): string => {
    return formatCurrency(state.budgetSummary?.availableBudget || 0);
  }, [state.budgetSummary, formatCurrency]);

  const getTotalBudgetFormatted = useCallback((): string => {
    return formatCurrency(state.budgetSummary?.totalBudget || 0);
  }, [state.budgetSummary, formatCurrency]);

  const getAllocatedBudgetFormatted = useCallback((): string => {
    return formatCurrency(state.budgetSummary?.allocatedBudget || 0);
  }, [state.budgetSummary, formatCurrency]);

  const contextValue: BudgetContextType = {
    currentBudget: state.currentBudget,
    budgetSummary: state.budgetSummary,
    isLoading: state.isLoading,
    error: state.error,
    settings: state.settings,
    loadBudgetSummary,
    updateTotalBudget,
    calculateChildCost,
    calculatePlacementCost,
    updateBudgetSettings,
    clearError,
    refreshBudget,
    getBudgetUtilizationPercentage,
    getAvailableBudgetFormatted,
    getTotalBudgetFormatted,
    getAllocatedBudgetFormatted
  };

  return (
    <BudgetContext.Provider value={contextValue}>
      {children}
    </BudgetContext.Provider>
  );
}

// Custom hook to use budget context
export function useBudget(): BudgetContextType {
  const context = useContext(BudgetContext);
  
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  
  return context;
}

// Hook for budget calculations
export function useBudgetCalculations() {
  const { calculatePlacementCost, settings } = useBudget();

  const calculateCostBreakdown = useCallback((child: Child, siblings: Child[] = []) => {
    const baseCost = settings.minimumWage;
    let specialNeedsCost = 0;
    let siblingCost = 0;

    if (child.specialNeeds.hasSpecialNeeds) {
      specialNeedsCost = settings.minimumWage * settings.specialNeedsMultiplier;
    }

    if (siblings.length > 0) {
      siblingCost = settings.minimumWage * settings.siblingMultiplier * siblings.length;
    }

    const totalCost = baseCost + specialNeedsCost + siblingCost;

    return {
      baseCost,
      specialNeedsCost,
      siblingCost,
      totalCost,
      breakdown: [
        {
          label: 'Custo Base (Salário Mínimo)',
          amount: baseCost,
          description: 'Valor padrão por criança'
        },
        ...(specialNeedsCost > 0 ? [{
          label: 'Necessidades Especiais (+50%)',
          amount: specialNeedsCost,
          description: 'Adicional para crianças com necessidades especiais'
        }] : []),
        ...(siblingCost > 0 ? [{
          label: `Irmãos (+30% x ${siblings.length})`,
          amount: siblingCost,
          description: 'Adicional por irmão acolhido junto'
        }] : [])
      ]
    };
  }, [settings, calculatePlacementCost]);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }, []);

  return {
    calculateCostBreakdown,
    formatCurrency,
    minimumWage: settings.minimumWage,
    siblingMultiplier: settings.siblingMultiplier,
    specialNeedsMultiplier: settings.specialNeedsMultiplier
  };
}

export default BudgetContext;