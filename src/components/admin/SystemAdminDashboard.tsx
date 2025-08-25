import React, { useState } from 'react';
import { comprehensiveSystemValidator } from '../../tests/ComprehensiveSystemValidator.js';
import TestDashboard from '../testing/TestDashboard';
import AccessibilityDashboard from '../accessibility/AccessibilityDashboard';
import { 
  Shield, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Play, 
  RefreshCw,
  Monitor,
  Heart,
  Users,
  FileText,
  Settings,
  TrendingUp,
  Eye,
  Smartphone
} from 'lucide-react';

interface SystemValidationResult {
  overall: {
    score: number;
    passed: boolean;
    timestamp: Date;
  };
  components: any;
  recommendations: string[];
  productionReadiness: {
    ready: boolean;
    blockers: string[];
    warnings: string[];
  };
}

function SystemAdminDashboard(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'crud' | 'accessibility'>('overview');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<SystemValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runComprehensiveValidation = async (): Promise<void> => {
    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const result = await comprehensiveSystemValidator.validateCompleteSystem();
      setValidationResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsValidating(false);
    }
  };

  const downloadValidationReport = (): void => {
    if (!validationResult) return;

    const report = comprehensiveSystemValidator.generateFinalReport(validationResult);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sistema-familia-acolhedora-validation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 75) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Sistema de Administração
          </h1>
          <p className="text-gray-600 mt-2">
            Família Acolhedora - Painel de validação e testes do sistema
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {validationResult && (
            <button
              onClick={downloadValidationReport}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Relatório</span>
            </button>
          )}
          
          <button
            onClick={runComprehensiveValidation}
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
                <Play className="h-5 w-5" />
                <span>Validação Completa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Status do Sistema</p>
              <p className="text-lg font-bold text-gray-900">
                {validationResult?.overall.passed ? 'Operacional' : 'Verificação Necessária'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Integridade de Dados</p>
              <p className="text-lg font-bold text-gray-900">
                {validationResult?.components.crudOperations?.passed ? 'Íntegra' : 'Verificando'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Acessibilidade</p>
              <p className="text-lg font-bold text-gray-900">
                {validationResult?.components.accessibility?.level || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Design Responsivo</p>
              <p className="text-lg font-bold text-gray-900">
                {validationResult?.components.responsiveDesign?.passed ? 'Otimizado' : 'Verificando'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Progress */}
      {isValidating && (
        <div className="card">
          <div className="flex items-center space-x-4">
            <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Executando Validação Completa do Sistema</h3>
              <p className="text-sm text-gray-600 mt-1">
                Testando CRUD, integração, acessibilidade, design responsivo e conformidade...
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-600 h-3 rounded-full animate-pulse" style={{ width: '75%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Erro na Validação</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overall Score */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Pontuação Geral</h3>
              <div className={`px-3 py-1 rounded-full font-medium ${getScoreColor(validationResult.overall.score)}`}>
                {validationResult.overall.score}/100
              </div>
            </div>
            
            <div className="space-y-3">
              {Object.entries(validationResult.components).map(([component, result]: [string, any]) => (
                <div key={component} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.passed)}
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {component.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(result.score)}`}>
                    {result.score}/100
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Production Readiness */}
          <div className="card">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Pronto para Produção</h3>
              {getStatusIcon(validationResult.productionReadiness.ready)}
            </div>
            
            {validationResult.productionReadiness.blockers.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-red-900 mb-2">Bloqueadores Críticos:</h4>
                <ul className="space-y-1">
                  {validationResult.productionReadiness.blockers.map((blocker, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResult.productionReadiness.warnings.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium text-yellow-900 mb-2">Avisos:</h4>
                <ul className="space-y-1">
                  {validationResult.productionReadiness.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-yellow-700">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {validationResult.productionReadiness.ready && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">
                    Sistema aprovado para produção!
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {validationResult && validationResult.recommendations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recomendações</h3>
          <div className="space-y-2">
            {validationResult.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-900">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Monitor },
            { id: 'validation', label: 'Validação CRUD', icon: Database },
            { id: 'accessibility', label: 'Acessibilidade', icon: Eye }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card">
          <div className="text-center py-12">
            <Heart className="mx-auto h-16 w-16 text-caring-600 mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Sistema Família Acolhedora
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Sistema completo para gestão de acolhimento familiar temporário de crianças e adolescentes 
              em situação de vulnerabilidade, desenvolvido com conformidade LGPD e regulamentações brasileiras.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[
                {
                  icon: <Users className="h-8 w-8 text-primary-600" />,
                  title: 'Gestão de Famílias',
                  description: 'Cadastro completo, avaliação e acompanhamento de famílias acolhedoras'
                },
                {
                  icon: <Heart className="h-8 w-8 text-caring-600" />,
                  title: 'Acolhimento de Crianças',
                  description: 'Processo de matching, acompanhamento e suporte especializado'
                },
                {
                  icon: <FileText className="h-8 w-8 text-warm-600" />,
                  title: 'Conformidade Legal',
                  description: 'LGPD, ECA e regulamentações brasileiras totalmente integradas'
                }
              ].map((feature, index) => (
                <div key={index} className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    {feature.icon}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'validation' && <TestDashboard />}
      {activeTab === 'accessibility' && <AccessibilityDashboard />}
    </div>
  );
}

export default SystemAdminDashboard;