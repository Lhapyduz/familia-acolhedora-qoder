import React, { useState, useEffect } from 'react';
import VisitScheduler from '../components/visits/VisitScheduler.js';
import { technicalVisitService, userService, placementService } from '../services/index.js';
import type { TechnicalVisit, Placement, User } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function VisitsPage(): JSX.Element {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Load active placements and technicians in parallel
      const [placementsResponse, techniciansResponse] = await Promise.all([
        placementService.list({ limit: 1000 }),
        userService.getUsersByRole('technician')
      ]);

      // Filter to only active placements
      const activePlacements = placementsResponse.data.filter(p => p.status === 'active');
      
      // Include coordinators as they can also perform visits
      const coordinators = await userService.getUsersByRole('coordinator');
      const allTechnicians = [...techniciansResponse, ...coordinators];

      setPlacements(activePlacements);
      setTechnicians(allTechnicians);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVisitCreated = (visit: TechnicalVisit): void => {
    // Refresh data or handle the new visit
    console.log('Visit created:', visit);
  };

  const handleVisitUpdated = (visit: TechnicalVisit): void => {
    // Refresh data or handle the updated visit
    console.log('Visit updated:', visit);
  };

  const handleVisitDeleted = (visitId: string): void => {
    // Refresh data or handle the deleted visit
    console.log('Visit deleted:', visitId);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Erro ao carregar dados
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="btn-primary"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <VisitScheduler
        placements={placements}
        technicians={technicians}
        onVisitCreated={handleVisitCreated}
        onVisitUpdated={handleVisitUpdated}
        onVisitDeleted={handleVisitDeleted}
      />
    </div>
  );
}

export default VisitsPage;