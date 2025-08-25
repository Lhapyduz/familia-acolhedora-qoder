import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { useBudget, useBudgetCalculations } from '../contexts/BudgetContext.js';
import { userService } from '../services/index.js';
import { 
  Settings, 
  DollarSign, 
  Users, 
  Bell, 
  Shield, 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  UserPlus, 
  UserCheck, 
  UserX,
  Shield as ShieldIcon,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import type { User, CreateUserRequest, UpdateUserRequest, UserStats, Permission, PermissionGroup } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function SettingsPage(): JSX.Element {
  const { user } = useAuth();
  const { settings, updateBudgetSettings } = useBudget();
  const { formatCurrency } = useBudgetCalculations();

  // Budget settings state
  const [budgetSettings, setBudgetSettings] = useState({
    minimumWage: settings.minimumWage,
    siblingMultiplier: settings.siblingMultiplier * 100, // Convert to percentage
    specialNeedsMultiplier: settings.specialNeedsMultiplier * 100, // Convert to percentage
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    reportReminders: true,
    visitReminders: true,
    budgetAlerts: true,
  });

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  // User form state
  const [userForm, setUserForm] = useState<CreateUserRequest>({
    email: '',
    name: '',
    role: 'technician',
    permissions: [],
    isActive: true
  });

  const permissionGroups: PermissionGroup[] = userService.getPermissionGroups();

  // Load users data
  useEffect(() => {
    if (user?.role === 'coordinator') {
      loadUsersData();
    }
  }, [user]);

  const loadUsersData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const [usersResponse, statsData] = await Promise.all([
        userService.list(),
        userService.getStats()
      ]);
      setUsers(usersResponse.data);
      setUserStats(statsData);
    } catch (err) {
      setError('Erro ao carregar dados dos usuários');
      console.error('Failed to load users data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBudgetSettingsChange = (field: string, value: number) => {
    setBudgetSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveBudgetSettings = () => {
    updateBudgetSettings({
      minimumWage: budgetSettings.minimumWage,
      siblingMultiplier: budgetSettings.siblingMultiplier / 100,
      specialNeedsMultiplier: budgetSettings.specialNeedsMultiplier / 100,
    });
    alert('Configurações salvas com sucesso!');
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // User management handlers
  const handleCreateUser = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await userService.create(userForm);
      setShowUserForm(false);
      resetUserForm();
      await loadUsersData();
      alert('Usuário criado com sucesso!');
    } catch (err) {
      setError('Erro ao criar usuário');
      console.error('Failed to create user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: UpdateUserRequest): Promise<void> => {
    try {
      setIsLoading(true);
      await userService.update(userId, updates);
      setEditingUser(null);
      await loadUsersData();
      alert('Usuário atualizado com sucesso!');
    } catch (err) {
      setError('Erro ao atualizar usuário');
      console.error('Failed to update user:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: string): Promise<void> => {
    if (confirm('Tem certeza que deseja alterar o status deste usuário?')) {
      try {
        setIsLoading(true);
        await userService.toggleStatus(userId);
        await loadUsersData();
      } catch (err) {
        setError('Erro ao alterar status do usuário');
        console.error('Failed to toggle user status:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteUser = async (userId: string): Promise<void> => {
    if (confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      try {
        setIsLoading(true);
        await userService.delete(userId);
        await loadUsersData();
        alert('Usuário excluído com sucesso!');
      } catch (err) {
        setError('Erro ao excluir usuário');
        console.error('Failed to delete user:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleUpdatePermissions = async (userId: string, permissions: Permission[]): Promise<void> => {
    try {
      setIsLoading(true);
      await userService.updatePermissions(userId, permissions);
      await loadUsersData();
      alert('Permissões atualizadas com sucesso!');
    } catch (err) {
      setError('Erro ao atualizar permissões');
      console.error('Failed to update permissions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetUserForm = (): void => {
    setUserForm({
      email: '',
      name: '',
      role: 'technician',
      permissions: [],
      isActive: true
    });
  };

  const getDefaultPermissions = (role: 'coordinator' | 'technician'): Permission[] => {
    if (role === 'coordinator') {
      return [
        'families:read', 'families:write', 'families:delete',
        'children:read', 'children:write', 'children:delete',
        'matching:read', 'matching:write',
        'budget:read', 'budget:write',
        'reports:read', 'reports:write',
        'settings:read', 'settings:write',
        'users:read', 'users:write', 'users:delete'
      ];
    } else {
      return [
        'families:read', 'families:write',
        'children:read', 'children:write',
        'matching:read', 'matching:write',
        'reports:read', 'reports:write'
      ];
    }
  };

  const handleRoleChange = (role: 'coordinator' | 'technician'): void => {
    setUserForm(prev => ({
      ...prev,
      role,
      permissions: getDefaultPermissions(role)
    }));
  };

  const formatLastLogin = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 48) return 'Ontem';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurações do Sistema
          </h1>
          <p className="text-gray-600">
            Gerencie as configurações do programa Família Acolhedora
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Geral
          </button>
          
          {user?.role === 'coordinator' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Usuários
            </button>
          )}
        </nav>
      </div>

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Budget Configuration */}
          <div className="card">
            <div className="flex items-center mb-6">
              <DollarSign className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configuração de Orçamento
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salário Mínimo Brasileiro (R$)
                </label>
                <input
                  type="number"
                  value={budgetSettings.minimumWage}
                  onChange={(e) => handleBudgetSettingsChange('minimumWage', parseFloat(e.target.value) || 0)}
                  className="input-field"
                  placeholder="1320.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor base para cálculo dos custos de acolhimento
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiplicador por Irmão (%)
                </label>
                <input
                  type="number"
                  value={budgetSettings.siblingMultiplier}
                  onChange={(e) => handleBudgetSettingsChange('siblingMultiplier', parseFloat(e.target.value) || 0)}
                  className="input-field"
                  placeholder="30"
                  min="0"
                  max="100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual adicional por irmão acolhido junto
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiplicador Necessidades Especiais (%)
                </label>
                <input
                  type="number"
                  value={budgetSettings.specialNeedsMultiplier}
                  onChange={(e) => handleBudgetSettingsChange('specialNeedsMultiplier', parseFloat(e.target.value) || 0)}
                  className="input-field"
                  placeholder="50"
                  min="0"
                  max="200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual adicional para crianças com necessidades especiais
                </p>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSaveBudgetSettings}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Save className="h-5 w-5" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </div>

            {/* Preview Calculations */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Prévia dos Cálculos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Custo base por criança:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(budgetSettings.minimumWage)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Adicional por irmão:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(budgetSettings.minimumWage * (budgetSettings.siblingMultiplier / 100))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Adicional necessidades especiais:</span>
                  <span className="ml-2 font-medium">
                    {formatCurrency(budgetSettings.minimumWage * (budgetSettings.specialNeedsMultiplier / 100))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card">
            <div className="flex items-center mb-6">
              <Bell className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Configurações de Notificação
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Notificações por Email
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receber notificações importantes por email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNotifications}
                    onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Lembretes de Relatórios
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receber lembretes antes do vencimento dos relatórios
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.reportReminders}
                    onChange={(e) => handleNotificationChange('reportReminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Lembretes de Visitas
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receber lembretes sobre visitas técnicas agendadas
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.visitReminders}
                    onChange={(e) => handleNotificationChange('visitReminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    Alertas de Orçamento
                  </h3>
                  <p className="text-sm text-gray-500">
                    Receber alertas quando o orçamento estiver próximo do limite
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings.budgetAlerts}
                    onChange={(e) => handleNotificationChange('budgetAlerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="card">
            <div className="flex items-center mb-6">
              <Shield className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Informações do Sistema
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Versão do Sistema
                </h3>
                <p className="text-sm text-gray-600">
                  Família Acolhedora v1.0.0
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Último Backup
                </h3>
                <p className="text-sm text-gray-600">
                  Hoje às 03:00 (Automático)
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Conformidade LGPD
                </h3>
                <p className="text-sm text-green-600">
                  ✓ Sistema em conformidade
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  Suporte Técnico
                </h3>
                <p className="text-sm text-gray-600">
                  suporte@familiacolhedora.gov.br
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && user?.role === 'coordinator' && (
        <div className="space-y-6">
          {/* User Statistics */}
          {userStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                    <p className="text-lg font-bold text-gray-900">{userStats.total}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Ativos</p>
                    <p className="text-lg font-bold text-gray-900">{userStats.active}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <ShieldIcon className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Coordenadores</p>
                    <p className="text-lg font-bold text-gray-900">{userStats.coordinators}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Técnicos</p>
                    <p className="text-lg font-bold text-gray-900">{userStats.technicians}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Management Header */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-caring-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">
                  Gerenciamento de Usuários
                </h2>
              </div>
              
              <button
                onClick={() => {
                  resetUserForm();
                  setShowUserForm(true);
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <UserPlus className="h-5 w-5" />
                <span>Adicionar Usuário</span>
              </button>
            </div>

            {/* Users List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((userItem) => (
                  <div key={userItem.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          userItem.isActive ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Users className={`h-5 w-5 ${
                            userItem.isActive ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              {userItem.name}
                            </p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              userItem.role === 'coordinator' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {userItem.role === 'coordinator' ? 'Coordenador' : 'Técnico'}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              userItem.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {userItem.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {userItem.email} • Último acesso: {formatLastLogin(userItem.lastLogin)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {userItem.permissions.length} permissões
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowPermissions(showPermissions === userItem.id ? null : userItem.id)}
                          className="btn-secondary text-xs flex items-center space-x-1"
                        >
                          {showPermissions === userItem.id ? (
                            <><EyeOff className="h-3 w-3" /><span>Ocultar</span></>
                          ) : (
                            <><Eye className="h-3 w-3" /><span>Permissões</span></>
                          )}
                        </button>
                        
                        <button
                          onClick={() => {
                            setEditingUser(userItem);
                            setUserForm({
                              email: userItem.email,
                              name: userItem.name,
                              role: userItem.role,
                              permissions: userItem.permissions,
                              isActive: userItem.isActive
                            });
                            setShowUserForm(true);
                          }}
                          className="btn-secondary text-xs flex items-center space-x-1"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Editar</span>
                        </button>
                        
                        <button
                          onClick={() => handleToggleUserStatus(userItem.id)}
                          className={`btn-secondary text-xs flex items-center space-x-1 ${
                            userItem.isActive ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {userItem.isActive ? (
                            <><UserX className="h-3 w-3" /><span>Desativar</span></>
                          ) : (
                            <><UserCheck className="h-3 w-3" /><span>Ativar</span></>
                          )}
                        </button>
                        
                        {userItem.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(userItem.id)}
                            className="btn-secondary text-xs text-red-600 flex items-center space-x-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Permissions Display */}
                    {showPermissions === userItem.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Permissões Atuais</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {permissionGroups.map((group) => {
                            const userGroupPermissions = userItem.permissions.filter(p => 
                              group.permissions.includes(p)
                            );
                            
                            if (userGroupPermissions.length === 0) return null;
                            
                            return (
                              <div key={group.id} className="bg-gray-50 p-3 rounded-lg">
                                <h5 className="text-xs font-medium text-gray-700 mb-2">{group.name}</h5>
                                <div className="space-y-1">
                                  {userGroupPermissions.map((permission) => (
                                    <div key={permission} className="flex items-center space-x-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-gray-600">
                                        {permission.includes(':read') && 'Visualizar'}
                                        {permission.includes(':write') && 'Editar'}
                                        {permission.includes(':delete') && 'Excluir'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {users.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Nenhum usuário encontrado
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Adicione o primeiro usuário ao sistema.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
              </h3>
              <button
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  resetUserForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Digite o nome completo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  placeholder="usuario@familiacolhedora.gov.br"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cargo
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) => handleRoleChange(e.target.value as 'coordinator' | 'technician')}
                  className="input-field"
                >
                  <option value="technician">Técnico</option>
                  <option value="coordinator">Coordenador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Permissões
                </label>
                <div className="space-y-3">
                  {permissionGroups.map((group) => {
                    const groupPermissions = group.permissions.filter(p => 
                      getDefaultPermissions(userForm.role).includes(p)
                    );
                    
                    if (groupPermissions.length === 0) return null;
                    
                    return (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">{group.name}</h4>
                        <p className="text-xs text-gray-500 mb-3">{group.description}</p>
                        <div className="space-y-2">
                          {groupPermissions.map((permission) => (
                            <label key={permission} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={userForm.permissions.includes(permission)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setUserForm(prev => ({
                                      ...prev,
                                      permissions: [...prev.permissions, permission]
                                    }));
                                  } else {
                                    setUserForm(prev => ({
                                      ...prev,
                                      permissions: prev.permissions.filter(p => p !== permission)
                                    }));
                                  }
                                }}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">
                                {permission.includes(':read') && 'Visualizar'}
                                {permission.includes(':write') && 'Editar'}
                                {permission.includes(':delete') && 'Excluir'}
                                {' '}
                                {group.name.toLowerCase()}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={userForm.isActive}
                  onChange={(e) => setUserForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Usuário ativo
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  resetUserForm();
                }}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (editingUser) {
                    handleUpdateUser(editingUser.id, userForm);
                  } else {
                    handleCreateUser();
                  }
                }}
                disabled={isLoading || !userForm.name || !userForm.email}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                {isLoading && <LoadingSpinner size="small" />}
                <span>{editingUser ? 'Atualizar' : 'Criar'} Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;