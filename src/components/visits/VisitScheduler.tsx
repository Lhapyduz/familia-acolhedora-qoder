import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext.js';
import { useChildren } from '../../contexts/ChildrenContext.js';
import { technicalVisitService } from '../../services/index.js';
import { 
  Calendar,
  Clock,
  User,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import type { 
  TechnicalVisit, 
  Placement,
  Child, 
  Family,
  User as UserType,
  EntityId 
} from '../../types/index.js';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface VisitSchedulerProps {
  placements: Placement[];
  technicians: UserType[];
  onVisitCreated?: (visit: TechnicalVisit) => void;
  onVisitUpdated?: (visit: TechnicalVisit) => void;
  onVisitDeleted?: (visitId: EntityId) => void;
}

interface VisitFilters {
  status: 'all' | 'upcoming' | 'completed' | 'overdue';
  technicianId: EntityId | 'all';
  placementId: EntityId | 'all';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

function VisitScheduler({ 
  placements, 
  technicians, 
  onVisitCreated,
  onVisitUpdated,
  onVisitDeleted 
}: VisitSchedulerProps): JSX.Element {
  const { families } = useFamily();
  const { children } = useChildren();
  const [visits, setVisits] = useState<TechnicalVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVisit, setEditingVisit] = useState<TechnicalVisit | null>(null);
  const [filters, setFilters] = useState<VisitFilters>({
    status: 'all',
    technicianId: 'all',
    placementId: 'all',
    dateRange: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<{
    total: number;
    completed: number;
    upcoming: number;
    overdue: number;
    byTechnician: Record<string, number>;
    averageFrequency: number;
  } | null>(null);

  useEffect(() => {
    loadVisits();
    loadStats();
  }, []);

  const loadVisits = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await technicalVisitService.list({ limit: 1000 });
      setVisits(response.data);
    } catch (error) {
      console.error('Error loading visits:', error);
      alert('Erro ao carregar visitas técnicas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async (): Promise<void> => {
    try {
      const visitStats = await technicalVisitService.getVisitStats();
      setStats(visitStats);
    } catch (error) {
      console.error('Error loading visit statistics:', error);
    }
  };

  const handleCreateVisit = async (visitData: Omit<TechnicalVisit, 'id'>): Promise<void> => {
    try {
      const newVisit = await technicalVisitService.create(visitData);
      setVisits(prev => [newVisit, ...prev]);
      setShowCreateForm(false);
      onVisitCreated?.(newVisit);
      await loadStats();
    } catch (error) {
      console.error('Error creating visit:', error);
      alert('Erro ao criar visita técnica. Tente novamente.');
    }
  };

  const handleUpdateVisit = async (id: EntityId, updates: Partial<TechnicalVisit>): Promise<void> => {
    try {
      const updatedVisit = await technicalVisitService.update(id, updates);
      setVisits(prev => prev.map(v => v.id === id ? updatedVisit : v));
      setEditingVisit(null);
      onVisitUpdated?.(updatedVisit);
      await loadStats();
    } catch (error) {
      console.error('Error updating visit:', error);
      alert('Erro ao atualizar visita técnica. Tente novamente.');
    }
  };

  const handleDeleteVisit = async (id: EntityId): Promise<void> => {
    if (!confirm('Tem certeza que deseja excluir esta visita técnica?')) {
      return;
    }

    try {
      await technicalVisitService.delete(id);
      setVisits(prev => prev.filter(v => v.id !== id));
      onVisitDeleted?.(id);
      await loadStats();
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Erro ao excluir visita técnica. Tente novamente.');
    }
  };

  const handleCompleteVisit = async (
    id: EntityId, 
    observations: string, 
    recommendations: string[], 
    followUpRequired: boolean,
    nextVisitDate?: Date
  ): Promise<void> => {
    try {
      const completedVisit = await technicalVisitService.completeVisit(
        id, 
        observations, 
        recommendations, 
        followUpRequired, 
        nextVisitDate
      );
      setVisits(prev => prev.map(v => v.id === id ? completedVisit : v));
      await loadStats();
    } catch (error) {
      console.error('Error completing visit:', error);
      alert('Erro ao concluir visita técnica. Tente novamente.');
    }
  };

  const getFilteredVisits = (): TechnicalVisit[] => {
    let filtered = visits.filter(visit => {
      // Status filter
      if (filters.status !== 'all') {
        const now = new Date();
        const visitDate = new Date(visit.visitDate);
        const isCompleted = visit.observations && visit.observations.trim() !== '';
        
        switch (filters.status) {
          case 'upcoming':
            if (visitDate < now || isCompleted) return false;
            break;
          case 'completed':
            if (!isCompleted) return false;
            break;
          case 'overdue':
            if (visitDate >= now || isCompleted) return false;
            break;
        }
      }

      // Technician filter
      if (filters.technicianId !== 'all' && visit.technicianId !== filters.technicianId) {
        return false;
      }

      // Placement filter
      if (filters.placementId !== 'all' && visit.placementId !== filters.placementId) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== 'all') {
        const visitDate = new Date(visit.visitDate);
        const now = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            if (visitDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            if (visitDate < weekStart || visitDate > weekEnd) return false;
            break;
          case 'month':
            if (visitDate.getMonth() !== now.getMonth() || visitDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
            break;
        }
      }

      // Search filter
      if (searchTerm) {
        const placement = placements.find(p => p.id === visit.placementId);
        const child = placement ? children.find(c => c.id === placement.childId) : null;
        const family = placement ? families.find(f => f.id === placement.familyId) : null;
        const technician = technicians.find(t => t.id === visit.technicianId);
        
        const searchLower = searchTerm.toLowerCase();
        const matchesChild = child?.personalInfo.name.toLowerCase().includes(searchLower);
        const matchesFamily = family?.primaryContact.name.toLowerCase().includes(searchLower);
        const matchesTechnician = technician?.name.toLowerCase().includes(searchLower);
        const matchesPurpose = visit.purpose.toLowerCase().includes(searchLower);
        
        if (!matchesChild && !matchesFamily && !matchesTechnician && !matchesPurpose) {
          return false;
        }
      }

      return true;
    });

    // Sort by visit date (upcoming first, then by date)
    filtered.sort((a, b) => {
      const dateA = new Date(a.visitDate);
      const dateB = new Date(b.visitDate);
      return dateA.getTime() - dateB.getTime();
    });

    return filtered;
  };

  const getVisitStatusColor = (visit: TechnicalVisit): string => {
    const now = new Date();
    const visitDate = new Date(visit.visitDate);
    const isCompleted = visit.observations && visit.observations.trim() !== '';
    
    if (isCompleted) {
      return 'bg-green-100 text-green-800';
    } else if (visitDate < now) {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-blue-100 text-blue-800';
    }
  };

  const getVisitStatusText = (visit: TechnicalVisit): string => {
    const now = new Date();
    const visitDate = new Date(visit.visitDate);
    const isCompleted = visit.observations && visit.observations.trim() !== '';
    
    if (isCompleted) {
      return 'Concluída';
    } else if (visitDate < now) {
      return 'Atrasada';
    } else {
      return 'Agendada';
    }
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Visitas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Concluídas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Agendadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Atrasadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => (
    <div className="card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Criança, família ou técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <option value="upcoming">Agendadas</option>
            <option value="completed">Concluídas</option>
            <option value="overdue">Atrasadas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Técnico
          </label>
          <select
            value={filters.technicianId}
            onChange={(e) => setFilters(prev => ({ ...prev, technicianId: e.target.value as any }))}
            className="input-field"
          >
            <option value="all">Todos</option>
            {technicians.map(technician => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
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
            <option value="today">Hoje</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mês</option>
          </select>
        </div>

        <div className="flex items-end space-x-2">
          <button
            onClick={() => setFilters({
              status: 'all',
              technicianId: 'all',
              placementId: 'all',
              dateRange: 'all'
            })}
            className="btn-secondary text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpar
          </button>
        </div>
      </div>
    </div>
  );

  const renderVisitCard = (visit: TechnicalVisit) => {
    const placement = placements.find(p => p.id === visit.placementId);
    const child = placement ? children.find(c => c.id === placement.childId) : null;
    const family = placement ? families.find(f => f.id === placement.familyId) : null;
    const technician = technicians.find(t => t.id === visit.technicianId);

    if (!child || !family || !technician) return null;

    const isCompleted = visit.observations && visit.observations.trim() !== '';
    const visitDate = new Date(visit.visitDate);
    const isOverdue = visitDate < new Date() && !isCompleted;

    return (
      <div key={visit.id} className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              {child.personalInfo.name}
            </h3>
            <p className="text-sm text-gray-600">
              Família {family.primaryContact.name}
            </p>
            <p className="text-sm text-gray-500">
              Técnico: {technician.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getVisitStatusColor(visit)}`}>
              {getVisitStatusText(visit)}
            </span>
            {isOverdue && (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{visitDate.toLocaleDateString('pt-BR')}</span>
            <Clock className="h-4 w-4 ml-4 mr-2" />
            <span>{visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="flex items-start text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 mt-0.5" />
            <span className="flex-1">{visit.purpose}</span>
          </div>

          {visit.observations && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-900 mb-1">Observações</h4>
              <p className="text-sm text-gray-600">{visit.observations}</p>
              
              {visit.recommendations && visit.recommendations.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-xs font-medium text-gray-700 mb-1">Recomendações:</h5>
                  <ul className="text-xs text-gray-600 list-disc list-inside">
                    {visit.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {!isCompleted && (
              <button
                onClick={() => setEditingVisit(visit)}
                className="btn-secondary text-sm"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Editar
              </button>
            )}
            
            <button
              onClick={() => handleDeleteVisit(visit.id)}
              className="btn-secondary text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </button>
          </div>

          {!isCompleted && (
            <button
              onClick={() => {
                // Open completion modal/form
                // For now, we'll use a simple prompt
                const observations = prompt('Observações da visita:', '');
                if (observations !== null) {
                  const recommendations = prompt('Recomendações (separadas por vírgula):', '')?.split(',').map(r => r.trim()).filter(r => r) || [];
                  const followUp = confirm('Acompanhamento necessário?');
                  const nextDate = followUp ? prompt('Data da próxima visita (DD/MM/AAAA):', '') : null;
                  
                  let nextVisitDate: Date | undefined;
                  if (nextDate) {
                    const [day, month, year] = nextDate.split('/');
                    nextVisitDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  }
                  
                  handleCompleteVisit(visit.id, observations, recommendations, followUp, nextVisitDate);
                }
              }}
              className="btn-primary text-sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Concluir
            </button>
          )}
        </div>
      </div>
    );
  };

  const filteredVisits = getFilteredVisits();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitas Técnicas</h1>
          <p className="text-gray-600">
            Gerencie o agendamento e acompanhamento das visitas técnicas
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nova Visita</span>
        </button>
      </div>

      {/* Statistics */}
      {renderStatsCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Visits List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Visitas ({filteredVisits.length})
          </h2>
          
          <button
            onClick={loadVisits}
            className="btn-secondary text-sm flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
        </div>

        {filteredVisits.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhuma visita encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {visits.length === 0 
                ? 'Não há visitas técnicas agendadas ainda.'
                : 'Nenhuma visita corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredVisits.map(renderVisitCard)}
          </div>
        )}
      </div>

      {/* Create/Edit Forms would go here */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nova Visita Técnica</h3>
            <p className="text-sm text-gray-600 mb-4">
              Formulário de criação de visita seria implementado aqui
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="btn-primary flex-1"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Visita</h3>
            <p className="text-sm text-gray-600 mb-4">
              Formulário de edição de visita seria implementado aqui
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setEditingVisit(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => setEditingVisit(null)}
                className="btn-primary flex-1"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisitScheduler;