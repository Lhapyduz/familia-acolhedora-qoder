import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { useBudget } from '../contexts/BudgetContext.js';
import { statisticsService } from '../services/index.js';
import type { Statistics } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import { 
  Users, 
  Baby, 
  Heart, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Home
} from 'lucide-react';

function Dashboard(): JSX.Element {
  const { user, isCoordinator } = useAuth();
  const { budgetSummary, loadBudgetSummary, getBudgetUtilizationPercentage } = useBudget();
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load statistics and budget data in parallel
      const [statsResult] = await Promise.all([
        statisticsService.getOverallStatistics(),
        loadBudgetSummary()
      ]);

      setStatistics(statsResult);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="mx-auto h-12 w-12 text-red-400">
          <AlertCircle className="h-full w-full" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Erro ao carregar dashboard
        </h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={loadDashboardData}
            className="btn-primary"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const budgetUtilization = getBudgetUtilizationPercentage();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Bem-vindo, {user?.name}!
            </h1>
            <p className="text-primary-100">
              {user?.role === 'coordinator' 
                ? 'Visão geral completa do programa Família Acolhedora'
                : 'Suas atividades e acompanhamentos em andamento'
              }
            </p>
          </div>
          <div className="hidden sm:block">
            <Heart className="h-16 w-16 text-primary-200" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Families */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Total de Famílias
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics?.totalFamilies || 0}
              </p>
              <p className="text-sm text-caring-600">
                {statistics?.availableFamilies || 0} disponíveis
              </p>
            </div>
          </div>
        </div>

        {/* Total Children */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-caring-100 rounded-lg flex items-center justify-center">
                <Baby className="h-6 w-6 text-caring-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Crianças Cadastradas
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics?.totalChildren || 0}
              </p>
              <p className="text-sm text-warm-600">
                {statistics?.childrenAwaiting || 0} aguardando
              </p>
            </div>
          </div>
        </div>

        {/* Active Placements */}
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-warm-100 rounded-lg flex items-center justify-center">
                <Home className="h-6 w-6 text-warm-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Acolhimentos Ativos
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics?.activePlacements || 0}
              </p>
              <p className="text-sm text-gray-500">
                {statistics?.childrenInPlacement || 0} crianças acolhidas
              </p>
            </div>
          </div>
        </div>

        {/* Budget Utilization (Coordinator only) */}
        {isCoordinator() && (
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Utilização do Orçamento
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {budgetUtilization.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">
                  R$ {(budgetSummary?.availableBudget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} disponível
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Charts and Detailed Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Placement Stats */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Estatísticas de Acolhimento
            </h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-caring-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  Acolhimentos Concluídos
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {statistics?.completedPlacements || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-primary-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  Duração Média (dias)
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {Math.round(statistics?.averagePlacementDuration || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Home className="h-5 w-5 text-warm-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">
                  Taxa de Ocupação
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {statistics?.totalFamilies && statistics?.activePlacements
                  ? Math.round((statistics.activePlacements / statistics.totalFamilies) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Ações Rápidas
            </h3>
          </div>
          
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    Cadastrar Nova Família
                  </p>
                  <p className="text-sm text-gray-500">
                    Adicionar família ao programa
                  </p>
                </div>
              </div>
            </button>

            <button className="w-full text-left p-3 bg-caring-50 hover:bg-caring-100 rounded-lg transition-colors duration-200">
              <div className="flex items-center">
                <Baby className="h-5 w-5 text-caring-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    Cadastrar Criança
                  </p>
                  <p className="text-sm text-gray-500">
                    Registrar nova criança
                  </p>
                </div>
              </div>
            </button>

            <button className="w-full text-left p-3 bg-warm-50 hover:bg-warm-100 rounded-lg transition-colors duration-200">
              <div className="flex items-center">
                <Heart className="h-5 w-5 text-warm-600 mr-3" />
                <div>
                  <p className="font-medium text-gray-900">
                    Realizar Matching
                  </p>
                  <p className="text-sm text-gray-500">
                    Encontrar famílias compatíveis
                  </p>
                </div>
              </div>
            </button>

            {isCoordinator() && (
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Gerenciar Orçamento
                    </p>
                    <p className="text-sm text-gray-500">
                      Configurar recursos disponíveis
                    </p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity or Alerts */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Atividades Recentes
          </h3>
          <button className="text-sm text-primary-600 hover:text-primary-500 font-medium">
            Ver todas
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mt-1">
              <div className="h-2 w-2 bg-caring-600 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                Nova família <span className="font-medium">Silva</span> foi cadastrada e está aguardando avaliação
              </p>
              <p className="text-xs text-gray-500 mt-1">
                2 horas atrás
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mt-1">
              <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                Acolhimento de <span className="font-medium">João</span> foi iniciado com a família <span className="font-medium">Santos</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                1 dia atrás
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 mt-1">
              <div className="h-2 w-2 bg-warm-600 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                Relatório mensal foi enviado para o Ministério Público
              </p>
              <p className="text-xs text-gray-500 mt-1">
                3 dias atrás
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;