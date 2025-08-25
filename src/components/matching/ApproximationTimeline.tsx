import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { Placement } from '../../types/index.js';

interface ApproximationTimelineProps {
  placement: Placement;
  onStageUpdate: (placementId: string, stage: string, data: any) => Promise<void>;
  disabled?: boolean;
}

function ApproximationTimeline({ placement, onStageUpdate, disabled = false }: ApproximationTimelineProps): JSX.Element {
  const stages = [
    { id: 'preparation', name: 'Preparação', status: 'completed' },
    { id: 'first_meeting', name: 'Primeiro Encontro', status: 'in_progress' },
    { id: 'visits', name: 'Visitas Graduais', status: 'pending' },
    { id: 'adaptation', name: 'Período de Adaptação', status: 'pending' },
    { id: 'evaluation', name: 'Avaliação Final', status: 'pending' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Cronograma de Aproximação</h3>
      
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {getStatusIcon(stage.status)}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">{stage.name}</h4>
              <p className="text-sm text-gray-500 mt-1">
                Etapa {index + 1} do processo de aproximação
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                stage.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : stage.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {stage.status === 'completed' 
                  ? 'Concluída'
                  : stage.status === 'in_progress'
                  ? 'Em Andamento'
                  : 'Pendente'
                }
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Diretrizes do Processo</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Cada etapa deve ser concluída antes de avançar para a próxima</li>
          <li>• Registre observações importantes sobre cada encontro</li>
          <li>• Respeite o tempo da criança e da família para adaptação</li>
          <li>• Comunique qualquer preocupação à equipe técnica</li>
          <li>• Mantenha documentação completa de todo o processo</li>
        </ul>
      </div>
    </div>
  );
}

export default ApproximationTimeline;