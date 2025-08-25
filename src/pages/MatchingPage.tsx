import React, { useState, useEffect } from 'react';
import { useFamily } from '../contexts/FamilyContext.js';
import { useChildren } from '../contexts/ChildrenContext.js';
import { useMatching } from '../contexts/MatchingContext.js';
import { 
  GitMerge, 
  Heart, 
  Users, 
  Baby, 
  Plus,
  Star,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Target
} from 'lucide-react';
import type { Child, Family, CompatibilityScore } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function MatchingPage(): JSX.Element {
  const { families } = useFamily();
  const { children } = useChildren();
  const {
    matchings,
    recommendations,
    stats,
    isLoading,
    isCalculating,
    error,
    findCompatibleFamilies,
    createMatching,
    approveMatching,
    rejectMatching,
    refreshData,
    clearError,
    clearRecommendations
  } = useMatching();

  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedScore, setSelectedScore] = useState<CompatibilityScore | null>(null);

  // Get available children and families
  const awaitingChildren = children.filter(c => c.currentStatus === 'awaiting');
  const availableFamilies = families.filter(f => f.status === 'available');

  // Filter children based on search
  const filteredChildren = awaitingChildren.filter(child =>
    child.personalInfo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFindMatches = async (child: Child) => {
    setSelectedChild(child);
    clearRecommendations();
    await findCompatibleFamilies(child.id, 10);
  };

  const handleCreateMatching = async (score: CompatibilityScore) => {
    const success = await createMatching(score.childId, score.familyId, `Compatibility Score: ${score.overallScore}%`);
    if (success) {
      setSelectedScore(null);
      setShowCreateModal(false);
    }
  };

  const getRecommendationColor = (recommendation: string): string => {
    switch (recommendation) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderQuickStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-caring-100 rounded-lg flex items-center justify-center">
            <Baby className="h-6 w-6 text-caring-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">
              Crianças Aguardando
            </p>
            <p className="text-2xl font-bold text-gray-900">{awaitingChildren.length}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">
              Famílias Disponíveis
            </p>
            <p className="text-2xl font-bold text-gray-900">{availableFamilies.length}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-warm-100 rounded-lg flex items-center justify-center">
            <GitMerge className="h-6 w-6 text-warm-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">
              Matches Propostos
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.proposedMatchings}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">
              Score Médio
            </p>
            <p className="text-2xl font-bold text-gray-900">{stats.averageCompatibilityScore}%</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChildrenList = () => (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Crianças Aguardando Acolhimento</h3>
          <p className="text-sm text-gray-500">Selecione uma criança para encontrar famílias compatíveis</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar criança..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 w-64"
            />
          </div>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {filteredChildren.length === 0 ? (
        <div className="text-center py-12">
          <Baby className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'Nenhuma criança encontrada' : 'Nenhuma criança aguardando'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Tente ajustar o termo de busca.'
              : 'Todas as crianças estão acolhidas ou não há crianças cadastradas.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChildren.map((child) => {
            const age = new Date().getFullYear() - new Date(child.personalInfo.birthDate).getFullYear();
            return (
              <div
                key={child.id}
                className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                  selectedChild?.id === child.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">{child.personalInfo.name}</h4>
                      <span className="text-sm text-gray-500">{age} anos</span>
                      <span className="text-sm text-gray-500">
                        {child.personalInfo.gender === 'male' ? 'Masculino' : 'Feminino'}
                      </span>
                      {child.specialNeeds.hasSpecialNeeds && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-warm-100 text-warm-800">
                          <Heart className="h-3 w-3 mr-1" />
                          Necessidades Especiais
                        </span>
                      )}
                    </div>
                    {child.familyBackground.siblings.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {child.familyBackground.siblings.length} irmão{child.familyBackground.siblings.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleFindMatches(child)}
                    disabled={isCalculating}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Target className="h-4 w-4" />
                    <span>Encontrar Matches</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRecommendations = () => {
    if (!selectedChild) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Selecione uma criança
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Escolha uma criança da lista para ver as recomendações de famílias compatíveis.
            </p>
          </div>
        </div>
      );
    }

    if (isCalculating) {
      return (
        <div className="card">
          <div className="text-center py-12">
            <LoadingSpinner size="large" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              Calculando compatibilidade...
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Analisando famílias disponíveis para {selectedChild.personalInfo.name}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Recomendações para {selectedChild.personalInfo.name}
            </h3>
            <p className="text-sm text-gray-500">
              {recommendations.length} famílias compatíveis encontradas
            </p>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhuma família compatível encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Não há famílias disponíveis que atendam aos critérios desta criança.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((score) => {
              const family = families.find(f => f.id === score.familyId);
              if (!family) return null;

              return (
                <div key={score.familyId} className="border rounded-lg p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-gray-900">{family.primaryContact.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRecommendationColor(score.recommendation)}`}>
                          {score.recommendation === 'high' ? 'Alta' : 
                           score.recommendation === 'medium' ? 'Média' : 'Baixa'} Compatibilidade
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium">{score.overallScore}%</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-600 mb-3">
                        <div>Idade: {score.factors.ageRange}%</div>
                        <div>Especiais: {score.factors.specialNeeds}%</div>
                        <div>Tamanho: {score.factors.familySize}%</div>
                        <div>Experiência: {score.factors.experience}%</div>
                        <div>Disponível: {score.factors.availability}%</div>
                      </div>

                      {score.notes.length > 0 && (
                        <div className="space-y-1">
                          {score.notes.slice(0, 3).map((note, index) => (
                            <p key={index} className="text-xs text-gray-600">• {note}</p>
                          ))}
                          {score.notes.length > 3 && (
                            <p className="text-xs text-gray-500">+{score.notes.length - 3} more notes...</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedScore(score);
                          setShowCreateModal(true);
                        }}
                        className="btn-primary text-xs px-3 py-1"
                      >
                        Propor Match
                      </button>
                      <button
                        onClick={() => {
                          // Navigate to family details
                          console.log('View family details:', family.id);
                        }}
                        className="btn-secondary text-xs px-3 py-1"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPendingMatchings = () => {
    const pendingMatchings = matchings.filter(m => m.status === 'proposed');

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Matches Pendentes</h3>
            <p className="text-sm text-gray-500">{pendingMatchings.length} propostas aguardando aprovação</p>
          </div>
        </div>

        {pendingMatchings.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Nenhum match pendente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMatchings.map((matching) => {
              const child = children.find(c => c.id === matching.childId);
              const family = families.find(f => f.id === matching.familyId);
              
              if (!child || !family) return null;

              return (
                <div key={matching.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {child.personalInfo.name} → {family.primaryContact.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Score: {matching.compatibilityScore.overallScore}% • 
                        Proposto em {new Date(matching.proposedDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => approveMatching(matching.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Aprovar"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => rejectMatching(matching.id, 'Rejected by coordinator')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Rejeitar"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Erro no Sistema de Matching</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <div className="mt-6">
              <button onClick={clearError} className="btn-primary">
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sistema de Matching
          </h1>
          <p className="text-gray-600">
            Encontre a melhor compatibilidade entre famílias e crianças
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {renderQuickStats()}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Children List */}
        <div className="space-y-6">
          {renderChildrenList()}
          {renderPendingMatchings()}
        </div>

        {/* Recommendations */}
        <div>
          {renderRecommendations()}
        </div>
      </div>

      {/* Create Matching Modal */}
      {showCreateModal && selectedScore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar Proposta de Matching
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Deseja propor este matching com {selectedScore.overallScore}% de compatibilidade?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedScore(null);
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCreateMatching(selectedScore)}
                disabled={isLoading}
                className="btn-primary"
              >
                Confirmar Proposta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchingPage;