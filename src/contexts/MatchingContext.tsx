import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { matchingService } from '../services/index.js';
import type { 
  Matching, 
  CompatibilityScore,
  Child,
  Family,
  EntityId 
} from '../types/index.js';

interface MatchingState {
  // Data
  matchings: Matching[];
  compatibilityScores: CompatibilityScore[];
  recommendations: CompatibilityScore[];
  
  // Loading states
  isLoading: boolean;
  isCalculating: boolean;
  isCreatingMatching: boolean;
  
  // Error handling
  error: string | null;
  
  // Statistics
  stats: {
    totalMatchings: number;
    proposedMatchings: number;
    approvedMatchings: number;
    averageCompatibilityScore: number;
  };
}

interface MatchingActions {
  // Core operations
  loadMatchings: () => Promise<void>;
  calculateCompatibility: (childId: EntityId, familyId: EntityId) => Promise<CompatibilityScore | null>;
  findCompatibleFamilies: (childId: EntityId, limit?: number) => Promise<CompatibilityScore[]>;
  createMatching: (childId: EntityId, familyId: EntityId, notes?: string) => Promise<Matching | null>;
  approveMatching: (matchingId: EntityId) => Promise<boolean>;
  rejectMatching: (matchingId: EntityId, reason: string) => Promise<boolean>;
  
  // Filters and searches
  getMatchingsByChild: (childId: EntityId) => Promise<Matching[]>;
  getMatchingsByFamily: (familyId: EntityId) => Promise<Matching[]>;
  getProposedMatchings: () => Promise<Matching[]>;
  
  // Utilities
  refreshData: () => Promise<void>;
  clearError: () => void;
  clearRecommendations: () => void;
}

type MatchingContextType = MatchingState & MatchingActions;

const MatchingContext = createContext<MatchingContextType | undefined>(undefined);

interface MatchingProviderProps {
  children: ReactNode;
}

