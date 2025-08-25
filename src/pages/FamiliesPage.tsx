import React, { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import FamilyList from '../components/families/FamilyList.js';
import FamilyForm from '../components/families/FamilyForm.js';
import FamilyDetails from '../components/families/FamilyDetails.js';

type PageView = 'list' | 'form' | 'details';

function FamiliesPage(): JSX.Element {
  const [currentView, setCurrentView] = useState<PageView>('list');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | undefined>();

  const handleCreateFamily = () => {
    setSelectedFamilyId(undefined);
    setCurrentView('form');
  };

  const handleEditFamily = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setCurrentView('form');
  };

  const handleViewFamily = (familyId: string) => {
    setSelectedFamilyId(familyId);
    setCurrentView('details');
  };

  const handleFormSuccess = () => {
    setCurrentView('list');
    setSelectedFamilyId(undefined);
  };

  const handleFormCancel = () => {
    setCurrentView('list');
    setSelectedFamilyId(undefined);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedFamilyId(undefined);
  };

  const renderHeader = () => {
    switch (currentView) {
      case 'form':
        return (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToList}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Voltar para Lista
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedFamilyId ? 'Editar Família' : 'Nova Família'}
              </h1>
            </div>
          </div>
        );
      
      case 'details':
        return null; // FamilyDetails component handles its own header
      
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Famílias Acolhedoras
              </h1>
              <p className="text-gray-600">
                Gerencie as famílias cadastradas no programa de acolhimento
              </p>
            </div>
            <button
              onClick={handleCreateFamily}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Nova Família</span>
            </button>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return (
          <FamilyForm
            familyId={selectedFamilyId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        );
      
      case 'details':
        return selectedFamilyId ? (
          <FamilyDetails
            familyId={selectedFamilyId}
            onEdit={handleEditFamily}
            onBack={handleBackToList}
          />
        ) : null;
      
      case 'list':
      default:
        return (
          <FamilyList
            onEdit={handleEditFamily}
            onSelectFamily={(family) => handleViewFamily(family.id)}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderHeader()}
      {renderContent()}
    </div>
  );
}

export default FamiliesPage;