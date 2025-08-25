import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService } from '../services/index.js';
import type { 
  Notification,
  EntityId 
} from '../types/index.js';

interface NotificationState {
  // Data
  notifications: Notification[];
  unreadNotifications: Notification[];
  filteredNotifications: Notification[];
  
  // Loading states
  isLoading: boolean;
  isMarkingRead: boolean;
  isDeleting: boolean;
  
  // Error handling
  error: string | null;
  
  // Filters
  activeFilter: 'all' | 'unread' | 'report_due' | 'visit_reminder' | 'placement_update' | 'budget_alert' | 'system';
  searchTerm: string;
  
  // Statistics
  stats: {
    total: number;
    unread: number;
    byType: Record<Notification['type'], number>;
    byPriority: Record<Notification['priority'], number>;
  } | null;
}

interface NotificationActions {
  // Core operations
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: EntityId) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: EntityId) => Promise<boolean>;
  deleteMultiple: (notificationIds: EntityId[]) => Promise<boolean>;
  
  // Filtering and searching
  setFilter: (filter: NotificationState['activeFilter']) => void;
  setSearchTerm: (term: string) => void;
  
  // Custom notifications
  createCustomReminder: (title: string, message: string, scheduledFor: Date, priority?: Notification['priority']) => Promise<boolean>;
  
  // Utilities
  refreshData: () => Promise<void>;
  clearError: () => void;
  getNotificationIcon: (type: Notification['type']) => React.ComponentType;
  getPriorityColor: (priority: Notification['priority']) => string;
  formatTimeAgo: (date: Date) => string;
}

type NotificationContextType = NotificationState & NotificationActions;

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps): JSX.Element {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadNotifications: [],
    filteredNotifications: [],
    isLoading: false,
    isMarkingRead: false,
    isDeleting: false,
    error: null,
    activeFilter: 'all',
    searchTerm: '',
    stats: null
  });

  // Load initial data and start automated reminders
  useEffect(() => {
    loadNotifications();
    startAutomatedReminders();
    
    return () => {
      stopAutomatedReminders();
    };
  }, []);

  // Update filtered notifications when filters change
  useEffect(() => {
    updateFilteredNotifications();
  }, [state.notifications, state.activeFilter, state.searchTerm]);

  // Load notifications stats when notifications change
  useEffect(() => {
    if (state.notifications.length > 0) {
      loadNotificationStats();
    }
  }, [state.notifications]);

  const getCurrentUserId = (): string => {
    // In a real app, this would get the current user from auth context
    return 'current-user-id';
  };

  const loadNotifications = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const userId = getCurrentUserId();
      const [allNotifications, unreadNotifications] = await Promise.all([
        notificationService.getNotificationsByUser(userId),
        notificationService.getUnreadNotifications(userId)
      ]);
      
      setState(prev => ({
        ...prev,
        notifications: allNotifications,
        unreadNotifications,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load notifications',
        isLoading: false
      }));
    }
  };

  const loadNotificationStats = async (): Promise<void> => {
    try {
      const userId = getCurrentUserId();
      const stats = await notificationService.getNotificationStats(userId);
      
      setState(prev => ({
        ...prev,
        stats
      }));
    } catch (error) {
      console.error('Failed to load notification stats:', error);
    }
  };

  const markAsRead = async (notificationId: EntityId): Promise<boolean> => {
    setState(prev => ({ ...prev, isMarkingRead: true, error: null }));
    
    try {
      await notificationService.markAsRead(notificationId);
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadNotifications: prev.unreadNotifications.filter(n => n.id !== notificationId),
        isMarkingRead: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to mark notification as read',
        isMarkingRead: false
      }));
      return false;
    }
  };

  const markAllAsRead = async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isMarkingRead: true, error: null }));
    
    try {
      const userId = getCurrentUserId();
      await notificationService.markAllAsRead(userId);
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
        unreadNotifications: [],
        isMarkingRead: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to mark all notifications as read',
        isMarkingRead: false
      }));
      return false;
    }
  };

  const deleteNotification = async (notificationId: EntityId): Promise<boolean> => {
    setState(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      const success = await notificationService.deleteNotification(notificationId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== notificationId),
          unreadNotifications: prev.unreadNotifications.filter(n => n.id !== notificationId),
          isDeleting: false
        }));
      }
      
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete notification',
        isDeleting: false
      }));
      return false;
    }
  };

  const deleteMultiple = async (notificationIds: EntityId[]): Promise<boolean> => {
    setState(prev => ({ ...prev, isDeleting: true, error: null }));
    
    try {
      await notificationService.deleteMultiple(notificationIds);
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => !notificationIds.includes(n.id)),
        unreadNotifications: prev.unreadNotifications.filter(n => !notificationIds.includes(n.id)),
        isDeleting: false
      }));
      
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete notifications',
        isDeleting: false
      }));
      return false;
    }
  };

  const setFilter = (filter: NotificationState['activeFilter']): void => {
    setState(prev => ({ ...prev, activeFilter: filter }));
  };

  const setSearchTerm = (term: string): void => {
    setState(prev => ({ ...prev, searchTerm: term }));
  };

  const updateFilteredNotifications = (): void => {
    setState(prev => {
      let filtered = [...prev.notifications];

      // Apply filter
      switch (prev.activeFilter) {
        case 'unread':
          filtered = filtered.filter(n => !n.isRead);
          break;
        case 'report_due':
        case 'visit_reminder':
        case 'placement_update':
        case 'budget_alert':
        case 'system':
          filtered = filtered.filter(n => n.type === prev.activeFilter);
          break;
        // 'all' shows all notifications
      }

      // Apply search
      if (prev.searchTerm) {
        const searchLower = prev.searchTerm.toLowerCase();
        filtered = filtered.filter(n => 
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower)
        );
      }

      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        ...prev,
        filteredNotifications: filtered
      };
    });
  };

  const createCustomReminder = async (
    title: string,
    message: string,
    scheduledFor: Date,
    priority: Notification['priority'] = 'medium'
  ): Promise<boolean> => {
    try {
      const userId = getCurrentUserId();
      await notificationService.createCustomReminder(userId, title, message, scheduledFor, priority);
      
      // Refresh notifications
      await loadNotifications();
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create reminder'
      }));
      return false;
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadNotifications();
  };

  const clearError = (): void => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Utility functions
  const getNotificationIcon = (type: Notification['type']): React.ComponentType => {
    const iconMap = {
      'report_due': require('lucide-react').FileText,
      'visit_reminder': require('lucide-react').Calendar,
      'placement_update': require('lucide-react').Heart,
      'budget_alert': require('lucide-react').DollarSign,
      'system': require('lucide-react').Bell
    };
    
    return iconMap[type] || iconMap.system;
  };

  const getPriorityColor = (priority: Notification['priority']): string => {
    const colorMap = {
      'low': 'bg-gray-100 text-gray-600',
      'medium': 'bg-blue-100 text-blue-600',
      'high': 'bg-yellow-100 text-yellow-600',
      'urgent': 'bg-red-100 text-red-600'
    };
    
    return colorMap[priority];
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Agora mesmo';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return new Date(date).toLocaleDateString('pt-BR');
    }
  };

  // Automated reminders management
  const startAutomatedReminders = (): void => {
    notificationService.startAutomatedReminders();
  };

  const stopAutomatedReminders = (): void => {
    notificationService.stopAutomatedReminders();
  };

  const contextValue: NotificationContextType = {
    ...state,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultiple,
    setFilter,
    setSearchTerm,
    createCustomReminder,
    refreshData,
    clearError,
    getNotificationIcon,
    getPriorityColor,
    formatTimeAgo
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;