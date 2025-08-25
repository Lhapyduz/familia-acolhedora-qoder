import React, { useState } from 'react';
import { accessibilityAudit } from '../../utils/AccessibilityAudit.js';
import { 
  Eye, 
  Monitor, 
  Smartphone, 
  Tablet, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Download,
  RefreshCw,
  Shield,
  Accessibility,
  Users,
  Zap
} from 'lucide-react';

interface AuditResult {
  score: number;
  level: 'A' | 'AA' | 'AAA';
  issues: any[];
  responsiveChecks: any[];
  recommendations: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

function AccessibilityDashboard(): JSX.Element {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAudit = async (): Promise<void> => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const auditResult = await accessibilityAudit.performAudit();
      setResult(auditResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = (): void => {
    if (!result) return;

    const report = accessibilityAudit.generateReport(result);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accessibility-audit-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'serious':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'moderate':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'minor':
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getBreakpointIcon = (breakpoint: string) => {
    switch (breakpoint) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      case 'large':
        return <Monitor className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Auditoria de Acessibilidade
          </h1>
          <p className="text-gray-600">
            Verificação de conformidade WCAG 2.1 e design responsivo
          </p>
        </div>
        
        <button
          onClick={runAudit}
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
              <Eye className="h-5 w-5" />
              <span>Executar Auditoria</span>
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
              <h3 className="font-medium text-gray-900">Executando Auditoria de Acessibilidade</h3>
              <p className="text-sm text-gray-600">
                Verificando conformidade WCAG, design responsivo e usabilidade...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Erro na Auditoria</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getScoreColor(result.score)}`}>
                  <Shield className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pontuação Geral</p>
                  <p className="text-2xl font-bold text-gray-900">{result.score}/100</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Accessibility className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Nível WCAG</p>
                  <p className="text-2xl font-bold text-gray-900">{result.level}</p>
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
                  <p className="text-2xl font-bold text-green-900">{result.summary.passed}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Problemas</p>
                  <p className="text-2xl font-bold text-red-900">{result.summary.failed}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={downloadReport}
              className="btn-secondary flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Relatório</span>
            </button>
          </div>

          {/* Responsive Design Checks */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Verificação de Design Responsivo
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.responsiveChecks.map((check, index) => (
                <div key={index} className={`p-4 rounded-lg border ${
                  check.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center space-x-3 mb-2">
                    {getBreakpointIcon(check.breakpoint)}
                    <span className="font-medium text-gray-900 capitalize">
                      {check.breakpoint}
                    </span>
                    {check.passed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  
                  {check.issues.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">Problemas:</p>
                      <ul className="list-disc list-inside mt-1">
                        {check.issues.slice(0, 2).map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                        {check.issues.length > 2 && (
                          <li>+{check.issues.length - 2} mais...</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Issues by Severity */}
          {result.issues.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Problemas de Acessibilidade
              </h3>
              
              <div className="space-y-4">
                {['critical', 'serious', 'moderate', 'minor'].map(severity => {
                  const severityIssues = result.issues.filter(issue => issue.impact === severity);
                  
                  if (severityIssues.length === 0) return null;
                  
                  return (
                    <div key={severity} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        {getImpactIcon(severity)}
                        <h4 className="font-medium text-gray-900 capitalize">
                          {severity === 'critical' ? 'Crítico' :
                           severity === 'serious' ? 'Sério' :
                           severity === 'moderate' ? 'Moderado' : 'Menor'} 
                          ({severityIssues.length})
                        </h4>
                      </div>
                      
                      <div className="space-y-3">
                        {severityIssues.slice(0, 3).map((issue, index) => (
                          <div key={index} className="bg-gray-50 rounded p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{issue.description}</p>
                                <p className="text-sm text-gray-600 mt-1">
                                  Critério: {issue.criterion}
                                </p>
                                <p className="text-sm text-blue-600 mt-1">
                                  Solução: {issue.fix}
                                </p>
                              </div>
                              <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                                {issue.element}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        {severityIssues.length > 3 && (
                          <p className="text-sm text-gray-500 text-center">
                            +{severityIssues.length - 3} problemas adicionais...
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Recomendações
            </h3>
            
            <div className="space-y-3">
              {result.recommendations.slice(0, 8).map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Best Practices */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Boas Práticas de Acessibilidade
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: <Users className="h-5 w-5 text-purple-600" />,
                  title: 'Teste com Usuários',
                  description: 'Realize testes com pessoas que usam tecnologias assistivas'
                },
                {
                  icon: <Shield className="h-5 w-5 text-green-600" />,
                  title: 'Automação',
                  description: 'Integre verificações de acessibilidade no seu pipeline CI/CD'
                },
                {
                  icon: <Eye className="h-5 w-5 text-blue-600" />,
                  title: 'Design Inclusivo',
                  description: 'Considere acessibilidade desde a fase de design'
                },
                {
                  icon: <Monitor className="h-5 w-5 text-orange-600" />,
                  title: 'Testes Dispositivos',
                  description: 'Teste em múltiplos dispositivos e tamanhos de tela'
                },
                {
                  icon: <Accessibility className="h-5 w-5 text-indigo-600" />,
                  title: 'WCAG 2.1',
                  description: 'Siga as diretrizes WCAG 2.1 AA como padrão mínimo'
                },
                {
                  icon: <RefreshCw className="h-5 w-5 text-teal-600" />,
                  title: 'Auditoria Regular',
                  description: 'Execute auditorias de acessibilidade regularmente'
                }
              ].map((practice, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    {practice.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{practice.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{practice.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Initial State */}
      {!result && !isRunning && !error && (
        <div className="card">
          <div className="text-center py-12">
            <Accessibility className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Auditoria de Acessibilidade
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Execute uma auditoria completa para verificar conformidade WCAG e design responsivo.
            </p>
            <div className="mt-6">
              <button
                onClick={runAudit}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <Eye className="h-4 w-4" />
                <span>Iniciar Auditoria</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccessibilityDashboard;