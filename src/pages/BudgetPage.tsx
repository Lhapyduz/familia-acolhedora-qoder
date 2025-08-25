import React, { useEffect, useState } from 'react';
import { useBudget, useBudgetCalculations } from '../contexts/BudgetContext.js';
import { DollarSign, TrendingUp, Settings, Calculator, Info } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function BudgetPage(): JSX.Element {
  const {
    budgetSummary,
    loadBudgetSummary,
    isLoading,
    error,
    getBudgetUtilizationPercentage,
    getTotalBudgetFormatted,
    getAllocatedBudgetFormatted,
    getAvailableBudgetFormatted
  } = useBudget();

  const {
    minimumWage,
    siblingMultiplier,
    specialNeedsMultiplier,
    formatCurrency
  } = useBudgetCalculations();

  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  useEffect(() => {
    loadBudgetSummary();
  }, [loadBudgetSummary]);

  const budgetUtilization = getBudgetUtilizationPercentage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestão de Orçamento
          </h1>
          <p className="text-gray-600">
            Controle e acompanhamento dos recursos do programa
          </p>
        </div>
        <button 
          onClick={() => setShowBudgetForm(!showBudgetForm)}
          className="btn-primary flex items-center space-x-2"
        >
          <Settings className="h-5 w-5" />
          <span>Configurar Orçamento</span>
        </button>
      </div>

      {/* Budget Configuration Form */}
      {showBudgetForm && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuração do Orçamento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orçamento Total Anual
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <input
                  type="number"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="input-field pl-8"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button className="btn-primary">
                Atualizar Orçamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Orçamento Total
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {getTotalBudgetFormatted()}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Orçamento Alocado
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {getAllocatedBudgetFormatted()}
              </p>
              <p className="text-sm text-gray-500">
                {budgetUtilization.toFixed(1)}% utilizado
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Orçamento Disponível
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {getAvailableBudgetFormatted()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Utilization Chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Utilização do Orçamento
          </h3>
          <span className="text-sm text-gray-500">
            {budgetSummary?.activePlacements || 0} acolhimentos ativos
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-green-500 to-orange-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-600">
          <span>0%</span>
          <span className="font-medium">{budgetUtilization.toFixed(1)}% utilizado</span>
          <span>100%</span>
        </div>
      </div>

      {/* Brazilian Budget Rules */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Calculator className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">
            Regras de Cálculo do Orçamento
          </h3>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                Valores baseados na legislação brasileira para programas de acolhimento familiar
              </p>
              <p>
                Os cálculos seguem as diretrizes do salário mínimo brasileiro vigente.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              Custo Base por Criança
            </h4>
            <p className="text-2xl font-bold text-primary-600">
              {formatCurrency(minimumWage)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Equivale a 1 salário mínimo brasileiro
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              Adicional por Irmão
            </h4>
            <p className="text-2xl font-bold text-caring-600">
              +{(siblingMultiplier * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrency(minimumWage * siblingMultiplier)} por irmão adicional
            </p>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">
              Necessidades Especiais
            </h4>
            <p className="text-2xl font-bold text-warm-600">
              +{(specialNeedsMultiplier * 100).toFixed(0)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrency(minimumWage * specialNeedsMultiplier)} adicional
            </p>
          </div>
        </div>

        {/* Calculation Examples */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Exemplos de Cálculo
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>1 criança sem necessidades especiais:</span>
              <span className="font-medium">{formatCurrency(minimumWage)}</span>
            </div>
            <div className="flex justify-between">
              <span>1 criança com necessidades especiais:</span>
              <span className="font-medium">
                {formatCurrency(minimumWage + (minimumWage * specialNeedsMultiplier))}
              </span>
            </div>
            <div className="flex justify-between">
              <span>2 irmãos sem necessidades especiais:</span>
              <span className="font-medium">
                {formatCurrency(minimumWage + (minimumWage * siblingMultiplier))}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2">
              <span>2 irmãos, 1 com necessidades especiais:</span>
              <span className="font-medium">
                {formatCurrency(
                  minimumWage + 
                  (minimumWage * specialNeedsMultiplier) + 
                  (minimumWage * siblingMultiplier)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Budget History */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Histórico de Transações
        </h3>
        
        <div className="text-center py-8">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h4 className="mt-2 text-sm font-medium text-gray-900">
            Nenhuma transação encontrada
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            As transações aparecerão aqui conforme os acolhimentos forem realizados.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BudgetPage;