import React, { useState } from 'react';
import { ArrowRight, AlertTriangle, Shield, Clock, CheckCircle } from 'lucide-react';
import { auditService } from '../../services/index.js';
import type { Child, ChildStatus } from '../../types/index.js';

interface ChildStatusManagerProps {
  child: Child;
  onStatusChange: (childId: string, newStatus: ChildStatus, details: any) => Promise<void>;
  disabled?: boolean;
}

interface StatusTransition {
  from: ChildStatus;
  to: ChildStatus;
  reason?: string;
  requiresConfirmation?: boolean;
  requiresDocuments?: string[];
}

interface StatusForm {
  newStatus: ChildStatus;
  reason: string;
  effectiveDate: string;
  notes: string;
}

function ChildStatusManager({ child, onStatusChange, disabled = false }: ChildStatusManagerProps): JSX.Element {
  const [showStatusForm, setShowStatusForm] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusForm, setStatusForm] = useState<StatusForm>({
    newStatus: child.currentStatus,
    reason: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Define status transition rules
  const statusTransitions: StatusTransition[] = [
    {
      from: 'awaiting',
      to: 'evaluating',
      reason: 'Iniciar processo de avaliação para acolhimento'
    },
    {
      from: 'evaluating',
      to: 'available',
      reason: 'Criança aprovada para acolhimento'
    },
    {
      from: 'evaluating',
      to: 'unavailable',
      reason: 'Criança não aprovada para acolhimento no momento'
    },
    {
      from: 'available',
      to: 'in_placement',
      reason: 'Criança foi acolhida por uma família',
      requiresConfirmation: true
    },
    {
      from: 'available',
      to: 'unavailable',
      reason: 'Criança temporariamente indisponível para acolhimento'
    },
    {
      from: 'in_placement',
      to: 'reunified',
      reason: 'Criança reunificada com família biológica',
      requiresConfirmation: true
    },
    {
      from: 'in_placement',
      to: 'adopted',
      reason: 'Criança foi adotada',
      requiresConfirmation: true
    },
    {
      from: 'in_placement',
      to: 'available',
      reason: 'Acolhimento foi interrompido, criança retorna ao sistema'
    },
    {
      from: 'unavailable',
      to: 'available',
      reason: 'Criança novamente disponível para acolhimento'
    }
  ];

  const getAvailableTransitions = (): StatusTransition[] => {
    return statusTransitions.filter(transition => 
      transition.from === child.currentStatus
    );
  };

  const getStatusColor = (status: ChildStatus): string => {
    const colors: Record<ChildStatus, string> = {
      awaiting: 'border-yellow-200 bg-yellow-50 text-yellow-800',
      evaluating: 'border-blue-200 bg-blue-50 text-blue-800',
      available: 'border-green-200 bg-green-50 text-green-800',
      in_placement: 'border-purple-200 bg-purple-50 text-purple-800',
      unavailable: 'border-gray-200 bg-gray-50 text-gray-800',
      reunified: 'border-indigo-200 bg-indigo-50 text-indigo-800',
      adopted: 'border-pink-200 bg-pink-50 text-pink-800'
    };
    return colors[status] || 'border-gray-200 bg-gray-50 text-gray-800';
  };

  const getStatusText = (status: ChildStatus): string => {
    const texts: Record<ChildStatus, string> = {
      awaiting: 'Aguardando',
      evaluating: 'Em Avaliação',
      available: 'Disponível',
      in_placement: 'Em Acolhimento',
      unavailable: 'Indisponível',
      reunified: 'Reunificada',
      adopted: 'Adotada'
    };
    return texts[status] || status;
  };

  const handleStatusChangeRequest = async (): Promise<void> => {
    if (!statusForm.reason.trim()) return;

    setIsChangingStatus(true);

    try {
      // Log the status change attempt
      await auditService.logEvent({
        action: 'update',
        resource: 'child',
        resourceId: child.id,
        details: {
          description: `Status change: ${child.currentStatus} → ${statusForm.newStatus}`,
          sensitivity: 'high',
          legalBasis: 'child_protection',
          additionalData: {
            previousStatus: child.currentStatus,
            newStatus: statusForm.newStatus,
            reason: statusForm.reason,
            effectiveDate: statusForm.effectiveDate,
            notes: statusForm.notes
          }
        }
      });

      // Execute the status change
      await onStatusChange(child.id, statusForm.newStatus, {
        reason: statusForm.reason,
        effectiveDate: statusForm.effectiveDate,
        notes: statusForm.notes,
        changedBy: 'current-user', // Would get from auth context
        changedAt: new Date().toISOString()
      });

      // Reset form and close modal
      setStatusForm({
        newStatus: child.currentStatus,
        reason: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowStatusForm(false);

    } catch (error) {
      console.error('Error changing child status:', error);
      // In a real app, show error notification
    } finally {
      setIsChangingStatus(false);
    }
  };

  const renderStatusBadge = () => (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
      getStatusColor(child.currentStatus)
    }`}>
      <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
      {getStatusText(child.currentStatus)}
    </div>
  );

  const renderAvailableTransitions = () => {
    const transitions = getAvailableTransitions();
    
    if (transitions.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <Shield className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm">Nenhuma transição de status disponível</p>
          <p className="text-xs">Status atual é terminal ou você não tem permissão</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Mudanças de Status Disponíveis
        </h4>
        {transitions.map((transition, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`px-2 py-1 text-xs rounded-full ${
                  getStatusColor(transition.from)
                }`}>
                  {getStatusText(transition.from)}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className={`px-2 py-1 text-xs rounded-full ${
                  getStatusColor(transition.to)
                }`}>
                  {getStatusText(transition.to)}
                </div>
              </div>
              <button
                onClick={() => {
                  setStatusForm(prev => ({ ...prev, newStatus: transition.to }));
                  setShowStatusForm(true);
                }}
                disabled={disabled}
                className="btn-secondary text-xs"
              >
                Aplicar
              </button>
            </div>
            {transition.reason && (
              <p className="text-xs text-gray-600 mt-2">{transition.reason}</p>
            )}
            {transition.requiresConfirmation && (
              <div className="flex items-center mt-2 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Requer confirmação
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStatusForm = () => {
    if (!showStatusForm) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Confirmar Mudança de Status
            </h3>
            <button
              onClick={() => setShowStatusForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {/* Status Transition Preview */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-center space-x-3">
                <div className={`px-3 py-1 text-sm rounded-full ${
                  getStatusColor(child.currentStatus)
                }`}>
                  {getStatusText(child.currentStatus)}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <div className={`px-3 py-1 text-sm rounded-full ${
                  getStatusColor(statusForm.newStatus)
                }`}>
                  {getStatusText(statusForm.newStatus)}
                </div>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo da Mudança *
              </label>
              <textarea
                value={statusForm.reason}
                onChange={(e) => setStatusForm(prev => ({ ...prev, reason: e.target.value }))}
                className="input-field"
                rows={3}
                placeholder="Descreva o motivo para esta mudança de status..."
                required
              />
            </div>

            {/* Effective Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Vigência
              </label>
              <input
                type="date"
                value={statusForm.effectiveDate}
                onChange={(e) => setStatusForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                className="input-field"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações Adicionais
              </label>
              <textarea
                value={statusForm.notes}
                onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                className="input-field"
                rows={2}
                placeholder="Informações adicionais (opcional)..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowStatusForm(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleStatusChangeRequest}
              disabled={isChangingStatus || !statusForm.reason.trim()}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {isChangingStatus && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              <span>Confirmar Mudança</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">Status Atual</h3>
          {renderStatusBadge()}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Última atualização:</p>
          <p className="text-sm text-gray-900">
            {new Date(child.updatedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Available Transitions */}
      <div className="border-t pt-4">
        {renderAvailableTransitions()}
      </div>

      {/* Status Change Form Modal */}
      {renderStatusForm()}
    </div>
  );
}

export default ChildStatusManager;