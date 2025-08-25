import React, { useState, useEffect } from 'react';
import { useFamily } from '../../contexts/FamilyContext.js';
import { useChildren } from '../../contexts/ChildrenContext.js';
import ApproximationTimeline from '../matching/ApproximationTimeline.js';
import { 
  Play,
  Pause,
  Square,
  Clock, 
  Users, 
  Calendar, 
  CheckCircle,
  AlertCircle,
  FileText,
  Star,
  TrendingUp,
  ArrowRight,
  Eye,
  Edit,
  Plus,
  Download,
  Printer
} from 'lucide-react';
import type { 
  Placement, 
  ApproximationProcess, 
  ApproximationStage, 
  Child, 
  Family,
  PlacementStatus 
} from '../../types/index.js';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface PlacementWorkflowProps {
  placement: Placement;
  onUpdatePlacement: (updates: Partial<Placement>) => Promise<void>;
  onGenerateReport?: () => void;
  readonly?: boolean;
}

interface WorkflowMetrics {
  totalDays: number;
  completedStages: number;
  totalStages: number;
  expectedProgress: number;
  actualProgress: number;
  isOnTrack: boolean;
  nextMilestone: ApproximationStage | null;
}

function PlacementWorkflow({ 
  placement, 
  onUpdatePlacement, 
  onGenerateReport,
  readonly = false 
}: PlacementWorkflowProps): JSX.Element {
  const { families } = useFamily();
  const { children } = useChildren();
  const [isLoading, setIsLoading] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'notes' | 'reports'>('overview');

  const child = children.find(c => c.id === placement.childId);
  const family = families.find(f => f.id === placement.familyId);

  if (!child || !family) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Dados não encontrados
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Não foi possível encontrar a criança ou família relacionada a este acolhimento.
          </p>
        </div>
      </div>
    );
  }

  const calculateMetrics = (): WorkflowMetrics => {
    const process = placement.approximationProcess;
    const startDate = new Date(process.startDate);
    const currentDate = new Date();
    const totalDays = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const completedStages = process.stages.filter(s => s.completed).length;
    const totalStages = process.stages.length;
    const actualProgress = Math.round((completedStages / totalStages) * 100);
    
    const expectedProgress = Math.min(100, Math.round((totalDays / process.expectedDuration) * 100));
    const isOnTrack = actualProgress >= expectedProgress - 15; // 15% tolerance
    
    const nextMilestone = process.stages.find(s => !s.completed) || null;

    return {
      totalDays,
      completedStages,
      totalStages,
      expectedProgress,
      actualProgress,
      isOnTrack,
      nextMilestone
    };
  };

  const metrics = calculateMetrics();

  const getStatusColor = (status: PlacementStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'interrupted':
        return 'bg-red-100 text-red-800';
      case 'transferred':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PlacementStatus): string => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'completed':
        return 'Concluído';
      case 'interrupted':
        return 'Interrompido';
      case 'transferred':
        return 'Transferido';
      default:
        return status;
    }
  };

  const handleUpdateStage = async (stageId: string, updates: Partial<ApproximationStage>) => {
    try {
      setIsLoading(true);
      
      const updatedStages = placement.approximationProcess.stages.map(stage => 
        stage.id === stageId ? { ...stage, ...updates } : stage
      );

      // Update current stage if this stage was just completed
      let currentStage = placement.approximationProcess.currentStage;
      if (updates.completed) {
        const currentIndex = updatedStages.findIndex(s => s.id === stageId);
        const nextStage = updatedStages[currentIndex + 1];
        if (nextStage && !nextStage.completed) {
          currentStage = nextStage.id;
        }
      }

      const updatedProcess: ApproximationProcess = {
        ...placement.approximationProcess,
        stages: updatedStages,
        currentStage
      };

      await onUpdatePlacement({
        approximationProcess: updatedProcess
      });
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Erro ao atualizar etapa. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async (stageId: string, note: string) => {
    const stage = placement.approximationProcess.stages.find(s => s.id === stageId);
    if (!stage) return;

    const existingNotes = stage.notes || '';
    const separator = existingNotes ? '\n\n' : '';
    const timestamp = new Date().toLocaleString('pt-BR');
    const updatedNotes = `${existingNotes}${separator}[${timestamp}] ${note}`;

    await handleUpdateStage(stageId, { notes: updatedNotes });
  };

  const handleStatusChange = async (newStatus: PlacementStatus) => {
    if (!confirm(`Tem certeza que deseja alterar o status para "${getStatusText(newStatus)}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const updates: Partial<Placement> = { status: newStatus };
      
      if (newStatus === 'completed' || newStatus === 'interrupted') {
        updates.endDate = new Date();
      }

      await onUpdatePlacement(updates);
    } catch (error) {
      console.error('Error updating placement status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Progresso Geral</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.actualProgress}%
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${metrics.isOnTrack ? 'bg-blue-600' : 'bg-red-600'}`}
                style={{ width: `${metrics.actualProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {metrics.completedStages} de {metrics.totalStages} etapas concluídas
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tempo Decorrido</p>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalDays} dias
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Prazo previsto: {placement.approximationProcess.expectedDuration} dias
            </p>
            <div className="flex items-center mt-1">
              {metrics.isOnTrack ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-xs font-medium ${metrics.isOnTrack ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.isOnTrack ? 'No prazo' : 'Atrasado'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Próxima Etapa</p>
              <p className="text-sm font-bold text-gray-900">
                {metrics.nextMilestone?.name || 'Todas concluídas'}
              </p>
            </div>
          </div>
          {metrics.nextMilestone && (
            <div className="mt-4">
              <p className="text-xs text-gray-500">
                {metrics.nextMilestone.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Placement Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhes do Acolhimento</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Criança
                </label>
                <p className="text-sm text-gray-900">{child.personalInfo.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Família Acolhedora
                </label>
                <p className="text-sm text-gray-900">{family.primaryContact.name}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Início
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(placement.startDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(placement.status)}`}>
                  {getStatusText(placement.status)}
                </span>
              </div>
            </div>

            {placement.endDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Término
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(placement.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            {!readonly && placement.status === 'active' && (
              <>
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>Concluir Acolhimento</span>
                </button>
                
                <button
                  onClick={() => handleStatusChange('interrupted')}
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                >
                  <Square className="h-4 w-4" />
                  <span>Interromper Acolhimento</span>
                </button>
              </>
            )}
            
            {onGenerateReport && (
              <button
                onClick={onGenerateReport}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Gerar Relatório</span>
              </button>
            )}
            
            <button
              onClick={() => window.print()}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir Detalhes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="space-y-6">
      <ApproximationTimeline
        process={placement.approximationProcess}
        child={child}
        family={family}
        onUpdateStage={handleUpdateStage}
        onAddNote={handleAddNote}
        isEditable={!readonly && placement.status === 'active'}
      />
    </div>
  );

  const renderNotes = () => (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Observações Gerais</h3>
      <div className="space-y-4">
        {placement.approximationProcess.stages
          .filter(stage => stage.notes)
          .map(stage => (
            <div key={stage.id} className="border-l-4 border-blue-200 pl-4">
              <h4 className="font-medium text-gray-900">{stage.name}</h4>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                {stage.notes}
              </p>
            </div>
          ))}
        
        {placement.approximationProcess.stages.every(stage => !stage.notes) && (
          <p className="text-gray-500 text-center py-8">
            Nenhuma observação registrada ainda.
          </p>
        )}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Relatórios</h3>
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900">Relatórios de Acompanhamento</h4>
          <p className="text-sm text-gray-600 mt-1">
            {placement.reports?.length || 0} relatórios disponíveis
          </p>
          <button className="btn-secondary mt-2 text-sm">
            Ver Relatórios
          </button>
        </div>
        
        <div className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900">Visitas Técnicas</h4>
          <p className="text-sm text-gray-600 mt-1">
            {placement.visits?.length || 0} visitas realizadas
          </p>
          <button 
            onClick={() => window.location.href = `/visits?placement=${placement.id}`}
            className="btn-secondary mt-2 text-sm"
          >
            Ver Visitas
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Acolhimento: {child.personalInfo.name}
          </h1>
          <p className="text-gray-600">
            Família {family.primaryContact.name} • ID: {placement.id}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(placement.status)}`}>
            {getStatusText(placement.status)}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Visão Geral', icon: Eye },
            { id: 'timeline', label: 'Cronograma', icon: Calendar },
            { id: 'notes', label: 'Observações', icon: FileText },
            { id: 'reports', label: 'Relatórios', icon: Download }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'notes' && renderNotes()}
        {activeTab === 'reports' && renderReports()}
      </div>
    </div>
  );
}

export default PlacementWorkflow;