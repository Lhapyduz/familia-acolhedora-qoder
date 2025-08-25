import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import type { LoginCredentials } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import { Heart, Users, Baby } from 'lucide-react';

function LoginPage(): JSX.Element {
  const { isAuthenticated, login, error, clearError, isLoading } = useAuth();
  const location = useLocation();
  
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    role: 'coordinator'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'coordinator' | 'technician'>('coordinator');

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || isLoading) return;

    try {
      setIsSubmitting(true);
      clearError();
      
      await login({
        ...credentials,
        role: selectedRole
      });
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleSelect = (role: 'coordinator' | 'technician') => {
    setSelectedRole(role);
    clearError();
    
    // Set demo credentials based on role
    if (role === 'coordinator') {
      setCredentials({
        email: 'admin@familiacolhedora.gov.br',
        password: 'admin123',
        role: 'coordinator'
      });
    } else {
      setCredentials({
        email: 'tecnico@familiacolhedora.gov.br',
        password: 'tech123',
        role: 'technician'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-caring-50 to-warm-50 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Heart className="h-16 w-16 text-caring-300" fill="currentColor" />
                <div className="absolute -top-2 -right-2">
                  <Users className="h-8 w-8 text-warm-300" />
                </div>
                <div className="absolute -bottom-2 -left-2">
                  <Baby className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">
              Família Acolhedora
            </h1>
            <p className="text-xl text-primary-100 mb-8 leading-relaxed">
              Sistema de Gestão do Programa de Acolhimento Familiar
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Transformando Vidas através do Cuidado
            </h3>
            <div className="space-y-3 text-sm text-primary-100">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-caring-400 rounded-full mr-3"></div>
                <span>Gestão completa de famílias acolhedoras</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-warm-400 rounded-full mr-3"></div>
                <span>Acompanhamento de crianças e adolescentes</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                <span>Relatórios e estatísticas em tempo real</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8 lg:hidden">
            <div className="flex justify-center mb-4">
              <Heart className="h-12 w-12 text-primary-600" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Família Acolhedora
            </h1>
            <p className="text-gray-600">
              Sistema de Gestão
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-600">
                Faça login para acessar o sistema
              </p>
            </div>

            {/* Role Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Usuário
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('coordinator')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedRole === 'coordinator'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Users className="h-6 w-6 mx-auto mb-2" />
                  <span className="block text-sm font-medium">Coordenador</span>
                  <span className="block text-xs opacity-75">Acesso total</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleRoleSelect('technician')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedRole === 'technician'
                      ? 'border-caring-500 bg-caring-50 text-caring-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Baby className="h-6 w-6 mx-auto mb-2" />
                  <span className="block text-sm font-medium">Técnico</span>
                  <span className="block text-xs opacity-75">Operacional</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={credentials.email}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Digite seu email"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Digite sua senha"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors duration-200 ${
                  selectedRole === 'coordinator'
                    ? 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500'
                    : 'bg-caring-600 hover:bg-caring-700 focus:ring-caring-500'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting || isLoading ? (
                  <LoadingSpinner size="small" />
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            {/* Demo Information */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Credenciais de Demonstração
              </h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  <strong>Coordenador:</strong> admin@familiacolhedora.gov.br / admin123
                </div>
                <div>
                  <strong>Técnico:</strong> tecnico@familiacolhedora.gov.br / tech123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;