import React, { useState, useEffect } from 'react';
import { reportSchedulerService, reportService } from '../../services/index.js';
import { 
  Clock,
  Play,
  Pause,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Mail,
  Settings,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Eye,
  Zap
} from 'lucide-react';
import type { 
  ScheduledReport, 
  ReportTemplate,
  EntityId 
} from '../../types/index.js';
import LoadingSpinner from '../ui/LoadingSpinner.js';

interface ScheduleManagerProps {
  templates: ReportTemplate[];
  onScheduleCreated?: (schedule: ScheduledReport) => void;
  onScheduleUpdated?: (schedule: ScheduledReport) => void;
  onScheduleDeleted?: (scheduleId: EntityId) => void;
}

interface SchedulerStatus {
  isRunning: boolean;
  activeSchedules: number;
  nextScheduledRun: Date | null;
  lastProcessedAt: Date | null;
  todayGenerated: number;
  weekGenerated: number;
}

interface CreateScheduleForm {
  templateId: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  isActive: boolean;
}

function ScheduleManager({ 
  templates, 
  onScheduleCreated,
  onScheduleUpdated,
  onScheduleDeleted 
}: ScheduleManagerProps): JSX.Element {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [createForm, setCreateForm] = useState<CreateScheduleForm>({
    templateId: '',
    name: '',
    frequency: 'monthly',
    time: '09:00',
    recipients: [],
    isActive: true
  });
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    loadSchedules();
    loadStatus();
    
    // Set up interval to refresh status
    const statusInterval = setInterval(() => {
      loadStatus();
    }, 30000); // Every 30 seconds

    return () => clearInterval(statusInterval);
  }, []);

  const loadSchedules = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const schedules = await reportService.getScheduledReports();
      setScheduledReports(schedules);
    } catch (error) {
      console.error('Error loading scheduled reports:', error);
      alert('Erro ao carregar relatórios agendados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatus = async (): Promise<void> => {
    try {
      const status = await reportSchedulerService.getSchedulerStatus();
      setSchedulerStatus(status);
    } catch (error) {
      console.error('Error loading scheduler status:', error);
    }
  };

  const handleStartScheduler = async (): Promise<void> => {
    try {
      reportSchedulerService.startScheduler();
      await loadStatus();
    } catch (error) {
      console.error('Error starting scheduler:', error);
      alert('Erro ao iniciar agendador. Tente novamente.');
    }
  };

  const handleStopScheduler = async (): Promise<void> => {
    try {
      reportSchedulerService.stopScheduler();
      await loadStatus();
    } catch (error) {
      console.error('Error stopping scheduler:', error);
      alert('Erro ao parar agendador. Tente novamente.');
    }
  };

  const handleCreateSchedule = async (): Promise<void> => {
    try {
      if (!createForm.templateId || !createForm.name) {
        alert('Template e nome são obrigatórios.');
        return;
      }

      const schedule = await reportSchedulerService.createScheduledReport({
        templateId: createForm.templateId,
        name: createForm.name,
        schedule: {
          frequency: createForm.frequency,
          time: createForm.time,
          dayOfWeek: createForm.dayOfWeek,
          dayOfMonth: createForm.dayOfMonth
        },
        parameters: {},
        recipients: createForm.recipients,
        isActive: createForm.isActive,
        createdBy: 'current-user' // Would be actual user ID
      });

      setScheduledReports(prev => [schedule, ...prev]);
      setShowCreateForm(false);
      resetCreateForm();
      onScheduleCreated?.(schedule);
    } catch (error) {
      console.error('Error creating scheduled report:', error);
      alert('Erro ao criar agendamento. Verifique os dados e tente novamente.');
    }
  };

  const handleUpdateSchedule = async (id: EntityId, updates: Partial<ScheduledReport>): Promise<void> => {
    try {
      const updatedSchedule = await reportSchedulerService.updateScheduledReport(id, updates);
      if (updatedSchedule) {
        setScheduledReports(prev => prev.map(s => s.id === id ? updatedSchedule : s));
        onScheduleUpdated?.(updatedSchedule);
      }
    } catch (error) {
      console.error('Error updating scheduled report:', error);
      alert('Erro ao atualizar agendamento. Tente novamente.');
    }
  };

  const handleDeleteSchedule = async (id: EntityId): Promise<void> => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
      return;
    }

    try {
      await reportService.deleteScheduledReport(id);
      setScheduledReports(prev => prev.filter(s => s.id !== id));
      onScheduleDeleted?.(id);
    } catch (error) {
      console.error('Error deleting scheduled report:', error);
      alert('Erro ao excluir agendamento. Tente novamente.');
    }
  };

  const handleTriggerSchedule = async (id: EntityId): Promise<void> => {
    try {
      await reportSchedulerService.triggerScheduledReport(id);
      alert('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Error triggering scheduled report:', error);
      alert('Erro ao gerar relatório. Tente novamente.');
    }
  };

  const resetCreateForm = (): void => {
    setCreateForm({
      templateId: '',
      name: '',
      frequency: 'monthly',
      time: '09:00',
      recipients: [],
      isActive: true
    });
    setNewRecipient('');
  };

  const addRecipient = (): void => {
    if (newRecipient && !createForm.recipients.includes(newRecipient)) {
      setCreateForm(prev => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient]
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string): void => {
    setCreateForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== email)
    }));
  };

  const getFrequencyText = (frequency: string): string => {
    switch (frequency) {
      case 'daily': return 'Diário';
      case 'weekly': return 'Semanal';
      case 'monthly': return 'Mensal';
      case 'quarterly': return 'Trimestral';
      default: return frequency;
    }
  };

  const getDayOfWeekText = (dayOfWeek: number): string => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[dayOfWeek];
  };

  const formatNextRun = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `em ${diffDays} dias`;
    } else if (diffHours > 0) {
      return `em ${diffHours}h ${diffMinutes}m`;
    } else if (diffMinutes > 0) {
      return `em ${diffMinutes} minutos`;
    } else {
      return 'agora';
    }
  };

  const renderStatusCard = () => {
    if (!schedulerStatus) return null;

    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Status do Agendador</h3>
          <div className="flex items-center space-x-2">
            {schedulerStatus.isRunning ? (
              <div className="flex items-center space-x-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Ativo</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium">Inativo</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{schedulerStatus.activeSchedules}</div>
            <div className="text-xs text-gray-500">Agendamentos Ativos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{schedulerStatus.todayGenerated}</div>
            <div className="text-xs text-gray-500">Gerados Hoje</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{schedulerStatus.weekGenerated}</div>
            <div className="text-xs text-gray-500">Esta Semana</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {schedulerStatus.nextScheduledRun 
                ? formatNextRun(schedulerStatus.nextScheduledRun)
                : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Próximo Relatório</div>
          </div>
          <div className="col-span-2">
            <div className="flex space-x-2">
              {schedulerStatus.isRunning ? (
                <button
                  onClick={handleStopScheduler}
                  className="btn-secondary flex items-center space-x-2 text-sm"
                >
                  <Pause className="h-4 w-4" />
                  <span>Parar</span>
                </button>
              ) : (
                <button
                  onClick={handleStartScheduler}
                  className="btn-primary flex items-center space-x-2 text-sm"
                >
                  <Play className="h-4 w-4" />
                  <span>Iniciar</span>
                </button>
              )}
              <button
                onClick={loadStatus}
                className="btn-secondary flex items-center space-x-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Atualizar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScheduleCard = (schedule: ScheduledReport) => {
    const template = templates.find(t => t.id === schedule.templateId);
    const isOverdue = schedule.nextGeneration < new Date();

    return (
      <div key={schedule.id} className="card">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
            <p className="text-sm text-gray-600">{template?.name || 'Template não encontrado'}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {schedule.isActive ? (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Ativo</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-gray-400">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium">Inativo</span>
              </div>
            )}
            {isOverdue && schedule.isActive && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Frequência:</span>
              <span className="ml-2 font-medium">{getFrequencyText(schedule.schedule.frequency)}</span>
            </div>
            <div>
              <span className="text-gray-500">Horário:</span>
              <span className="ml-2 font-medium">{schedule.schedule.time}</span>
            </div>
          </div>

          {schedule.schedule.frequency === 'weekly' && schedule.schedule.dayOfWeek !== undefined && (
            <div className="text-sm">
              <span className="text-gray-500">Dia da semana:</span>
              <span className="ml-2 font-medium">{getDayOfWeekText(schedule.schedule.dayOfWeek)}</span>
            </div>
          )}

          {schedule.schedule.frequency === 'monthly' && schedule.schedule.dayOfMonth && (
            <div className="text-sm">
              <span className="text-gray-500">Dia do mês:</span>
              <span className="ml-2 font-medium">{schedule.schedule.dayOfMonth}</span>
            </div>
          )}

          <div className="text-sm">
            <span className="text-gray-500">Próxima execução:</span>
            <span className={`ml-2 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {new Date(schedule.nextGeneration).toLocaleDateString('pt-BR')} às {new Date(schedule.nextGeneration).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {schedule.lastGenerated && (
            <div className="text-sm">
              <span className="text-gray-500">Última execução:</span>
              <span className="ml-2 font-medium">
                {new Date(schedule.lastGenerated).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          <div className="text-sm">
            <span className="text-gray-500">Destinatários:</span>
            <span className="ml-2 font-medium">{schedule.recipients.length} pessoa(s)</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleUpdateSchedule(schedule.id, { isActive: !schedule.isActive })}
              className={`btn-secondary text-sm ${!schedule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}
            >
              {schedule.isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Ativar
                </>
              )}
            </button>
            
            <button
              onClick={() => setEditingSchedule(schedule)}
              className="btn-secondary text-sm"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleTriggerSchedule(schedule.id)}
              className="btn-primary text-sm"
            >
              <Zap className="h-4 w-4 mr-1" />
              Executar Agora
            </button>
            
            <button
              onClick={() => handleDeleteSchedule(schedule.id)}
              className="btn-secondary text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Agendados</h1>
          <p className="text-gray-600">
            Configure a geração automática de relatórios em intervalos regulares
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      {/* Status Card */}
      {renderStatusCard()}

      {/* Schedules List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Agendamentos ({scheduledReports.length})
          </h2>
          
          <button
            onClick={loadSchedules}
            className="btn-secondary text-sm flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
        </div>

        {scheduledReports.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Nenhum agendamento encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Configure relatórios para serem gerados automaticamente
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scheduledReports.map(renderScheduleCard)}
          </div>
        )}
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Novo Agendamento</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={createForm.templateId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, templateId: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Selecione um template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Agendamento
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Ex: Relatório Mensal de Acolhimentos"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frequência
                  </label>
                  <select
                    value={createForm.frequency}
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      frequency: e.target.value as any,
                      dayOfWeek: undefined,
                      dayOfMonth: undefined
                    }))}
                    className="input-field"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Horário
                  </label>
                  <input
                    type="time"
                    value={createForm.time}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, time: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>

              {createForm.frequency === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dia da Semana
                  </label>
                  <select
                    value={createForm.dayOfWeek || 1}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                    className="input-field"
                  >
                    <option value={0}>Domingo</option>
                    <option value={1}>Segunda-feira</option>
                    <option value={2}>Terça-feira</option>
                    <option value={3}>Quarta-feira</option>
                    <option value={4}>Quinta-feira</option>
                    <option value={5}>Sexta-feira</option>
                    <option value={6}>Sábado</option>
                  </select>
                </div>
              )}

              {createForm.frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dia do Mês
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={createForm.dayOfMonth || 1}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                    className="input-field"
                    placeholder="1-31"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinatários
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="input-field flex-1"
                      placeholder="email@exemplo.com"
                    />
                    <button
                      type="button"
                      onClick={addRecipient}
                      className="btn-secondary"
                    >
                      Adicionar
                    </button>
                  </div>
                  {createForm.recipients.length > 0 && (
                    <div className="space-y-1">
                      {createForm.recipients.map((email, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm">{email}</span>
                          <button
                            type="button"
                            onClick={() => removeRecipient(email)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ativar agendamento imediatamente</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  resetCreateForm();
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateSchedule}
                className="btn-primary flex-1"
              >
                Criar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal would be similar but with pre-filled values */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Agendamento</h3>
            <p className="text-sm text-gray-600 mb-4">
              Funcionalidade de edição seria implementada aqui
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setEditingSchedule(null)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => setEditingSchedule(null)}
                className="btn-primary flex-1"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleManager;