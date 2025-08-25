import React, { useState } from 'react';
import { useFamily } from '../../contexts/FamilyContext.js';
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  User, 
  Users, 
  Home, 
  Heart,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import type { Family, Document, FamilyStatus } from '../../types/index.js';

interface FamilyDetailsProps {
  familyId: string;
  onEdit?: (familyId: string) => void;
  onBack?: () => void;
  onClose?: () => void;
}

function FamilyDetails({ familyId, onEdit, onBack, onClose }: FamilyDetailsProps): JSX.Element {
  const { families, updateFamily } = useFamily();
  const [family, setFamily] = useState<Family | null>(
    families.find(f => f.id === familyId) || null
  );
  const [selectedTab, setSelectedTab] = useState<'overview' | 'documents' | 'history'>('overview');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  if (!family) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Família não encontrada
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            A família solicitada não foi encontrada no sistema.
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

  const getStatusColor = (status: FamilyStatus): string => {
    switch (status) {
      case 'available':
        return 'bg-caring-100 text-caring-800';
      case 'unavailable':
        return 'bg-gray-100 text-gray-800';
      case 'under_evaluation':
        return 'bg-warm-100 text-warm-800';
      case 'active_placement':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: FamilyStatus): string => {
    switch (status) {
      case 'available':
        return 'Disponível';
      case 'unavailable':
        return 'Indisponível';
      case 'under_evaluation':
        return 'Em Avaliação';
      case 'active_placement':
        return 'Acolhimento Ativo';
      default:
        return status;
    }
  };

  const handleStatusChange = async (newStatus: FamilyStatus) => {
    try {
      await updateFamily(familyId, { status: newStatus });
      setFamily(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      console.error('Error updating family status:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setUploadingFiles(true);
    try {
      // Simulate file upload
      const newDocuments: Document[] = Array.from(files).map(file => ({
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: 'current_user', // Should be actual user ID
        category: 'general',
        url: URL.createObjectURL(file) // In real app, this would be server URL
      }));

      const updatedDocuments = [...(family.documents || []), ...newDocuments];
      await updateFamily(familyId, { documents: updatedDocuments });
      setFamily(prev => prev ? { ...prev, documents: updatedDocuments } : null);
    } catch (error) {
      console.error('Error uploading documents:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        const updatedDocuments = (family.documents || []).filter(doc => doc.id !== documentId);
        await updateFamily(familyId, { documents: updatedDocuments });
        setFamily(prev => prev ? { ...prev, documents: updatedDocuments } : null);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Primary Contact */}
      <div className="card">
        <div className="flex items-center mb-4">
          <User className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Contato Principal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <p className="text-sm text-gray-900">{family.primaryContact.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <p className="text-sm text-gray-900">{family.primaryContact.cpf}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <div className="flex items-center text-sm text-gray-900">
              <Phone className="h-4 w-4 mr-1 text-gray-400" />
              {family.primaryContact.phone}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="flex items-center text-sm text-gray-900">
              <Mail className="h-4 w-4 mr-1 text-gray-400" />
              {family.primaryContact.email}
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Home className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Endereço</h3>
        </div>
        <div className="flex items-start text-sm text-gray-900">
          <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
          <div>
            <p>{family.address.street}, {family.address.number}</p>
            {family.address.complement && <p>{family.address.complement}</p>}
            <p>{family.address.neighborhood}</p>
            <p>{family.address.city}, {family.address.state}</p>
            <p>CEP: {family.address.zipCode}</p>
          </div>
        </div>
      </div>

      {/* Family Composition */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Users className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Composição Familiar</h3>
        </div>
        {family.composition.length > 0 ? (
          <div className="space-y-3">
            {family.composition.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-sm text-gray-600">
                    {member.relationship} • {member.age} anos
                    {member.profession && ` • ${member.profession}`}
                  </p>
                </div>
                {member.income > 0 && (
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1" />
                    R$ {member.income.toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Nenhum membro adicional cadastrado</p>
        )}
      </div>

      {/* Preferences */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Heart className="h-6 w-6 text-primary-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Preferências de Acolhimento</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Faixa Etária</label>
            <p className="text-sm text-gray-900">
              {family.preferences.ageRange.min} - {family.preferences.ageRange.max} anos
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <p className="text-sm text-gray-900">
              {family.preferences.gender === 'any' ? 'Qualquer' : 
               family.preferences.gender === 'male' ? 'Masculino' : 'Feminino'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número Máximo</label>
            <p className="text-sm text-gray-900">{family.preferences.maxChildren} criança(s)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Necessidades Especiais</label>
            <div className="flex items-center">
              {family.preferences.specialNeeds ? (
                <CheckCircle className="h-4 w-4 text-caring-600 mr-1" />
              ) : (
                <X className="h-4 w-4 text-gray-400 mr-1" />
              )}
              <p className="text-sm text-gray-900">
                {family.preferences.specialNeeds ? 'Aceita' : 'Não aceita'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Limitations */}
      {family.limitations && family.limitations.length > 0 && (
        <div className="card">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-warm-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Limitações e Observações</h3>
          </div>
          <ul className="space-y-2">
            {family.limitations.map((limitation, index) => (
              <li key={index} className="text-sm text-gray-700">
                • {limitation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragOver 
            ? 'border-primary-400 bg-primary-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              Arraste arquivos aqui ou clique para selecionar
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              PDF, DOC, DOCX, JPG, PNG até 10MB
            </span>
          </label>
          <input
            id="file-upload"
            name="file-upload"
            type="file"
            className="sr-only"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {family.documents && family.documents.length > 0 ? (
          family.documents.map((document) => (
            <div key={document.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{document.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(document.size)} • 
                      Enviado em {new Date(document.uploadedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.open(document.url, '_blank')}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg transition-colors"
                    title="Visualizar documento"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Excluir documento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2">Nenhum documento enviado</p>
            <p className="text-sm">Faça upload dos documentos necessários</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Acolhimentos</h3>
        {family.history && family.history.length > 0 ? (
          <div className="space-y-4">
            {family.history.map((placement, index) => (
              <div key={index} className="border-l-2 border-primary-200 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Acolhimento #{index + 1}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(placement.startDate).toLocaleDateString('pt-BR')} - 
                    {placement.endDate ? new Date(placement.endDate).toLocaleDateString('pt-BR') : 'Em andamento'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Status: {placement.status}
                </p>
                {placement.outcome && (
                  <p className="text-sm text-gray-600">
                    Resultado: {placement.outcome}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2">Nenhum histórico de acolhimento</p>
            <p className="text-sm">Esta família ainda não realizou acolhimentos</p>
          </div>
        )}
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
            <h1 className="text-2xl font-bold text-gray-900">{family.primaryContact.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(family.status)}`}>
                {getStatusText(family.status)}
              </span>
              <span className="text-sm text-gray-500">
                ID: {family.id}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Status Change */}
          <select
            value={family.status}
            onChange={(e) => handleStatusChange(e.target.value as FamilyStatus)}
            className="input-field text-sm"
          >
            <option value="available">Disponível</option>
            <option value="unavailable">Indisponível</option>
            <option value="under_evaluation">Em Avaliação</option>
            <option value="active_placement">Acolhimento Ativo</option>
          </select>
          
          {onEdit && (
            <button
              onClick={() => onEdit(family.id)}
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
            onClick={() => setSelectedTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'documents'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Documentos ({family.documents?.length || 0})
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
        {selectedTab === 'documents' && renderDocuments()}
        {selectedTab === 'history' && renderHistory()}
      </div>

      {/* Upload Progress */}
      {uploadingFiles && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 border">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent" />
            <span className="text-sm font-medium">Enviando documentos...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FamilyDetails;