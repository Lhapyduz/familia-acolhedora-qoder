import React, { useState } from 'react';
import { Users, Heart, Calendar, FileText } from 'lucide-react';
import ApproximationTimeline from './ApproximationTimeline';
import type { Placement } from '../../types/index.js';

interface ApproximationManagementProps {
  placement: Placement;
  onUpdate: (placementId: string, data: any) => Promise<void>;
  disabled?: boolean;
}

function ApproximationManagement({ placement, onUpdate, disabled = false }: ApproximationManagementProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'timeline' | 'visits' | 'notes'>('timeline');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Aproximação</h2>
          <p className="text-gray-600">
            Acompanhamento do processo de aproximação gradual
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-caring-600" />
          <span className="text-sm text-gray-600">Processo Ativo</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'timeline', label: 'Cronograma', icon: Calendar },
            { id: 'visits', label: 'Visitas', icon: Users },
            { id: 'notes', label: 'Observações', icon: FileText }
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
      {activeTab === 'timeline' && (
        <ApproximationTimeline
          placement={placement}
          onStageUpdate={onUpdate}
          disabled={disabled}
        />
      )}

      {activeTab === 'visits' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Registro de Visitas</h3>
          <div className="text-center py-8 text-gray-500">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">Sistema de registro de visitas</p>
            <p className="text-xs">Funcionalidade em desenvolvimento</p>
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Observações e Notas</h3>
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p className="text-sm">Sistema de observações</p>
            <p className="text-xs">Funcionalidade em desenvolvimento</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApproximationManagement;