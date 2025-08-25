import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext.js';
import type { Family, FamilyFilters, FamilyStatus } from '../../types/index.js';
import { 
  Users, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  Eye,
  Plus,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface FamilyListProps {
  onSelectFamily?: (family: Family) => void;
  onEditFamily?: (family: Family) => void;
  onDeleteFamily?: (family: Family) => void;
  onEdit?: (familyId: string) => void; // Add this for FamiliesPage integration
  showActions?: boolean;
}

function FamilyList({ 
  onSelectFamily, 
  onEditFamily, 
  onDeleteFamily,
  onEdit, // Add this for FamiliesPage integration
  showActions = true 
}: FamilyListProps): JSX.Element {
  const {
    families,
    loadFamilies,
    deleteFamily,
    isLoading,
    error,
    pagination,
    refreshFamilies,
    clearError
  } = useFamily();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<FamilyStatus | ''>('');
  const [cityFilter, setCityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadFamiliesWithFilters();
  }, [searchTerm, statusFilter, cityFilter, sortBy, sortOrder]);

  const loadFamiliesWithFilters = async () => {
    const filters: Record<string, any> = {};
    
    if (searchTerm) {
      filters.search = searchTerm;
    }
    
    if (statusFilter) {
      filters.status = [statusFilter];
    }
    
    if (cityFilter) {
      filters.city = cityFilter;
    }

    await loadFamilies({
      filters,
      sortBy,
      sortOrder,
      page: 1,
      limit: 10
    });
  };

  const handleDeleteFamily = async (family: Family) => {
    if (window.confirm(`Tem certeza que deseja excluir a família ${family.primaryContact.name}?`)) {
      try {
        await deleteFamily(family.id);
        if (onDeleteFamily) {
          onDeleteFamily(family);
        }
      } catch (error) {
        console.error('Error deleting family:', error);
      }
    }
  };

  const getStatusColor = (status: FamilyStatus): string => {
    switch (status) {
      case 'available':
        return 'bg-caring-100 text-caring-800';
      case 'unavailable':
        return 'bg-gray-100 text-gray-800';
      case 'under_evaluation':
        return 'bg-warm-100 text-warm-800';
      case 'active_placement':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: FamilyStatus): string => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'unavailable':
        return 'Indisponível';
      case 'under_evaluation':
        return 'Em Avaliação';
      case 'active_placement':
        return 'Acolhimento Ativo';
      default:
        return status;
    }
  };

  const filteredFamilies = families.filter(family => {
    const matchesSearch = !searchTerm || 
      family.primaryContact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      family.primaryContact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      family.address.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || family.status === statusFilter;
    const matchesCity = !cityFilter || family.address.city.toLowerCase().includes(cityFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesCity;
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
            Erro ao carregar famílias
          </h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => {
                clearError();
                refreshFamilies();
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
              placeholder="Buscar famílias por nome, email ou cidade..."
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
              <span>Filtros</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={refreshFamilies}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={isLoading}
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <span className="text-sm text-gray-500">
                {filteredFamilies.length} família{filteredFamilies.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FamilyStatus | '')}
                  className="input-field"
                >
                  <option value="">Todos os status</option>
                  <option value="available">Disponível</option>
                  <option value="unavailable">Indisponível</option>
                  <option value="under_evaluation">Em Avaliação</option>
                  <option value="active_placement">Acolhimento Ativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  placeholder="Filtrar por cidade"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ordenar por
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortBy(field as 'name' | 'createdAt' | 'status');
                    setSortOrder(order as 'asc' | 'desc');
                  }}
                  className="input-field"
                >
                  <option value="createdAt-desc">Mais recentes</option>
                  <option value="createdAt-asc">Mais antigos</option>
                  <option value="name-asc">Nome A-Z</option>
                  <option value="name-desc">Nome Z-A</option>
                  <option value="status-asc">Status</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Families List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="card">
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="large" />
            </div>
          </div>
        ) : filteredFamilies.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || statusFilter || cityFilter ? 'Nenhuma família encontrada' : 'Nenhuma família cadastrada'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter || cityFilter 
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece cadastrando a primeira família no sistema.'
                }
              </p>
              {!searchTerm && !statusFilter && !cityFilter && (
                <div className="mt-6">
                  <button className="btn-primary flex items-center space-x-2 mx-auto">
                    <Plus className="h-5 w-5" />
                    <span>Cadastrar Primeira Família</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          filteredFamilies.map((family) => (
            <div key={family.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {family.primaryContact.name}
                      </h3>
                      <div className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(family.status)}`}>
                          {getStatusText(family.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {family.primaryContact.email}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {family.primaryContact.phone}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {family.address.city}, {family.address.state}
                    </div>
                  </div>

                  <div className="text-sm text-gray-500">
                    <p><strong>Composição familiar:</strong> {family.composition.length} membro{family.composition.length !== 1 ? 's' : ''}</p>
                    <p><strong>Preferências:</strong> {family.preferences.ageRange.min}-{family.preferences.ageRange.max} anos, 
                       {family.preferences.gender === 'any' ? ' qualquer gênero' : ` ${family.preferences.gender}`}
                       {family.preferences.specialNeeds ? ', aceita necessidades especiais' : ''}
                    </p>
                  </div>
                </div>

                {showActions && (
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => onSelectFamily?.(family)}
                      className="p-2 text-gray-400 hover:text-primary-600 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (onEdit) {
                          onEdit(family.id);
                        } else if (onEditFamily) {
                          onEditFamily(family);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-warm-600 rounded-lg transition-colors"
                      title="Editar família"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteFamily(family)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Excluir família"
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
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} famílias
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => loadFamilies({ 
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
                onClick={() => loadFamilies({ 
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

export default FamilyList;