import React, { useState } from 'react';
import { useChildren } from '../../contexts/ChildrenContext.js';
import ChildStatusManager from './ChildStatusManager.js';
import DocumentManager from './DocumentManager.js';
import { 
  ArrowLeft, 
  Edit, 
  User, 
  Heart, 
  Home, 
  Scale,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Users,
  Baby,
  Activity,
  TrendingUp
} from 'lucide-react';
import type { Child, ChildStatus, DocumentUploadRequest } from '../../types/index.js';

interface ChildDetailsProps {
  childId: string;
  onEdit?: (childId: string) => void;
  onBack?: () => void;
  onClose?: () => void;
}

function ChildDetails({ childId, onEdit, onBack, onClose }: ChildDetailsProps): JSX.Element {
  const { children, updateChild } = useChildren();
  const [child, setChild] = useState<Child | null>(
    children.find(c => c.id === childId) || null
  );
  const [selectedTab, setSelectedTab] = useState<'overview' | 'legal' | 'placement' | 'status' | 'documents' | 'history'>('overview');

  if (!child) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Criança não encontrada
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            A criança solicitada não foi encontrada no sistema.
          </p>
          <div className="mt-6">
            <button onClick={onBack || onClose} className="btn-primary">
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: ChildStatus): string => {
    switch (status) {
      case 'awaiting':
        return 'bg-warm-100 text-warm-800';
      case 'in_placement':
        return 'bg-primary-100 text-primary-800';
      case 'discharged':
        return 'bg-caring-100 text-caring-800';
      case 'returned_family':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: ChildStatus): string => {
    switch (status) {
      case 'awaiting':
        return 'Aguardando';
      case 'in_placement':
        return 'Em Acolhimento';
      case 'discharged':
        return 'Desligado';
      case 'returned_family':
        return 'Retornou à Família';
      default:
        return status;
    }
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getAgeText = (birthDate: Date): string => {
    const age = calculateAge(birthDate);
    if (age === 0) {
      const months = Math.floor((new Date().getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
      return months <= 1 ? 'Recém-nascido' : `${months} meses`;
    }
    return `${age} anos`;
  };

  const handleStatusChange = async (newStatus: ChildStatus) => {
    try {
      await updateChild(childId, { currentStatus: newStatus });
      setChild(prev => prev ? { ...prev, currentStatus: newStatus } : null);
    } catch (error) {
      console.error('Error updating child status:', error);
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="card">
        <div className="flex items-center mb-4">
          <User className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Informações Pessoais</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <p className="text-sm text-gray-900">{child.personalInfo.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Idade</label>
            <div className="flex items-center text-sm text-gray-900">
              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
              {getAgeText(child.personalInfo.birthDate)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
            <p className="text-sm text-gray-900">
              {new Date(child.personalInfo.birthDate).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <p className="text-sm text-gray-900">
              {child.personalInfo.gender === 'male' ? 'Masculino' : 'Feminino'}
            </p>
          </div>
          {child.personalInfo.cpf && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <p className="text-sm text-gray-900">{child.personalInfo.cpf}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certidão de Nascimento</label>
            <p className="text-sm text-gray-900">{child.personalInfo.birthCertificate}</p>
          </div>
        </div>
      </div>

      {/* Special Needs */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Heart className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Necessidades Especiais</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center">
            {child.specialNeeds.hasSpecialNeeds ? (
              <>
                <CheckCircle className="h-5 w-5 text-caring-600 mr-2" />
                <span className="text-sm font-medium text-caring-800">
                  Esta criança possui necessidades especiais
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Esta criança não possui necessidades especiais registradas
                </span>
              </>
            )}
          </div>

          {child.specialNeeds.hasSpecialNeeds && (
            <div className="space-y-4 pl-7">
              {child.specialNeeds.healthConditions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condições de Saúde
                  </label>
                  <ul className="space-y-1">
                    {child.specialNeeds.healthConditions.map((condition, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {condition}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {child.specialNeeds.medications.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicações
                  </label>
                  <ul className="space-y-1">
                    {child.specialNeeds.medications.map((medication, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {medication}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {child.specialNeeds.educationalNeeds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Necessidades Educacionais
                  </label>
                  <ul className="space-y-1">
                    {child.specialNeeds.educationalNeeds.map((need, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        • {need}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Family Background */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Home className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Contexto Familiar</h3>
        </div>
        <div className="space-y-4">
          {child.familyBackground.originFamily && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Família de Origem
              </label>
              <p className="text-sm text-gray-600">{child.familyBackground.originFamily}</p>
            </div>
          )}

          {child.familyBackground.siblings.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Irmãos ({child.familyBackground.siblings.length})
              </label>
              <ul className="space-y-1">
                {child.familyBackground.siblings.map((sibling, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    • {sibling}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {child.familyBackground.communityTies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vínculos Comunitários
              </label>
              <ul className="space-y-1">
                {child.familyBackground.communityTies.map((tie, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    • {tie}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderLegalStatus = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center mb-4">
          <Scale className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Status Legal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordem Judicial
            </label>
            <p className="text-sm text-gray-900">{child.legalStatus.courtOrder}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsável Legal
            </label>
            <p className="text-sm text-gray-900">{child.legalStatus.legalGuardian}</p>
          </div>
          {child.legalStatus.placementDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Acolhimento
              </label>
              <p className="text-sm text-gray-900">
                {new Date(child.legalStatus.placementDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
          {child.legalStatus.expectedDuration && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duração Prevista
              </label>
              <p className="text-sm text-gray-900">
                {child.legalStatus.expectedDuration} meses
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Linha do Tempo Legal</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Ordem judicial emitida</p>
              <p className="text-xs text-gray-500">
                Processo: {child.legalStatus.courtOrder}
              </p>
            </div>
          </div>
          
          {child.legalStatus.placementDate && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-warm-600 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Início do acolhimento</p>
                <p className="text-xs text-gray-500">
                  {new Date(child.legalStatus.placementDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
              child.currentStatus === 'in_placement' ? 'bg-caring-600' : 'bg-gray-300'
            }`}></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Status atual</p>
              <p className="text-xs text-gray-500">
                {getStatusText(child.currentStatus)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlacement = () => (
    <div className="space-y-6">
      {child.currentPlacement ? (
        <div className="card">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Acolhimento Atual</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Família Acolhedora
              </label>
              <p className="text-sm text-gray-900">ID: {child.currentPlacement.familyId}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Início
              </label>
              <p className="text-sm text-gray-900">
                {new Date(child.currentPlacement.startDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status do Acolhimento
              </label>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                child.currentPlacement.status === 'active' ? 'bg-caring-100 text-caring-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {child.currentPlacement.status === 'active' ? 'Ativo' : child.currentPlacement.status}
              </span>
            </div>
            {child.currentPlacement.endDate && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Término
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(child.currentPlacement.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="text-center py-8">
            <Baby className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Sem acolhimento ativo
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta criança não está atualmente em acolhimento familiar.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderDocuments = () => {
    const handleDocumentUpload = async (uploadRequest: any) => {
      try {
        const { childrenService } = await import('../../services/index.js');
        await childrenService.uploadDocument(child.id, uploadRequest);
        
        // Refresh child data to show new document
        const updatedChild = await childrenService.getById(child.id);
        if (updatedChild) {
          setChild(updatedChild);
        }
      } catch (error) {
        console.error('Error uploading document:', error);
        alert('Erro ao enviar documento. Tente novamente.');
      }
    };

    const handleDocumentDelete = async (documentId: string) => {
      if (!confirm('Tem certeza que deseja excluir este documento?')) {
        return;
      }
      
      try {
        const { childrenService } = await import('../../services/index.js');
        await childrenService.deleteDocument(child.id, documentId);
        
        // Refresh child data to remove deleted document
        const updatedChild = await childrenService.getById(child.id);
        if (updatedChild) {
          setChild(updatedChild);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Erro ao excluir documento. Tente novamente.');
      }
    };

    const handleDocumentUpdate = async (documentId: string, updates: any) => {
      try {
        const { childrenService } = await import('../../services/index.js');
        await childrenService.updateDocument(child.id, documentId, updates);
        
        // Refresh child data to show updated document
        const updatedChild = await childrenService.getById(child.id);
        if (updatedChild) {
          setChild(updatedChild);
        }
      } catch (error) {
        console.error('Error updating document:', error);
        alert('Erro ao atualizar documento. Tente novamente.');
      }
    };

    const handleDocumentDownload = (document: any) => {
      // TODO: Implement actual document download from server
      console.log('Downloading document:', document);
      // For now, show an alert that this feature is not yet implemented
      alert('Download de documentos será implementado em versão futura');
    };

    return (
      <div className="space-y-6">
        <DocumentManager
          childId={child.id}
          documents={child.documents || []}
          onUpload={handleDocumentUpload}
          onDelete={handleDocumentDelete}
          onUpdate={handleDocumentUpdate}
          onDownload={handleDocumentDownload}
          readonly={false}
        />
      </div>
    );
  };

  const renderHistory = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Status</h3>
        <div className="text-center py-8 text-gray-500">
          <Activity className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2">Histórico não implementado</p>
          <p className="text-sm">Funcionalidade será implementada em versão futura</p>
        </div>
      </div>
    </div>
  );

  const renderStatusManagement = () => (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center mb-6">
          <TrendingUp className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Gerenciamento de Status</h3>
        </div>
        
        <ChildStatusManager 
          child={child}
          onStatusChange={(newStatus) => {
            setChild(prev => prev ? { ...prev, currentStatus: newStatus } : null);
          }}
        />
      </div>
      
      {/* Status Guidelines */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Diretrizes de Status</h3>
        <div className="space-y-4">
          <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
            <h4 className="text-sm font-medium text-yellow-800">Aguardando Acolhimento</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Criança está na fila de espera para ser acolhida por uma família. 
              Processo de matching pode estar em andamento.
            </p>
          </div>
          
          <div className="border-l-4 border-blue-400 bg-blue-50 p-4">
            <h4 className="text-sm font-medium text-blue-800">Em Acolhimento</h4>
            <p className="text-sm text-blue-700 mt-1">
              Criança está atualmente acolhida por uma família. 
              Acompanhamento técnico regular é necessário.
            </p>
          </div>
          
          <div className="border-l-4 border-green-400 bg-green-50 p-4">
            <h4 className="text-sm font-medium text-green-800">Desligado</h4>
            <p className="text-sm text-green-700 mt-1">
              Criança foi desligada do programa. Pode ter sido adotada ou 
              atingido a maioridade.
            </p>
          </div>
          
          <div className="border-l-4 border-purple-400 bg-purple-50 p-4">
            <h4 className="text-sm font-medium text-purple-800">Retornou à Família</h4>
            <p className="text-sm text-purple-700 mt-1">
              Criança retornou à família de origem após trabalho de 
              reintegração familiar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {(onBack || onClose) && (
            <button
              onClick={onBack || onClose}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Voltar
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{child.personalInfo.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(child.currentStatus)}`}>
                {getStatusText(child.currentStatus)}
              </span>
              <span className="text-sm text-gray-500">
                {getAgeText(child.personalInfo.birthDate)}
              </span>
              <span className="text-sm text-gray-500">
                ID: {child.id}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {onEdit && (
            <button
              onClick={() => onEdit(child.id)}
              className="btn-primary flex items-center space-x-2"
            >
              <Edit className="h-5 w-5" />
              <span>Editar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setSelectedTab('legal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'legal'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Status Legal
          </button>
          <button
            onClick={() => setSelectedTab('placement')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'placement'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Acolhimento
          </button>
          <button
            onClick={() => setSelectedTab('status')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'status'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Gerenciar Status
          </button>
          <button
            onClick={() => setSelectedTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'documents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documentos
          </button>
          <button
            onClick={() => setSelectedTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'history'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Histórico
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'legal' && renderLegalStatus()}
        {selectedTab === 'placement' && renderPlacement()}
        {selectedTab === 'status' && renderStatusManagement()}
        {selectedTab === 'documents' && renderDocuments()}
        {selectedTab === 'history' && renderHistory()}
      </div>
    </div>
  );
}

export default ChildDetails;