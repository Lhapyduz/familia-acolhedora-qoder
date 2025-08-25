import React, { useState, useEffect } from 'react';
import { brazilianBudgetValidator } from '../../validators/BrazilianBudgetValidator.js';
import {
  DollarSign,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Play,
  RefreshCw,
  FileText,
  Shield,
  TrendingUp,
  Calculator,
  Scale,
  MapPin,
  Users,
  Heart,
  BookOpen,
  Activity
} from 'lucide-react';

interface ValidationSummary {
  total: number;
  compliant: number;
  nonCompliant: number;
  complianceRate: number;
  results: Array<{
    placementId: string;
    result: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      calculatedValues: any;
      complianceChecks: any;
      recommendations: string[];
    };
  }>;
}

interface ComplianceReport {
  summary: {
    totalPlacements: number;
    compliantPlacements: number;
    nonCompliantPlacements: number;
    complianceRate: number;
    totalBudgetAllocated: number;
    averageBenefit: number;
  };
  violations: Array<{
    type: string;
    count: number;
    impact: 'low' | 'medium' | 'high';
    description: string;
  }>;
  recommendations: string[];
}

function BudgetValidationDashboard(): JSX.Element {
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async (): Promise<void> => {
    setIsValidating(true);
    setError(null);

    try {
      const [summary, report] = await Promise.all([
        brazilianBudgetValidator.validateAllPlacements(),
        brazilianBudgetValidator.generateComplianceReport()
      ]);

      setValidationSummary(summary);
      setComplianceReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, []);

  const getComplianceColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600 bg-green-100';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getImpactColor = (impact: string): string => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderSummaryCards = () => {
    if (!complianceReport) return null;

    const { summary } = complianceReport;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Acolhimentos</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalPlacements}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Em Conformidade</p>
              <p className="text-2xl font-bold text-green-900">{summary.compliantPlacements}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Não Conformes</p>
              <p className="text-2xl font-bold text-red-900">{summary.nonCompliantPlacements}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taxa de Conformidade</p>
              <p className="text-2xl font-bold text-purple-900">{summary.complianceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComplianceChecks = () => {
    if (!validationSummary || validationSummary.results.length === 0) return null;

    const firstResult = validationSummary.results[0].result;
    const checks = firstResult.complianceChecks;

    return (
      <div className="card mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Verificações de Conformidade
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'Salário Mínimo',
              icon: DollarSign,
              status: checks.minimumWageCompliance,
              description: 'Conformidade com salário mínimo brasileiro'
            },
            {
              name: 'Benefício Máximo',
              icon: Scale,
              status: checks.maximumBenefitCompliance,
              description: 'Respeito ao limite máximo de benefícios'
            },
            {
              name: 'Adequação Regional',
              icon: MapPin,
              status: checks.regionalCompliance,
              description: 'Aplicação de multiplicadores regionais'
            },
            {
              name: 'Faixa Etária',
              icon: Users,
              status: checks.ageGroupCompliance,
              description: 'Adequação à faixa etária da criança'
            },
            {
              name: 'Necessidades Especiais',
              icon: Heart,
              status: checks.specialNeedsCompliance,
              description: 'Suporte para necessidades especiais'
            },
            {
              name: 'Documentação',
              icon: BookOpen,
              status: checks.documentationCompliance,
              description: 'Documentação completa conforme ECA'
            }
          ].map((check, index) => {
            const Icon = check.icon;
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  check.status 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className={`h-5 w-5 ${check.status ? 'text-green-600' : 'text-red-600'}`} />
                    <span className="font-medium text-gray-900">{check.name}</span>
                  </div>
                  {check.status ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{check.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderViolations = () => {
    if (!complianceReport || complianceReport.violations.length === 0) return null;

    return (
      <div className="card mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Violações Identificadas
        </h3>
        
        <div className="space-y-4">
          {complianceReport.violations.map((violation, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getImpactColor(violation.impact)} border-opacity-20`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    violation.impact === 'high' ? 'text-red-600' :
                    violation.impact === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                  <span className="font-medium text-gray-900">{violation.description}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{violation.count} casos</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getImpactColor(violation.impact)}`}>
                    {violation.impact.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCalculatedValues = () => {
    if (!validationSummary || validationSummary.results.length === 0) return null;

    const result = validationSummary.results[0].result;
    const calculated = result.calculatedValues;

    return (
      <div className="card mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Valores Calculados (Exemplo)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Benefício Base</span>
              <span className="font-medium">R$ {calculated.baseBenefit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Suporte Necessidades Especiais</span>
              <span className="font-medium">R$ {calculated.specialNeedsSupport.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Suporte Grupo de Irmãos</span>
              <span className="font-medium">R$ {calculated.siblingSupport.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Auxílio Saúde</span>
              <span className="font-medium">R$ {calculated.healthcareSupport.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Auxílio Educação</span>
              <span className="font-medium">R$ {calculated.educationSupport.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Auxílio Vestuário</span>
              <span className="font-medium">R$ {calculated.clothingSupport.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">Auxílio Transporte</span>
              <span className="font-medium">R$ {calculated.transportSupport.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b-2 border-gray-400 font-bold">
              <span className="text-gray-900">Total Mensal</span>
              <span className="text-lg">R$ {calculated.totalMonthly.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (!complianceReport || complianceReport.recommendations.length === 0) return null;

    return (
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          Recomendações do Sistema
        </h3>
        
        <div className="space-y-3">
          {complianceReport.recommendations.map((recommendation, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-900">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Validação de Orçamento Brasileiro
          </h1>
          <p className="text-gray-600">
            Verificação de conformidade com regulamentações brasileiras de acolhimento familiar
          </p>
        </div>
        
        <button
          onClick={runValidation}
          disabled={isValidating}
          className="btn-primary flex items-center space-x-2"
        >
          {isValidating ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Validando...</span>
            </>
          ) : (
            <>
              <Calculator className="h-5 w-5" />
              <span>Executar Validação</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Erro na Validação</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isValidating && (
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Validando Orçamentos
              </h3>
              <p className="text-gray-600">
                Verificando conformidade com regulamentações brasileiras...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Compliance Checks */}
      {renderComplianceChecks()}

      {/* Violations */}
      {renderViolations()}

      {/* Calculated Values */}
      {renderCalculatedValues()}

      {/* Recommendations */}
      {renderRecommendations()}

      {/* Brazilian Regulations Info */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Regulamentações Brasileiras
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Base Legal</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Lei 8.069/90 (Estatuto da Criança e do Adolescente)</li>
              <li>• Lei 12.010/09 (Lei Nacional de Adoção)</li>
              <li>• Resolução CONANDA nº 151/2009</li>
              <li>• Orientações Técnicas para Serviços de Acolhimento</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Valores de Referência 2024</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Salário Mínimo: R$ 1.412,00</li>
              <li>• Benefício Base: 1 salário mínimo</li>
              <li>• Necessidades Especiais: +50%</li>
              <li>• Grupos de Irmãos: +30% por irmão adicional</li>
              <li>• Auxílio Saúde: R$ 200,00</li>
              <li>• Auxílio Educação: R$ 150,00</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetValidationDashboard;