import React, { useState, useEffect } from 'react';
import { useChildren } from '../../contexts/ChildrenContext.js';
import type { Child, ChildFilters, ChildStatus } from '../../types/index.js';
import { 
  Baby, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  User, 
  Edit, 
  Trash2, 
  Eye,
  Plus,
  ChevronDown,
  RefreshCw,
  Heart,
  AlertCircle,
  Clock
} from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface ChildrenListProps {
  onSelectChild?: (child: Child) => void;
  onEditChild?: (child: Child) => void;
  onDeleteChild?: (child: Child) => void;
  onEdit?: (childId: string) => void; // For page-level integration
  showActions?: boolean;
}

function ChildrenList({ 
  onSelectChild, 
  onEditChild, 
  onDeleteChild,
  onEdit,
  showActions = true 
}: ChildrenListProps): JSX.Element {
  const {
    children,
    loadChildren,
    deleteChild,
    isLoading,
    error,
    pagination,
    refreshChildren,
    clearError
  } = useChildren();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChildStatus | ''>('');
  const [ageRangeFilter, setAgeRangeFilter] = useState<{ min: number; max: number }>({ min: 0, max: 18 });
  const [genderFilter, setGenderFilter] = useState<'male' | 'female' | ''>('');
  const [specialNeedsFilter, setSpecialNeedsFilter] = useState<boolean | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'age' | 'createdAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadChildrenWithFilters();
  }, [searchTerm, statusFilter, ageRangeFilter, genderFilter, specialNeedsFilter, sortBy, sortOrder]);

  const loadChildrenWithFilters = async () => {
    const filters: Record<string, any> = {};
    
    if (searchTerm) {
      filters.search = searchTerm;
    }
    
    if (statusFilter) {
      filters.status = [statusFilter];
    }
    
    if (genderFilter) {
      filters.gender = genderFilter;
    }
    
    if (specialNeedsFilter !== '') {
      filters.specialNeeds = specialNeedsFilter;
    }
    
    // Age range filter
    if (ageRangeFilter.min > 0 || ageRangeFilter.max < 18) {
      filters.ageRange = ageRangeFilter;
    }

    await loadChildren({
      filters,
      sortBy,
      sortOrder,
      page: 1,
      limit: 10
    });
  };

  const handleDeleteChild = async (child: Child) => {
    if (window.confirm(`Tem certeza que deseja excluir o cadastro de ${child.personalInfo.name}?`)) {
      try {
        await deleteChild(child.id);
        if (onDeleteChild) {
          onDeleteChild(child);
        }
      } catch (error) {
        console.error('Error deleting child:', error);
      }
    }
  };

  const getStatusColor = (status: ChildStatus): string => {
    switch (status) {
      case 'awaiting':
        return 'bg-warm-100 text-warm-800';
      case 'in_placement':
        return 'bg-primary-100 text-primary-800';
      case 'discharged':
        return 'bg-caring-100 text-caring-800';
      case 'returned_family':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ChildStatus): string => {
    switch (status) {
      case 'awaiting':
        return 'Aguardando';
      case 'in_placement':
        return 'Em Acolhimento';
      case 'discharged':
        return 'Desligado';
      case 'returned_family':
        return 'Retornou à Família';
      default:
        return status;
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getAgeText = (birthDate: Date): string => {
    const age = calculateAge(birthDate);
    if (age === 0) {
      const months = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
      return months <= 1 ? 'Recém-nascido' : `${months} meses`;
    }
    return `${age} anos`;
  };

  const filteredChildren = children.filter(child => {
    const age = calculateAge(child.personalInfo.birthDate);
    
    const matchesSearch = !searchTerm || 
      child.personalInfo.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || child.currentStatus === statusFilter;
    const matchesGender = !genderFilter || child.personalInfo.gender === genderFilter;
    const matchesSpecialNeeds = specialNeedsFilter === '' || 
      child.specialNeeds.hasSpecialNeeds === specialNeedsFilter;
    const matchesAge = age >= ageRangeFilter.min && age <= ageRangeFilter.max;
    
    return matchesSearch && matchesStatus && matchesGender && matchesSpecialNeeds && matchesAge;
  });

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-red-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Erro ao carregar crianças
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => {
                clearError();
                refreshChildren();
              }}
              className="btn-primary"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="card">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar crianças por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center space-x-2"
            >
              <Filter className="h-5 w-5" />
              <span>Filtros Avançados</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={refreshChildren}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <span className="text-sm text-gray-500">
                {filteredChildren.length} criança{filteredChildren.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ChildStatus | '')}
                  className="input-field"
                >
                  <option value="">Todos os status</option>
                  <option value="awaiting">Aguardando</option>
                  <option value="in_placement">Em Acolhimento</option>
                  <option value="discharged">Desligado</option>
                  <option value="returned_family">Retornou à Família</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gênero
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as 'male' | 'female' | '')}
                  className="input-field"
                >
                  <option value="">Todos</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Necessidades Especiais
                </label>
                <select
                  value={specialNeedsFilter.toString()}
                  onChange={(e) => setSpecialNeedsFilter(
                    e.target.value === '' ? '' : e.target.value === 'true'
                  )}
                  className="input-field"
                >
                  <option value="">Todos</option>
                  <option value="true">Com necessidades especiais</option>
                  <option value="false">Sem necessidades especiais</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as 'name' | 'age' | 'createdAt' | 'status');
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="input-field"
                >
                  <option value="createdAt-desc">Mais recentes</option>
                  <option value="createdAt-asc">Mais antigos</option>
                  <option value="name-asc">Nome A-Z</option>
                  <option value="name-desc">Nome Z-A</option>
                  <option value="age-asc">Idade crescente</option>
                  <option value="age-desc">Idade decrescente</option>
                  <option value="status-asc">Status</option>
                </select>
              </div>

              {/* Age Range Filter */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Faixa Etária: {ageRangeFilter.min} - {ageRangeFilter.max} anos
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="18"
                    value={ageRangeFilter.min}
                    onChange={(e) => setAgeRangeFilter(prev => ({ 
                      ...prev, 
                      min: parseInt(e.target.value) 
                    }))}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">até</span>
                  <input
                    type="range"
                    min="0"
                    max="18"
                    value={ageRangeFilter.max}
                    onChange={(e) => setAgeRangeFilter(prev => ({ 
                      ...prev, 
                      max: parseInt(e.target.value) 
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Children List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="card">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          </div>
        ) : filteredChildren.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <Baby className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || statusFilter || genderFilter || specialNeedsFilter !== '' 
                  ? 'Nenhuma criança encontrada' 
                  : 'Nenhuma criança cadastrada'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter || genderFilter || specialNeedsFilter !== '' 
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece cadastrando a primeira criança no sistema.'
                }
              </p>
              {!searchTerm && !statusFilter && !genderFilter && specialNeedsFilter === '' && (
                <div className="mt-6">
                  <button className="btn-primary flex items-center space-x-2 mx-auto">
                    <Plus className="h-5 w-5" />
                    <span>Cadastrar Primeira Criança</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredChildren.map((child) => (
            <div key={child.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {child.personalInfo.name}
                      </h3>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(child.currentStatus)}`}>
                          {getStatusText(child.currentStatus)}
                        </span>
                        {child.specialNeeds.hasSpecialNeeds && (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-warm-100 text-warm-800">
                            <Heart className="h-3 w-3 mr-1" />
                            Necessidades Especiais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {getAgeText(child.personalInfo.birthDate)}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {child.personalInfo.gender === 'male' ? 'Masculino' : 'Feminino'}
                    </div>
                    
                    {child.currentPlacement && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        Em acolhimento desde {new Date(child.currentPlacement.startDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}

                    {child.legalStatus && (
                      <div className="flex items-center text-sm text-gray-600">
                        <AlertCircle className="h-4 w-4 mr-2 text-gray-400" />
                        {child.legalStatus.legalGuardian}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    {child.familyBackground.siblings.length > 0 && (
                      <p><strong>Irmãos:</strong> {child.familyBackground.siblings.length} irmão{child.familyBackground.siblings.length !== 1 ? 's' : ''}</p>
                    )}
                    {child.specialNeeds.hasSpecialNeeds && child.specialNeeds.healthConditions.length > 0 && (
                      <p><strong>Condições de saúde:</strong> {child.specialNeeds.healthConditions.join(', ')}</p>
                    )}
                  </div>
                </div>

                {showActions && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onSelectChild?.(child)}
                      className="p-2 text-gray-400 hover:text-primary-600 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (onEdit) {
                          onEdit(child.id);
                        } else if (onEditChild) {
                          onEditChild(child);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-warm-600 rounded-lg transition-colors"
                      title="Editar criança"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteChild(child)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Excluir criança"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} crianças
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadChildren({ 
                  page: pagination.page - 1, 
                  limit: pagination.limit 
                })}
                disabled={pagination.page <= 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <span className="text-sm text-gray-500">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              
              <button
                onClick={() => loadChildren({ 
                  page: pagination.page + 1, 
                  limit: pagination.limit 
                })}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChildrenList;