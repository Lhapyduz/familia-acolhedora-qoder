import React, { useState } from 'react';
import { crudValidation } from '../../tests/CRUDValidation.js';
import { 
  Play, 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  FileText,
  Database,
  Shield
} from 'lucide-react';

interface ValidationResult {
  name: string;
  status: 'PASSED' | 'FAILED';
  duration: number;
  message: string;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  totalDuration: number;
  results: ValidationResult[];
  testData: any;
}

function TestDashboard(): JSX.Element {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const runValidation = async (): Promise<void> => {
    setIsRunning(true);
    setError(null);
    setSummary(null);
    setCurrentTest('Initializing validation...');

    try {
      // Listen for progress updates (simplified)
      const originalLog = console.log;
      console.log = (message: string) => {
        if (typeof message === 'string' && (message.includes('✅') || message.includes('❌'))) {
          setCurrentTest(message);
        }
        originalLog(message);
      };

      const result = await crudValidation.validateAllOperations();
      setSummary(result);
      setCurrentTest('Validation completed');
      
      // Restore console.log
      console.log = originalLog;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setCurrentTest('Validation failed');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'text-green-600 bg-green-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Sistema de Validação CRUD
          </h1>
          <p className="text-gray-600">
            Teste e validação de todas as operações do sistema
          </p>
        </div>
        
        <button
          onClick={runValidation}
          disabled={isRunning}
          className="btn-primary flex items-center space-x-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Executando...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>Executar Validação</span>
            </>
          )}
        </button>
      </div>

      {/* Current Status */}
      {isRunning && (
        <div className="card">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            <div>
              <h3 className="font-medium text-gray-900">Executando Validação</h3>
              <p className="text-sm text-gray-600">{currentTest}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Erro na Validação</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Testes</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aprovados</p>
                <p className="text-2xl font-bold text-green-900">{summary.passed}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Falharam</p>
                <p className="text-2xl font-bold text-red-900">{summary.failed}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-purple-900">{summary.passRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {summary && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Resultados Detalhados
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>Tempo Total: {summary.totalDuration}ms</span>
              <span>Média: {(summary.totalDuration / summary.total).toFixed(1)}ms/teste</span>
            </div>
          </div>

          <div className="space-y-3">
            {summary.results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  result.status === 'PASSED' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(result.status)}
                    <span className="font-medium text-gray-900">{result.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{result.duration}ms</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(result.status)}`}>
                      {result.status}
                    </span>
                  </div>
                </div>
                {result.message && (
                  <p className="mt-2 text-sm text-gray-600">{result.message}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Coverage Info */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Cobertura de Testes
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Gerenciamento de Usuários', icon: '👥', status: 'covered' },
            { name: 'Gerenciamento de Famílias', icon: '👨‍👩‍👧‍👦', status: 'covered' },
            { name: 'Gerenciamento de Crianças', icon: '👶', status: 'covered' },
            { name: 'Gerenciamento de Acolhimentos', icon: '🏠', status: 'covered' },
            { name: 'Sistema de Orçamento', icon: '💰', status: 'covered' },
            { name: 'Auditoria LGPD', icon: '📝', status: 'covered' },
            { name: 'Integridade de Dados', icon: '🔗', status: 'covered' },
            { name: 'Sincronização', icon: '🔄', status: 'covered' }
          ].map((item, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Check className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">Coberto</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Recomendações
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Validação Contínua</p>
              <p className="text-sm text-gray-600">Execute esta validação regularmente para garantir a integridade do sistema</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Database className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Backup de Dados</p>
              <p className="text-sm text-gray-600">Mantenha backups regulares dos dados de teste para restauração</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Documentação</p>
              <p className="text-sm text-gray-600">Documente qualquer falha encontrada para análise posterior</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestDashboard;