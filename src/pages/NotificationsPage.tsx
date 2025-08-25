import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext.js';
import {
  Bell,
  Check,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  Heart,
  DollarSign,
  Trash2,
  Plus,
  Search,
  Filter,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  Info
} from 'lucide-react';
import type { Notification } from '../types/index.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

function NotificationsPage(): JSX.Element {
  const {
    filteredNotifications,
    unreadNotifications,
    isLoading,
    isMarkingRead,
    isDeleting,
    error,
    activeFilter,
    searchTerm,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultiple,
    setFilter,
    setSearchTerm,
    refreshData,
    clearError,
    getNotificationIcon,
    getPriorityColor,
    formatTimeAgo
  } = useNotifications();

  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showCreateReminder, setShowCreateReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    message: '',
    scheduledFor: '',
    priority: 'medium' as Notification['priority']
  });

  const handleSelectNotification = (notificationId: string, selected: boolean) => {
    if (selected) {
      setSelectedNotifications(prev => [...prev, notificationId]);
    } else {
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
    }
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return;
    
    if (confirm(`Tem certeza que deseja excluir ${selectedNotifications.length} notificação(ões)?`)) {
      const success = await deleteMultiple(selectedNotifications);
      if (success) {
        setSelectedNotifications([]);
      }
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (confirm('Tem certeza que deseja excluir esta notificação?')) {
      await deleteNotification(notificationId);
    }
  };

  const getFilterLabel = (filter: typeof activeFilter): string => {
    const labels = {
      'all': 'Todas',
      'unread': 'Não Lidas',
      'report_due': 'Relatórios',
      'visit_reminder': 'Visitas',
      'placement_update': 'Acolhimentos',
      'budget_alert': 'Orçamento',
      'system': 'Sistema'
    };
    return labels[filter];
  };

  const getTypeIcon = (type: Notification['type']) => {
    const iconMap = {
      'report_due': FileText,
      'visit_reminder': Calendar,
      'placement_update': Heart,
      'budget_alert': DollarSign,
      'system': Bell
    };
    return iconMap[type] || Bell;
  };

  const renderNotificationCard = (notification: Notification) => {
    const Icon = getTypeIcon(notification.type);
    const isSelected = selectedNotifications.includes(notification.id);
    
    return (
      <div
        key={notification.id}
        className={`card hover:shadow-md transition-all ${
          !notification.isRead ? 'border-l-4 border-l-primary-500' : 'opacity-75'
        } ${
          isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''
        }`}
      >
        <div className="flex items-start space-x-4">
          {/* Selection Checkbox */}
          <div className="flex-shrink-0 mt-1">
            <button
              onClick={() => handleSelectNotification(notification.id, !isSelected)}
              className="p-1 rounded hover:bg-gray-100"
            >
              {isSelected ? (
                <CheckSquare className="h-5 w-5 text-primary-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          
          {/* Notification Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              getPriorityColor(notification.priority)
            }`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          
          {/* Notification Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <p className={`text-sm font-medium ${
                  notification.isRead ? 'text-gray-700' : 'text-gray-900'
                }`}>
                  {notification.title}
                </p>
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTimeAgo(notification.createdAt)}
                </div>
                
                {/* Priority Badge */}
                {notification.priority === 'urgent' && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    Urgente
                  </span>
                )}
                {notification.priority === 'high' && (
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Alta
                  </span>
                )}
              </div>
            </div>
            
            <p className={`mt-1 text-sm ${
              notification.isRead ? 'text-gray-500' : 'text-gray-600'
            }`}>
              {notification.message}
            </p>
            
            {/* Actions */}
            <div className="mt-3 flex items-center space-x-3">
              {notification.actionUrl && (
                <button className="text-sm text-primary-600 hover:text-primary-500 font-medium">
                  Ver Detalhes
                </button>
              )}
              
              {!notification.isRead && (
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  disabled={isMarkingRead}
                  className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Marcar como Lida
                </button>
              )}
              
              <button
                onClick={() => handleDeleteNotification(notification.id)}
                disabled={isDeleting}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Central de Notificações
          </h1>
          <p className="text-gray-600">
            Acompanhe todas as notificações e lembretes importantes
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateReminder(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Criar Lembrete</span>
          </button>
          
          <button
            onClick={markAllAsRead}
            disabled={isMarkingRead || unreadNotifications.length === 0}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>Marcar Todas como Lidas</span>
          </button>
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
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-lg font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Não Lidas</p>
                <p className="text-lg font-bold text-gray-900">{stats.unread}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Urgentes</p>
                <p className="text-lg font-bold text-gray-900">{stats.byPriority.urgent}</p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Relatórios</p>
                <p className="text-lg font-bold text-gray-900">{stats.byType.report_due}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {(['all', 'unread', 'report_due', 'visit_reminder', 'placement_update', 'budget_alert', 'system'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setFilter(filter)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {getFilterLabel(filter)}
                {stats && filter !== 'all' && (
                  <span className="ml-1 text-xs">
                    ({filter === 'unread' ? stats.unread : stats.byType[filter as keyof typeof stats.byType]})
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Search and Actions */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar notificações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 w-64"
              />
            </div>
            
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Bulk Actions */}
        {selectedNotifications.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center space-x-1 text-sm text-gray-700 hover:text-gray-900"
              >
                {selectedNotifications.length === filteredNotifications.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>{selectedNotifications.length} selecionada(s)</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="btn-secondary bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 flex items-center space-x-1"
              >
                <Trash2 className="h-4 w-4" />
                <span>Excluir Selecionadas</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || activeFilter !== 'all'
                  ? 'Nenhuma notificação encontrada'
                  : 'Nenhuma notificação'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || activeFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Você está em dia! Não há notificações pendentes no momento.'}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map(renderNotificationCard)
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;