export function MatchingProvider({ children }: MatchingProviderProps): JSX.Element {
  const [state, setState] = useState<MatchingState>({
    matchings: [],
    compatibilityScores: [],
    recommendations: [],
    isLoading: false,
    isCalculating: false,
    isCreatingMatching: false,
    error: null,
    stats: {
      totalMatchings: 0,
      proposedMatchings: 0,
      approvedMatchings: 0,
      averageCompatibilityScore: 0
    }
  });

  // Load initial data
  useEffect(() => {
    loadMatchings();
  }, []);

  // Calculate statistics when matchings change
  useEffect(() => {
    calculateStats();
  }, [state.matchings]);

  const loadMatchings = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const proposedMatchings = await matchingService.getProposedMatchings();
      setState(prev => ({
        ...prev,
        matchings: proposedMatchings,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load matchings',
        isLoading: false
      }));
    }
  };

  const calculateCompatibility = async (
    childId: EntityId, 
    familyId: EntityId
  ): Promise<CompatibilityScore | null> => {
    setState(prev => ({ ...prev, isCalculating: true, error: null }));
    
    try {
      const score = await matchingService.calculateCompatibilityScore(childId, familyId);
      
      // Add to compatibility scores if not already present
      setState(prev => {
        const existingIndex = prev.compatibilityScores.findIndex(
          s => s.childId === childId && s.familyId === familyId
        );
        
        const newScores = [...prev.compatibilityScores];
        if (existingIndex >= 0) {
          newScores[existingIndex] = score;
        } else {
          newScores.push(score);
        }
        
        return {
          ...prev,
          compatibilityScores: newScores,
          isCalculating: false
        };
      });
      
      return score;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to calculate compatibility',
        isCalculating: false
      }));
      return null;
    }
  };

  const findCompatibleFamilies = async (
    childId: EntityId, 
    limit: number = 10
  ): Promise<CompatibilityScore[]> => {
    setState(prev => ({ ...prev, isCalculating: true, error: null }));
    
    try {
      const recommendations = await matchingService.findCompatibleFamilies(childId, limit);
      
      setState(prev => ({
        ...prev,
        recommendations,
        isCalculating: false
      }));
      
      return recommendations;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to find compatible families',
        isCalculating: false
      }));
      return [];
    }
  };

  const createMatching = async (
    childId: EntityId, 
    familyId: EntityId, 
    notes: string = ''
  ): Promise<Matching | null> => {
    setState(prev => ({ ...prev, isCreatingMatching: true, error: null }));
    
    try {
      // Get current user ID (simplified - should get from auth context)
      const currentUserId = 'current-user-id';
      
      const matching = await matchingService.createMatching(childId, familyId, currentUserId, notes);
      
      setState(prev => ({
        ...prev,
        matchings: [...prev.matchings, matching],
        isCreatingMatching: false
      }));
      
      return matching;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create matching',
        isCreatingMatching: false
      }));
      return null;
    }
  };

  const approveMatching = async (matchingId: EntityId): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      // Get current user ID (simplified - should get from auth context)
      const currentUserId = 'current-user-id';
      
      const updatedMatching = await matchingService.approveMatching(matchingId, currentUserId);
      
      setState(prev => ({
        ...prev,
        matchings: prev.matchings.map(m => 
          m.id === matchingId ? updatedMatching : m
        )
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to approve matching'
      }));
      return false;
    }
  };

  const rejectMatching = async (matchingId: EntityId, reason: string): Promise<boolean> => {
    setState(prev => ({ ...prev, error: null }));
    
    try {
      // Get current user ID (simplified - should get from auth context)
      const currentUserId = 'current-user-id';
      
      const updatedMatching = await matchingService.rejectMatching(matchingId, currentUserId, reason);
      
      setState(prev => ({
        ...prev,
        matchings: prev.matchings.map(m => 
          m.id === matchingId ? updatedMatching : m
        )
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reject matching'
      }));
      return false;
    }
  };

  const getMatchingsByChild = async (childId: EntityId): Promise<Matching[]> => {
    try {
      return await matchingService.getMatchingsByChild(childId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get child matchings'
      }));
      return [];
    }
  };

  const getMatchingsByFamily = async (familyId: EntityId): Promise<Matching[]> => {
    try {
      return await matchingService.getMatchingsByFamily(familyId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get family matchings'
      }));
      return [];
    }
  };

  const getProposedMatchings = async (): Promise<Matching[]> => {
    try {
      return await matchingService.getProposedMatchings();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get proposed matchings'
      }));
      return [];
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadMatchings();
  };

  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }));
  };

  const clearRecommendations = (): void => {
    setState(prev => ({ ...prev, recommendations: [] }));
  };

  const calculateStats = (): void => {
    const { matchings, compatibilityScores } = state;
    
    const totalMatchings = matchings.length;
    const proposedMatchings = matchings.filter(m => m.status === 'proposed').length;
    const approvedMatchings = matchings.filter(m => m.status === 'approved').length;
    
    const averageCompatibilityScore = compatibilityScores.length > 0
      ? Math.round(compatibilityScores.reduce((sum, score) => sum + score.overallScore, 0) / compatibilityScores.length)
      : 0;
    
    setState(prev => ({
      ...prev,
      stats: {
        totalMatchings,
        proposedMatchings,
        approvedMatchings,
        averageCompatibilityScore
      }
    }));
  };

  const contextValue: MatchingContextType = {
    ...state,
    loadMatchings,
    calculateCompatibility,
    findCompatibleFamilies,
    createMatching,
    approveMatching,
    rejectMatching,
    getMatchingsByChild,
    getMatchingsByFamily,
    getProposedMatchings,
    refreshData,
    clearError,
    clearRecommendations
  };

  return (
    <MatchingContext.Provider value={contextValue}>
      {children}
    </MatchingContext.Provider>
  );
}

export function useMatching(): MatchingContextType {
  const context = useContext(MatchingContext);
  if (context === undefined) {
    throw new Error('useMatching must be used within a MatchingProvider');
  }
  return context;
}

export default MatchingContext;