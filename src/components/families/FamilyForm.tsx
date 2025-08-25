import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext.js';
import { ArrowLeft, ArrowRight, Check, User, Users, Home, Heart, FileText } from 'lucide-react';
import type { CreateFamilyRequest, FamilyMember, Address } from '../../types/index.js';

interface FormData {
  // Step 1: Primary Contact
  primaryContact: {
    name: string;
    cpf: string;
    phone: string;
    email: string;
    birthDate: string;
    profession: string;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'civil_union';
  };
  
  // Step 2: Address
  address: Address;
  
  // Step 3: Family Composition
  composition: FamilyMember[];
  
  // Step 4: Preferences & Availability
  preferences: {
    ageRange: { min: number; max: number };
    gender: 'any' | 'male' | 'female';
    specialNeeds: boolean;
    maxChildren: number;
    temporaryOnly: boolean;
  };
  
  // Step 5: Additional Information
  additionalInfo: {
    motivation: string;
    experience: string;
    limitations: string[];
    previousFosterCare: boolean;
    previousFosterCareDetails: string;
    homeOwnership: 'owned' | 'rented' | 'family_property';
    monthlyIncome: number;
    hasVehicle: boolean;
    acceptsEmergencyPlacement: boolean;
  };
}

const initialFormData: FormData = {
  primaryContact: {
    name: '',
    cpf: '',
    phone: '',
    email: '',
    birthDate: '',
    profession: '',
    maritalStatus: 'single',
  },
  address: {
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  },
  composition: [],
  preferences: {
    ageRange: { min: 0, max: 18 },
    gender: 'any',
    specialNeeds: false,
    maxChildren: 1,
    temporaryOnly: false,
  },
  additionalInfo: {
    motivation: '',
    experience: '',
    limitations: [],
    previousFosterCare: false,
    previousFosterCareDetails: '',
    homeOwnership: 'owned',
    monthlyIncome: 0,
    hasVehicle: false,
    acceptsEmergencyPlacement: false,
  },
};

const steps = [
  { id: 1, title: 'Contato Principal', icon: User },
  { id: 2, title: 'Endereço', icon: Home },
  { id: 3, title: 'Composição Familiar', icon: Users },
  { id: 4, title: 'Preferências', icon: Heart },
  { id: 5, title: 'Informações Adicionais', icon: FileText },
];

