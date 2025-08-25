import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext.js';
import { useChildren } from '../../contexts/ChildrenContext.js';
import PlacementWorkflow from './PlacementWorkflow.js';
import { 
  Search,
  Filter,
  Plus,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Eye,
  Calendar,
  RefreshCw
} from 'lucide-react';
import type { 
  Placement, 
  PlacementStatus,
  Child, 
  Family 
} from '../../types/index.js';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface PlacementManagerProps {
  placements: Placement[];
  onUpdatePlacement: (id: string, updates: Partial<Placement>) => Promise<void>;
  onCreatePlacement?: () => void;
}

interface PlacementFilters {
  status: PlacementStatus | 'all';
  searchTerm: string;
  urgentOnly: boolean;
  dateRange: 'all' | 'last_week' | 'last_month' | 'last_quarter';
}

interface PlacementMetrics {
  total: number;
  active: number;
  completed: number;
  interrupted: number;
  behindSchedule: number;
  avgDuration: number;
}

function PlacementManager({ 
  placements, 
  onUpdatePlacement,
  onCreatePlacement 
}: PlacementManagerProps): JSX.Element {
  const { families } = useFamily();
  const { children } = useChildren();
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);
  const [filters, setFilters] = useState<PlacementFilters>({
    status: 'all',
    searchTerm: '',
    urgentOnly: false,
    dateRange: 'all'
  });
  const [sortBy, setSortBy] = useState<'startDate' | 'progress' | 'daysElapsed'>('startDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);

  const calculatePlacementMetrics = (): PlacementMetrics => {
    const total = placements.length;
    const active = placements.filter(p => p.status === 'active').length;
    const completed = placements.filter(p => p.status === 'completed').length;
    const interrupted = placements.filter(p => p.status === 'interrupted').length;
    
    const behindSchedule = placements.filter(p => {
      if (p.status !== 'active') return false;
      const progress = calculateProgress(p);
      return progress.actualProgress < progress.expectedProgress - 15;
    }).length;

    const completedPlacements = placements.filter(p => p.endDate);
    const avgDuration = completedPlacements.length > 0
      ? completedPlacements.reduce((sum, p) => {
          const duration = Math.ceil(
            (new Date(p.endDate!).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + duration;
        }, 0) / completedPlacements.length
      : 0;

    return {
      total,
      active,
      completed,
      interrupted,
      behindSchedule,
      avgDuration: Math.round(avgDuration)
    };
  };

  const calculateProgress = (placement: Placement) => {
    const process = placement.approximationProcess;
    const startDate = new Date(process.startDate);
    const currentDate = new Date();
    const daysElapsed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const completedStages = process.stages.filter(s => s.completed).length;
    const totalStages = process.stages.length;
    const actualProgress = Math.round((completedStages / totalStages) * 100);
    const expectedProgress = Math.min(100, Math.round((daysElapsed / process.expectedDuration) * 100));

    return {
      actualProgress,
      expectedProgress,
      daysElapsed,
      isOnTrack: actualProgress >= expectedProgress - 15
    };
  };

  const getFilteredPlacements = () => {
    let filtered = placements.filter(placement => {
      // Status filter
      if (filters.status !== 'all' && placement.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const child = children.find(c => c.id === placement.childId);
        const family = families.find(f => f.id === placement.familyId);
        const searchLower = filters.searchTerm.toLowerCase();
        
        const matchesChild = child?.personalInfo.name.toLowerCase().includes(searchLower);
        const matchesFamily = family?.primaryContact.name.toLowerCase().includes(searchLower);
        
        if (!matchesChild && !matchesFamily) return false;
      }

      // Urgent filter
      if (filters.urgentOnly) {
        const progress = calculateProgress(placement);
        if (progress.isOnTrack) return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const startDate = new Date(placement.startDate);
        const now = new Date();
        const daysDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'last_week':
            if (daysDiff > 7) return false;
            break;
          case 'last_month':
            if (daysDiff > 30) return false;
            break;
          case 'last_quarter':
            if (daysDiff > 90) return false;
            break;
        }
      }

      return true;
    });

    // Sort placements
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case 'startDate':
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case 'progress':
          aValue = calculateProgress(a).actualProgress;
          bValue = calculateProgress(b).actualProgress;
          break;
        case 'daysElapsed':
          aValue = calculateProgress(a).daysElapsed;
          bValue = calculateProgress(b).daysElapsed;
          break;
        default:
          return 0;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  };

  const metrics = calculatePlacementMetrics();
  const filteredPlacements = getFilteredPlacements();

  const handlePlacementUpdate = async (updates: Partial<Placement>) => {
    if (!selectedPlacement) return;
    
    try {
      setIsLoading(true);
      await onUpdatePlacement(selectedPlacement.id, updates);
    } catch (error) {
      console.error('Error updating placement:', error);
      alert('Erro ao atualizar acolhimento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: PlacementStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'interrupted':
        return 'bg-red-100 text-red-800';
      case 'transferred':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PlacementStatus): string => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'completed':
        return 'Concluído';
      case 'interrupted':
        return 'Interrompido';
      case 'transferred':
        return 'Transferido';
      default:
        return status;
    }
  };

  const renderMetricsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Total de Acolhimentos</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.total}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Ativos</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.active}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Atrasados</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.behindSchedule}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Duração Média</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.avgDuration} dias</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Criança ou família..."
              value={filters.searchTerm}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
            className="input-field"
          >
            <option value="all">Todos</option>
            <option value="active">Ativo</option>
            <option value="completed">Concluído</option>
            <option value="interrupted">Interrompido</option>
            <option value="transferred">Transferido</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Período
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
            className="input-field"
          >
            <option value="all">Todos</option>
            <option value="last_week">Última semana</option>
            <option value="last_month">Último mês</option>
            <option value="last_quarter">Último trimestre</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ordenar por
          </label>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="input-field"
          >
            <option value="startDate-desc">Data início (recente)</option>
            <option value="startDate-asc">Data início (antigo)</option>
            <option value="progress-desc">Progresso (maior)</option>
            <option value="progress-asc">Progresso (menor)</option>
            <option value="daysElapsed-desc">Tempo (maior)</option>
            <option value="daysElapsed-asc">Tempo (menor)</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.urgentOnly}
            onChange={(e) => setFilters(prev => ({ ...prev, urgentOnly: e.target.checked }))}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="ml-2 text-sm text-gray-700">Apenas urgentes</span>
        </label>

        <button
          onClick={() => setFilters({
            status: 'all',
            searchTerm: '',
            urgentOnly: false,
            dateRange: 'all'
          })}
          className="btn-secondary text-sm"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Limpar filtros
        </button>
      </div>
    </div>
  );

  const renderPlacementCard = (placement: Placement) => {
    const child = children.find(c => c.id === placement.childId);
    const family = families.find(f => f.id === placement.familyId);
    const progress = calculateProgress(placement);

    if (!child || !family) return null;

    return (
      <div
        key={placement.id}
        className="card cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setSelectedPlacement(placement)}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {child.personalInfo.name}
            </h3>
            <p className="text-sm text-gray-600">
              Família {family.primaryContact.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(placement.status)}`}>
              {getStatusText(placement.status)}
            </span>
            {!progress.isOnTrack && placement.status === 'active' && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progresso</span>
            <span className="font-medium">{progress.actualProgress}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${progress.isOnTrack ? 'bg-blue-600' : 'bg-red-600'}`}
              style={{ width: `${progress.actualProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{progress.daysElapsed} dias decorridos</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  };

  // If a placement is selected, show the workflow details
  if (selectedPlacement) {
    return (
      <div>
        <button
          onClick={() => setSelectedPlacement(null)}
          className="mb-4 btn-secondary flex items-center space-x-2"
        >
          <ArrowRight className="h-4 w-4 transform rotate-180" />
          <span>Voltar à lista</span>
        </button>
        
        <PlacementWorkflow
          placement={selectedPlacement}
          onUpdatePlacement={handlePlacementUpdate}
          onGenerateReport={() => {
            // TODO: Implement report generation
            alert('Funcionalidade de relatório será implementada');
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Acolhimentos</h1>
          <p className="text-gray-600">
            Acompanhe o progresso dos acolhimentos ativos e gerencie os processos de aproximação
          </p>
        </div>
        
        {onCreatePlacement && (
          <button
            onClick={onCreatePlacement}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Novo Acolhimento</span>
          </button>
        )}
      </div>

      {/* Metrics */}
      {renderMetricsCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Placements List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Acolhimentos ({filteredPlacements.length})
          </h2>
        </div>

        {filteredPlacements.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum acolhimento encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {placements.length === 0 
                ? 'Não há acolhimentos registrados ainda.'
                : 'Nenhum acolhimento corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPlacements.map(renderPlacementCard)}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlacementManager;