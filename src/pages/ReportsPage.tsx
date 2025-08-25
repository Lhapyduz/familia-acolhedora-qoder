import React, { useState, useEffect } from 'react';
import { reportService, statisticsService } from '../services/index.js';
import ScheduleManager from '../components/reports/ScheduleManager.js';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Plus,
  Eye,
  Trash2,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Clock,
  Users,
  Baby,
  Heart,
  DollarSign,
  Settings,
  RefreshCw
} from 'lucide-react';
import type {
  ReportTemplate,
  GeneratedReport,
  Statistics,
  ReportExportOptions
} from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function ReportsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'generate' | 'templates' | 'history' | 'scheduled'>('dashboard');
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportParameters, setReportParameters] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, templatesData, reportsData] = await Promise.all([
        statisticsService.getOverallStatistics(),
        reportService.getTemplates(),
        reportService.getRecentReports(10)
      ]);
      
      setStatistics(statsData);
      setTemplates(templatesData);
      setRecentReports(reportsData);
      
      // Initialize default templates if none exist
      if (templatesData.length === 0) {
        await createDefaultTemplates();
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setError('Falha ao carregar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultTemplates = async () => {
    const defaultTemplates = [
      {
        name: 'Relatório Mensal Geral',
        description: 'Relatório completo das atividades mensais com estatísticas e gráficos',
        type: 'monthly' as const,
        sections: [
          {
            id: '1',
            title: 'Resumo Estatístico',
            type: 'statistics' as const,
            config: {},
            order: 1
          }
        ],
        parameters: [
          {
            id: 'startDate',
            name: 'startDate',
            label: 'Data de Início',
            type: 'date' as const,
            required: true
          }
        ]
      }
    ];

    try {
      for (const template of defaultTemplates) {
        await reportService.createTemplate(template);
      }
      const updatedTemplates = await reportService.getTemplates();
      setTemplates(updatedTemplates);
    } catch (error) {
      console.error('Failed to create default templates:', error);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const report = await reportService.generateReport(
        selectedTemplate.id,
        reportParameters,
        'current-user'
      );
      
      const updatedReports = await reportService.getRecentReports(10);
      setRecentReports(updatedReports);
      setActiveTab('history');
      setSelectedTemplate(null);
      setReportParameters({});
    } catch (error) {
      console.error('Failed to generate report:', error);
      setError('Falha ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportToPDF = async (reportId: string) => {
    try {
      const exportOptions: ReportExportOptions = {
        format: 'pdf',
        includeCover: true,
        includeCharts: true,
        includeTables: true,
        pageOrientation: 'portrait',
        fontSize: 'medium'
      };
      
      const downloadUrl = await reportService.exportToPDF(reportId, exportOptions);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `relatorio_${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setError('Falha ao exportar PDF. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Relatórios e Estatísticas
          </h1>
          <p className="text-gray-600">
            Gere relatórios completos e acompanhe estatísticas do programa
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="text-red-400">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Painel', icon: TrendingUp },
            { id: 'generate', label: 'Gerar Relatório', icon: FileText },
            { id: 'scheduled', label: 'Agendados', icon: Calendar },
            { id: 'templates', label: 'Modelos', icon: Settings },
            { id: 'history', label: 'Histórico', icon: Clock }
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
      {activeTab === 'dashboard' && statistics && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total de Famílias</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalFamilies}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-caring-100 rounded-lg flex items-center justify-center">
                  <Baby className="h-6 w-6 text-caring-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total de Crianças</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.totalChildren}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-warm-100 rounded-lg flex items-center justify-center">
                  <Heart className="h-6 w-6 text-warm-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Acolhimentos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.activePlacements}</p>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Utilização Orçamento</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(statistics.budgetUtilization)}%</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('generate')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-primary-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Gerar Relatório</p>
                  <p className="text-sm text-gray-500">Criar novo relatório personalizado</p>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('history')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <Clock className="h-8 w-8 text-primary-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Histórico</p>
                  <p className="text-sm text-gray-500">Ver relatórios anteriores</p>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('templates')}
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <Settings className="h-8 w-8 text-primary-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Templates</p>
                  <p className="text-sm text-gray-500">Gerenciar modelos de relatório</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Gerar Novo Relatório
            </h3>
            
            {/* Template Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Modelo
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex items-center mb-2">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Generate Button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateReport}
                disabled={!selectedTemplate || isGenerating}
                className="btn-primary flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Gerar Relatório</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Histórico de Relatórios
            </h3>
            <button
              onClick={loadInitialData}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          
          {recentReports.length === 0 ? (
            <div className="card">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">
                  Nenhum relatório encontrado
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Gere seu primeiro relatório para começar.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReports.map(report => (
                <div key={report.id} className="card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{report.name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Gerado em {new Date(report.generatedAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {report.status === 'completed' && (
                        <button
                          onClick={() => handleExportToPDF(report.id)}
                          className="p-2 text-gray-400 hover:text-primary-600 rounded-lg"
                          title="Baixar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <ScheduleManager
          templates={templates}
          onScheduleCreated={(schedule) => {
            console.log('Schedule created:', schedule);
          }}
          onScheduleUpdated={(schedule) => {
            console.log('Schedule updated:', schedule);
          }}
          onScheduleDeleted={(scheduleId) => {
            console.log('Schedule deleted:', scheduleId);
          }}
        />
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Modelos de Relatório
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-primary-600 mr-2" />
                    <h4 className="font-medium text-gray-900">{template.name}</h4>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                
                <div className="flex items-center justify-between">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                    {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
                  </span>
                  <p className="text-xs text-gray-500">
                    {template.sections.length} seções
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;