interface FamilyFormProps {
  familyId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function FamilyForm({ familyId, onSuccess, onCancel }: FamilyFormProps): JSX.Element {
  const navigate = useNavigate();
  const { addFamily, updateFamily, families } = useFamily();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing family data if editing
  React.useEffect(() => {
    if (familyId) {
      const existingFamily = families.find(f => f.id === familyId);
      if (existingFamily) {
        setFormData({
          primaryContact: {
            name: existingFamily.primaryContact.name,
            cpf: existingFamily.primaryContact.cpf,
            phone: existingFamily.primaryContact.phone,
            email: existingFamily.primaryContact.email,
            birthDate: '',
            profession: '',
            maritalStatus: 'single',
          },
          address: existingFamily.address,
          composition: existingFamily.composition,
          preferences: existingFamily.preferences,
          additionalInfo: {
            motivation: '',
            experience: '',
            limitations: existingFamily.limitations || [],
            previousFosterCare: false,
            previousFosterCareDetails: '',
            homeOwnership: 'owned',
            monthlyIncome: 0,
            hasVehicle: false,
            acceptsEmergencyPlacement: false,
          },
        });
      }
    }
  }, [familyId, families]);

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
        if (!formData.primaryContact.name.trim()) {
          newErrors['primaryContact.name'] = 'Nome é obrigatório';
        }
        if (!formData.primaryContact.cpf.trim()) {
          newErrors['primaryContact.cpf'] = 'CPF é obrigatório';
        }
        if (!formData.primaryContact.phone.trim()) {
          newErrors['primaryContact.phone'] = 'Telefone é obrigatório';
        }
        if (!formData.primaryContact.email.trim()) {
          newErrors['primaryContact.email'] = 'Email é obrigatório';
        }
        break;
      case 2:
        if (!formData.address.street.trim()) {
          newErrors['address.street'] = 'Rua é obrigatória';
        }
        if (!formData.address.number.trim()) {
          newErrors['address.number'] = 'Número é obrigatório';
        }
        if (!formData.address.neighborhood.trim()) {
          newErrors['address.neighborhood'] = 'Bairro é obrigatório';
        }
        if (!formData.address.city.trim()) {
          newErrors['address.city'] = 'Cidade é obrigatória';
        }
        if (!formData.address.state.trim()) {
          newErrors['address.state'] = 'Estado é obrigatório';
        }
        if (!formData.address.zipCode.trim()) {
          newErrors['address.zipCode'] = 'CEP é obrigatório';
        }
        break;
      case 4:
        if (formData.preferences.ageRange.min >= formData.preferences.ageRange.max) {
          newErrors['preferences.ageRange'] = 'Idade mínima deve ser menor que a máxima';
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
      const familyData: CreateFamilyRequest = {
        primaryContact: formData.primaryContact,
        address: formData.address,
        composition: formData.composition,
        preferences: formData.preferences,
        limitations: formData.additionalInfo.limitations,
        status: 'under_evaluation',
      };

      if (familyId) {
        await updateFamily(familyId, familyData);
      } else {
        await addFamily(familyData);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/families');
      }
    } catch (error) {
      console.error('Error saving family:', error);
      setErrors({ submit: 'Erro ao salvar família. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/families');
    }
  };

  const addFamilyMember = () => {
    const newMember: FamilyMember = {
      name: '',
      relationship: 'spouse',
      age: 0,
      profession: '',
      income: 0,
    };
    setFormData(prev => ({
      ...prev,
      composition: [...prev.composition, newMember]
    }));
  };

  const updateFamilyMember = (index: number, member: Partial<FamilyMember>) => {
    setFormData(prev => ({
      ...prev,
      composition: prev.composition.map((m, i) => i === index ? { ...m, ...member } : m)
    }));
  };

  const removeFamilyMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      composition: prev.composition.filter((_, i) => i !== index)
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
      <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Contato Principal</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Completo *
          </label>
          <input
            type="text"
            value={formData.primaryContact.name}
            onChange={(e) => updateFormData('primaryContact', { name: e.target.value })}
            className={`input-field ${errors['primaryContact.name'] ? 'border-red-500' : ''}`}
            placeholder="Digite o nome completo"
          />
          {errors['primaryContact.name'] && (
            <p className="text-red-500 text-xs mt-1">{errors['primaryContact.name']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CPF *
          </label>
          <input
            type="text"
            value={formData.primaryContact.cpf}
            onChange={(e) => updateFormData('primaryContact', { cpf: e.target.value })}
            className={`input-field ${errors['primaryContact.cpf'] ? 'border-red-500' : ''}`}
            placeholder="000.000.000-00"
          />
          {errors['primaryContact.cpf'] && (
            <p className="text-red-500 text-xs mt-1">{errors['primaryContact.cpf']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone *
          </label>
          <input
            type="tel"
            value={formData.primaryContact.phone}
            onChange={(e) => updateFormData('primaryContact', { phone: e.target.value })}
            className={`input-field ${errors['primaryContact.phone'] ? 'border-red-500' : ''}`}
            placeholder="(11) 99999-9999"
          />
          {errors['primaryContact.phone'] && (
            <p className="text-red-500 text-xs mt-1">{errors['primaryContact.phone']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={formData.primaryContact.email}
            onChange={(e) => updateFormData('primaryContact', { email: e.target.value })}
            className={`input-field ${errors['primaryContact.email'] ? 'border-red-500' : ''}`}
            placeholder="email@exemplo.com"
          />
          {errors['primaryContact.email'] && (
            <p className="text-red-500 text-xs mt-1">{errors['primaryContact.email']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Nascimento
          </label>
          <input
            type="date"
            value={formData.primaryContact.birthDate}
            onChange={(e) => updateFormData('primaryContact', { birthDate: e.target.value })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado Civil
          </label>
          <select
            value={formData.primaryContact.maritalStatus}
            onChange={(e) => updateFormData('primaryContact', { maritalStatus: e.target.value })}
            className="input-field"
          >
            <option value="single">Solteiro(a)</option>
            <option value="married">Casado(a)</option>
            <option value="civil_union">União Estável</option>
            <option value="divorced">Divorciado(a)</option>
            <option value="widowed">Viúvo(a)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profissão
          </label>
          <input
            type="text"
            value={formData.primaryContact.profession}
            onChange={(e) => updateFormData('primaryContact', { profession: e.target.value })}
            className="input-field"
            placeholder="Digite a profissão"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Endereço Residencial</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rua/Avenida *
          </label>
          <input
            type="text"
            value={formData.address.street}
            onChange={(e) => updateFormData('address', { street: e.target.value })}
            className={`input-field ${errors['address.street'] ? 'border-red-500' : ''}`}
            placeholder="Digite o nome da rua"
          />
          {errors['address.street'] && (
            <p className="text-red-500 text-xs mt-1">{errors['address.street']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número *
          </label>
          <input
            type="text"
            value={formData.address.number}
            onChange={(e) => updateFormData('address', { number: e.target.value })}
            className={`input-field ${errors['address.number'] ? 'border-red-500' : ''}`}
            placeholder="123"
          />
          {errors['address.number'] && (
            <p className="text-red-500 text-xs mt-1">{errors['address.number']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Complemento
          </label>
          <input
            type="text"
            value={formData.address.complement}
            onChange={(e) => updateFormData('address', { complement: e.target.value })}
            className="input-field"
            placeholder="Apto 101, Bloco A"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bairro *
          </label>
          <input
            type="text"
            value={formData.address.neighborhood}
            onChange={(e) => updateFormData('address', { neighborhood: e.target.value })}
            className={`input-field ${errors['address.neighborhood'] ? 'border-red-500' : ''}`}
            placeholder="Digite o bairro"
          />
          {errors['address.neighborhood'] && (
            <p className="text-red-500 text-xs mt-1">{errors['address.neighborhood']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cidade *
          </label>
          <input
            type="text"
            value={formData.address.city}
            onChange={(e) => updateFormData('address', { city: e.target.value })}
            className={`input-field ${errors['address.city'] ? 'border-red-500' : ''}`}
            placeholder="Digite a cidade"
          />
          {errors['address.city'] && (
            <p className="text-red-500 text-xs mt-1">{errors['address.city']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado *
          </label>
          <select
            value={formData.address.state}
            onChange={(e) => updateFormData('address', { state: e.target.value })}
            className={`input-field ${errors['address.state'] ? 'border-red-500' : ''}`}
          >
            <option value="">Selecione o estado</option>
            <option value="SP">São Paulo</option>
            <option value="RJ">Rio de Janeiro</option>
            <option value="MG">Minas Gerais</option>
            <option value="RS">Rio Grande do Sul</option>
            <option value="PR">Paraná</option>
            <option value="SC">Santa Catarina</option>
            <option value="BA">Bahia</option>
            <option value="GO">Goiás</option>
            <option value="PE">Pernambuco</option>
            <option value="CE">Ceará</option>
          </select>
          {errors['address.state'] && (
            <p className="text-red-500 text-xs mt-1">{errors['address.state']}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CEP *
          </label>
          <input
            type="text"
            value={formData.address.zipCode}
            onChange={(e) => updateFormData('address', { zipCode: e.target.value })}
            className={`input-field ${errors['address.zipCode'] ? 'border-red-500' : ''}`}
            placeholder="00000-000"
          />
          {errors['address.zipCode'] && (
            <p className="text-red-500 text-xs mt-1">{errors['address.zipCode']}</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Composição Familiar</h3>
      
      {formData.composition.length > 0 && (
        <div className="space-y-4">
          {formData.composition.map((member, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateFamilyMember(index, { name: e.target.value })}
                    className="input-field"
                    placeholder="Nome do membro"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Parentesco
                  </label>
                  <select
                    value={member.relationship}
                    onChange={(e) => updateFamilyMember(index, { relationship: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="spouse">Cônjuge</option>
                    <option value="child">Filho(a)</option>
                    <option value="parent">Pai/Mãe</option>
                    <option value="sibling">Irmão/Irmã</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Idade
                  </label>
                  <input
                    type="number"
                    value={member.age}
                    onChange={(e) => updateFamilyMember(index, { age: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    max="120"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={member.profession}
                    onChange={(e) => updateFamilyMember(index, { profession: e.target.value })}
                    className="input-field"
                    placeholder="Profissão"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Renda (R$)
                  </label>
                  <input
                    type="number"
                    value={member.income}
                    onChange={(e) => updateFamilyMember(index, { income: parseFloat(e.target.value) || 0 })}
                    className="input-field"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeFamilyMember(index)}
                    className="w-full px-3 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button
        type="button"
        onClick={addFamilyMember}
        className="w-full px-4 py-2 text-sm text-primary-600 border border-primary-300 rounded-md hover:bg-primary-50"
      >
        + Adicionar Membro da Família
      </button>
      
      {formData.composition.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2">Nenhum membro adicionado ainda</p>
          <p className="text-sm">Clique no botão acima para adicionar membros da família</p>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Preferências de Acolhimento</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faixa Etária - Idade Mínima
          </label>
          <input
            type="number"
            value={formData.preferences.ageRange.min}
            onChange={(e) => updateFormData('preferences', { 
              ageRange: { ...formData.preferences.ageRange, min: parseInt(e.target.value) || 0 }
            })}
            className="input-field"
            min="0"
            max="17"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faixa Etária - Idade Máxima
          </label>
          <input
            type="number"
            value={formData.preferences.ageRange.max}
            onChange={(e) => updateFormData('preferences', { 
              ageRange: { ...formData.preferences.ageRange, max: parseInt(e.target.value) || 18 }
            })}
            className="input-field"
            min="0"
            max="18"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferência de Gênero
          </label>
          <select
            value={formData.preferences.gender}
            onChange={(e) => updateFormData('preferences', { gender: e.target.value })}
            className="input-field"
          >
            <option value="any">Qualquer</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número Máximo de Crianças
          </label>
          <input
            type="number"
            value={formData.preferences.maxChildren}
            onChange={(e) => updateFormData('preferences', { maxChildren: parseInt(e.target.value) || 1 })}
            className="input-field"
            min="1"
            max="10"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="specialNeeds"
            checked={formData.preferences.specialNeeds}
            onChange={(e) => updateFormData('preferences', { specialNeeds: e.target.checked })}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="specialNeeds" className="ml-2 text-sm text-gray-700">
            Aceita acolher crianças com necessidades especiais
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="temporaryOnly"
            checked={formData.preferences.temporaryOnly}
            onChange={(e) => updateFormData('preferences', { temporaryOnly: e.target.checked })}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="temporaryOnly" className="ml-2 text-sm text-gray-700">
            Apenas acolhimento temporário (até 6 meses)
          </label>
        </div>
      </div>

      {errors['preferences.ageRange'] && (
        <p className="text-red-500 text-sm">{errors['preferences.ageRange']}</p>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Adicionais</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Motivação para ser família acolhedora
        </label>
        <textarea
          value={formData.additionalInfo.motivation}
          onChange={(e) => updateFormData('additionalInfo', { motivation: e.target.value })}
          className="input-field"
          rows={4}
          placeholder="Descreva sua motivação para se tornar uma família acolhedora"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Experiência anterior com crianças
        </label>
        <textarea
          value={formData.additionalInfo.experience}
          onChange={(e) => updateFormData('additionalInfo', { experience: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="Descreva sua experiência com cuidado de crianças"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Situação do Imóvel
          </label>
          <select
            value={formData.additionalInfo.homeOwnership}
            onChange={(e) => updateFormData('additionalInfo', { homeOwnership: e.target.value })}
            className="input-field"
          >
            <option value="owned">Próprio</option>
            <option value="rented">Alugado</option>
            <option value="family_property">Casa da Família</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Renda Familiar Mensal (R$)
          </label>
          <input
            type="number"
            value={formData.additionalInfo.monthlyIncome}
            onChange={(e) => updateFormData('additionalInfo', { monthlyIncome: parseFloat(e.target.value) || 0 })}
            className="input-field"
            min="0"
            step="0.01"
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="hasVehicle"
            checked={formData.additionalInfo.hasVehicle}
            onChange={(e) => updateFormData('additionalInfo', { hasVehicle: e.target.checked })}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="hasVehicle" className="ml-2 text-sm text-gray-700">
            Possui veículo próprio
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="acceptsEmergencyPlacement"
            checked={formData.additionalInfo.acceptsEmergencyPlacement}
            onChange={(e) => updateFormData('additionalInfo', { acceptsEmergencyPlacement: e.target.checked })}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="acceptsEmergencyPlacement" className="ml-2 text-sm text-gray-700">
            Aceita acolhimentos de emergência
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="previousFosterCare"
            checked={formData.additionalInfo.previousFosterCare}
            onChange={(e) => updateFormData('additionalInfo', { previousFosterCare: e.target.checked })}
            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <label htmlFor="previousFosterCare" className="ml-2 text-sm text-gray-700">
            Já foi família acolhedora anteriormente
          </label>
        </div>
      </div>

      {formData.additionalInfo.previousFosterCare && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detalhes da experiência anterior
          </label>
          <textarea
            value={formData.additionalInfo.previousFosterCareDetails}
            onChange={(e) => updateFormData('additionalInfo', { previousFosterCareDetails: e.target.value })}
            className="input-field"
            rows={3}
            placeholder="Descreva sua experiência anterior como família acolhedora"
          />
        </div>
      )}
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
      case 5:
        return renderStep5();
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
            {familyId ? 'Editar Família Acolhedora' : 'Nova Família Acolhedora'}
          </h1>
          <p className="text-gray-600">
            Preencha todas as informações para {familyId ? 'atualizar' : 'cadastrar'} a família acolhedora
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
                      <span>{familyId ? 'Atualizar' : 'Cadastrar'} Família</span>
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

export default FamilyForm;