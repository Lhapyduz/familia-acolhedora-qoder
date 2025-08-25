import React, { useState, useEffect } from 'react';
import PlacementManager from '../components/placement/PlacementManager.js';
import { placementService } from '../services/index.js';
import type { Placement } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function PlacementPage(): JSX.Element {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlacements();
  }, []);

  const loadPlacements = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await placementService.list({ limit: 1000 });
      setPlacements(response.data);
    } catch (err) {
      console.error('Error loading placements:', err);
      setError('Erro ao carregar acolhimentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlacement = async (id: string, updates: Partial<Placement>): Promise<void> => {
    try {
      const updatedPlacement = await placementService.update(id, updates);
      setPlacements(prev => 
        prev.map(p => p.id === id ? updatedPlacement : p)
      );
    } catch (err) {
      console.error('Error updating placement:', err);
      throw err; // Re-throw to let the component handle the error
    }
  };

  const handleCreatePlacement = (): void => {
    // TODO: Implement placement creation logic
    // This would typically open a modal or navigate to a form
    alert('Funcionalidade de criação de acolhimento será implementada');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Erro ao carregar dados
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPlacements}
            className="btn-primary"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PlacementManager
        placements={placements}
        onUpdatePlacement={handleUpdatePlacement}
        onCreatePlacement={handleCreatePlacement}
      />
    </div>
  );
}

export default PlacementPage;