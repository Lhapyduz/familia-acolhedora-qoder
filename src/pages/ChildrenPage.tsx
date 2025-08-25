import React, { useState } from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
import ChildrenList from '../components/children/ChildrenList.js';
import ChildForm from '../components/children/ChildForm.js';
import ChildDetails from '../components/children/ChildDetails.js';

type PageView = 'list' | 'form' | 'details';

function ChildrenPage(): JSX.Element {
  const [currentView, setCurrentView] = useState<PageView>('list');
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>();

  const handleCreateChild = () => {
    setSelectedChildId(undefined);
    setCurrentView('form');
  };

  const handleEditChild = (childId: string) => {
    setSelectedChildId(childId);
    setCurrentView('form');
  };

  const handleViewChild = (childId: string) => {
    setSelectedChildId(childId);
    setCurrentView('details');
  };

  const handleFormSuccess = () => {
    setCurrentView('list');
    setSelectedChildId(undefined);
  };

  const handleFormCancel = () => {
    setCurrentView('list');
    setSelectedChildId(undefined);
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedChildId(undefined);
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
                {selectedChildId ? 'Editar Criança' : 'Nova Criança'}
              </h1>
            </div>
          </div>
        );
      
      case 'details':
        return null; // ChildDetails component handles its own header
      
      default:
        return (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Crianças e Adolescentes
              </h1>
              <p className="text-gray-600">
                Gerencie o cadastro e acompanhamento das crianças
              </p>
            </div>
            <button
              onClick={handleCreateChild}
              className="btn-caring flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Nova Criança</span>
            </button>
          </div>
        );
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'form':
        return (
          <ChildForm
            childId={selectedChildId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        );
      
      case 'details':
        return selectedChildId ? (
          <ChildDetails
            childId={selectedChildId}
            onEdit={handleEditChild}
            onBack={handleBackToList}
          />
        ) : null;
      
      case 'list':
      default:
        return (
          <ChildrenList
            onEdit={handleEditChild}
            onSelectChild={(child) => handleViewChild(child.id)}
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

export default ChildrenPage;