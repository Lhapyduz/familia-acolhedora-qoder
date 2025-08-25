import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChildren } from '../../contexts/ChildrenContext.js';
import { ArrowLeft, ArrowRight, Check, User, Heart, FileText, Home, Scale } from 'lucide-react';
import type { CreateChildRequest, SpecialNeeds, FamilyBackground, LegalStatus } from '../../types/index.js';

interface FormData {
  // Step 1: Personal Information
  personalInfo: {
    name: string;
    birthDate: string;
    gender: 'male' | 'female';
    cpf: string;
    birthCertificate: string;
  };
  
  // Step 2: Special Needs
  specialNeeds: SpecialNeeds;
  
  // Step 3: Family Background
  familyBackground: FamilyBackground;
  
  // Step 4: Legal Status
  legalStatus: LegalStatus;
}

const initialFormData: FormData = {
  personalInfo: {
    name: '',
    birthDate: '',
    gender: 'male',
    cpf: '',
    birthCertificate: '',
  },
  specialNeeds: {
    hasSpecialNeeds: false,
    healthConditions: [],
    medications: [],
    educationalNeeds: [],
  },
  familyBackground: {
    originFamily: '',
    siblings: [],
    communityTies: [],
  },
  legalStatus: {
    courtOrder: '',
    legalGuardian: '',
    placementDate: undefined,
    expectedDuration: undefined,
  },
};

const steps = [
  { id: 1, title: 'Informações Pessoais', icon: User },
  { id: 2, title: 'Necessidades Especiais', icon: Heart },
  { id: 3, title: 'Contexto Familiar', icon: Home },
  { id: 4, title: 'Status Legal', icon: Scale },
];

interface ChildFormProps {
  childId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function ChildForm({ childId, onSuccess, onCancel }: ChildFormProps): JSX.Element {
  const navigate = useNavigate();
  const { addChild, updateChild, children } = useChildren();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing child data if editing
  React.useEffect(() => {
    if (childId) {
      const existingChild = children.find(c => c.id === childId);
      if (existingChild) {
        setFormData({
          personalInfo: {
            name: existingChild.personalInfo.name,
            birthDate: existingChild.personalInfo.birthDate.toString().split('T')[0],
            gender: existingChild.personalInfo.gender,
            cpf: existingChild.personalInfo.cpf || '',
            birthCertificate: existingChild.personalInfo.birthCertificate,
          },
          specialNeeds: existingChild.specialNeeds,
          familyBackground: existingChild.familyBackground,
          legalStatus: existingChild.legalStatus,
        });
      }
    }
  }, [childId, children]);

  const updateFormData = (step: keyof FormData, data: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: { ...prev[step], ...data }
    }));
    // Clear errors for this step
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(step)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.personalInfo.name.trim()) {
          newErrors['personalInfo.name'] = 'Nome é obrigatório';
        }
        if (!formData.personalInfo.birthDate) {
          newErrors['personalInfo.birthDate'] = 'Data de nascimento é obrigatória';
        }
        if (!formData.personalInfo.birthCertificate.trim()) {
          newErrors['personalInfo.birthCertificate'] = 'Certidão de nascimento é obrigatória';
        }
        break;
      case 4:
        if (!formData.legalStatus.courtOrder.trim()) {
          newErrors['legalStatus.courtOrder'] = 'Ordem judicial é obrigatória';
        }
        if (!formData.legalStatus.legalGuardian.trim()) {
          newErrors['legalStatus.legalGuardian'] = 'Responsável legal é obrigatório';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    try {
      const childData: CreateChildRequest = {
        personalInfo: {
          ...formData.personalInfo,
          birthDate: new Date(formData.personalInfo.birthDate),
        },
        specialNeeds: formData.specialNeeds,
        familyBackground: formData.familyBackground,
        legalStatus: {
          ...formData.legalStatus,
          placementDate: formData.legalStatus.placementDate ? new Date(formData.legalStatus.placementDate) : undefined,
        },
        currentStatus: 'awaiting',
      };

      if (childId) {
        await updateChild(childId, childData);
      } else {
        await addChild(childData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/children');
      }
    } catch (error) {
      console.error('Error saving child:', error);
      setErrors({ submit: 'Erro ao salvar criança. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/children');
    }
  };

  const addHealthCondition = () => {
    setFormData(prev => ({
      ...prev,
      specialNeeds: {
        ...prev.specialNeeds,
        healthConditions: [...prev.specialNeeds.healthConditions, '']
      }
    }));
  };

  const updateHealthCondition = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      specialNeeds: {
        ...prev.specialNeeds,
        healthConditions: prev.specialNeeds.healthConditions.map((condition, i) => 
          i === index ? value : condition
        )
      }
    }));
  };

  const removeHealthCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialNeeds: {
        ...prev.specialNeeds,
        healthConditions: prev.specialNeeds.healthConditions.filter((_, i) => i !== index)
      }
    }));
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      specialNeeds: {
        ...prev.specialNeeds,
        medications: [...prev.specialNeeds.medications, '']
      }
    }));
  };

  const updateMedication = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      specialNeeds: {
        ...prev.specialNeeds,
        medications: prev.specialNeeds.medications.map((med, i) => 
          i === index ? value : med
        )
      }
    }));
  };

  const removeMedication = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialNeeds: {
        ...prev.specialNeeds,
        medications: prev.specialNeeds.medications.filter((_, i) => i !== index)
      }
    }));
  };

  const addSibling = () => {
    setFormData(prev => ({
      ...prev,
      familyBackground: {
        ...prev.familyBackground,
        siblings: [...prev.familyBackground.siblings, '']
      }
    }));
  };

  const updateSibling = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      familyBackground: {
        ...prev.familyBackground,
        siblings: prev.familyBackground.siblings.map((sibling, i) => 
          i === index ? value : sibling
        )
      }
    }));
  };

  const removeSibling = (index: number) => {
    setFormData(prev => ({
      ...prev,
      familyBackground: {
        ...prev.familyBackground,
        siblings: prev.familyBackground.siblings.filter((_, i) => i !== index)
      }
    }));
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        
        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full
                  ${isCompleted ? 'bg-green-600 text-white' : 
                    isCurrent ? 'bg-primary-600 text-white' : 
                    'bg-gray-200 text-gray-600'}
                `}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`}>
                  Passo {step.id}
                </p>
                <p className={`text-xs ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`}>
                  {step.title}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo *
          </label>
          <input
            type="text"
            value={formData.personalInfo.name}
            onChange={(e) => updateFormData('personalInfo', { name: e.target.value })}
            className={`input-field ${errors['personalInfo.name'] ? 'border-red-500' : ''}`}
            placeholder="Digite o nome completo da criança"
          />
          {errors['personalInfo.name'] && (
            <p className="text-red-500 text-xs mt-1">{errors['personalInfo.name']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Nascimento *
          </label>
          <input
            type="date"
            value={formData.personalInfo.birthDate}
            onChange={(e) => updateFormData('personalInfo', { birthDate: e.target.value })}
            className={`input-field ${errors['personalInfo.birthDate'] ? 'border-red-500' : ''}`}
          />
          {errors['personalInfo.birthDate'] && (
            <p className="text-red-500 text-xs mt-1">{errors['personalInfo.birthDate']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gênero
          </label>
          <select
            value={formData.personalInfo.gender}
            onChange={(e) => updateFormData('personalInfo', { gender: e.target.value })}
            className="input-field"
          >
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CPF (se disponível)
          </label>
          <input
            type="text"
            value={formData.personalInfo.cpf}
            onChange={(e) => updateFormData('personalInfo', { cpf: e.target.value })}
            className="input-field"
            placeholder="000.000.000-00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certidão de Nascimento *
          </label>
          <input
            type="text"
            value={formData.personalInfo.birthCertificate}
            onChange={(e) => updateFormData('personalInfo', { birthCertificate: e.target.value })}
            className={`input-field ${errors['personalInfo.birthCertificate'] ? 'border-red-500' : ''}`}
            placeholder="Número da certidão de nascimento"
          />
          {errors['personalInfo.birthCertificate'] && (
            <p className="text-red-500 text-xs mt-1">{errors['personalInfo.birthCertificate']}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Necessidades Especiais</h3>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="hasSpecialNeeds"
            checked={formData.specialNeeds.hasSpecialNeeds}
            onChange={(e) => updateFormData('specialNeeds', { hasSpecialNeeds: e.target.checked })}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="hasSpecialNeeds" className="ml-2 text-sm font-medium text-gray-700">
            Esta criança possui necessidades especiais
          </label>
        </div>

        {formData.specialNeeds.hasSpecialNeeds && (
          <div className="space-y-6 pl-6 border-l-2 border-caring-200">
            {/* Health Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Condições de Saúde
              </label>
              {formData.specialNeeds.healthConditions.map((condition, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => updateHealthCondition(index, e.target.value)}
                    className="input-field flex-1"
                    placeholder="Descreva a condição de saúde"
                  />
                  <button
                    type="button"
                    onClick={() => removeHealthCondition(index)}
                    className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addHealthCondition}
                className="mt-2 px-4 py-2 text-sm text-caring-600 border border-caring-300 rounded-md hover:bg-caring-50"
              >
                + Adicionar Condição de Saúde
              </button>
            </div>

            {/* Medications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medicações
              </label>
              {formData.specialNeeds.medications.map((medication, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => updateMedication(index, e.target.value)}
                    className="input-field flex-1"
                    placeholder="Nome da medicação e dosagem"
                  />
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMedication}
                className="mt-2 px-4 py-2 text-sm text-caring-600 border border-caring-300 rounded-md hover:bg-caring-50"
              >
                + Adicionar Medicação
              </button>
            </div>

            {/* Educational Needs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Necessidades Educacionais
              </label>
              <textarea
                value={formData.specialNeeds.educationalNeeds.join('\n')}
                onChange={(e) => updateFormData('specialNeeds', { 
                  educationalNeeds: e.target.value.split('\n').filter(need => need.trim()) 
                })}
                className="input-field"
                rows={4}
                placeholder="Descreva as necessidades educacionais especiais (uma por linha)"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Contexto Familiar</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Família de Origem
          </label>
          <textarea
            value={formData.familyBackground.originFamily}
            onChange={(e) => updateFormData('familyBackground', { originFamily: e.target.value })}
            className="input-field"
            rows={3}
            placeholder="Informações sobre a família de origem"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Irmãos
          </label>
          {formData.familyBackground.siblings.map((sibling, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={sibling}
                onChange={(e) => updateSibling(index, e.target.value)}
                className="input-field flex-1"
                placeholder="Nome e idade do irmão/irmã"
              />
              <button
                type="button"
                onClick={() => removeSibling(index)}
                className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSibling}
            className="mt-2 px-4 py-2 text-sm text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50"
          >
            + Adicionar Irmão/Irmã
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vínculos Comunitários
          </label>
          <textarea
            value={formData.familyBackground.communityTies.join('\n')}
            onChange={(e) => updateFormData('familyBackground', { 
              communityTies: e.target.value.split('\n').filter(tie => tie.trim()) 
            })}
            className="input-field"
            rows={3}
            placeholder="Escola, amigos, atividades, comunidade religiosa (uma por linha)"
          />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Status Legal</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ordem Judicial *
          </label>
          <input
            type="text"
            value={formData.legalStatus.courtOrder}
            onChange={(e) => updateFormData('legalStatus', { courtOrder: e.target.value })}
            className={`input-field ${errors['legalStatus.courtOrder'] ? 'border-red-500' : ''}`}
            placeholder="Número da ordem judicial"
          />
          {errors['legalStatus.courtOrder'] && (
            <p className="text-red-500 text-xs mt-1">{errors['legalStatus.courtOrder']}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Responsável Legal *
          </label>
          <input
            type="text"
            value={formData.legalStatus.legalGuardian}
            onChange={(e) => updateFormData('legalStatus', { legalGuardian: e.target.value })}
            className={`input-field ${errors['legalStatus.legalGuardian'] ? 'border-red-500' : ''}`}
            placeholder="Nome do responsável legal ou instituição"
          />
          {errors['legalStatus.legalGuardian'] && (
            <p className="text-red-500 text-xs mt-1">{errors['legalStatus.legalGuardian']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Acolhimento
          </label>
          <input
            type="date"
            value={formData.legalStatus.placementDate ? 
              new Date(formData.legalStatus.placementDate).toISOString().split('T')[0] : ''}
            onChange={(e) => updateFormData('legalStatus', { 
              placementDate: e.target.value ? e.target.value : undefined 
            })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duração Prevista (meses)
          </label>
          <input
            type="number"
            value={formData.legalStatus.expectedDuration || ''}
            onChange={(e) => updateFormData('legalStatus', { 
              expectedDuration: e.target.value ? parseInt(e.target.value) : undefined 
            })}
            className="input-field"
            min="1"
            max="60"
            placeholder="Duração em meses"
          />
        </div>
      </div>
    </div>
  );

  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {childId ? 'Editar Criança' : 'Nova Criança'}
          </h1>
          <p className="text-gray-600">
            Preencha todas as informações para {childId ? 'atualizar' : 'cadastrar'} a criança
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form Content */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {getCurrentStepContent()}

          {/* Error Message */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-600 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </button>
              )}
              
              <button
                type="button"
                onClick={handleCancel}
                className="btn-ghost"
              >
                Cancelar
              </button>
            </div>

            <div>
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary flex items-center space-x-2"
                >
                  <span>Próximo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{childId ? 'Atualizar' : 'Cadastrar'} Criança</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChildForm;