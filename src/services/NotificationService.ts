import { 
  notificationRepository,
  placementRepository,
  familyRepository,
  childRepository
} from '../repositories/index.js';
import type {
  Notification,
  EntityId,
  Placement,
  Family,
  Child
} from '../types/index.js';

export class NotificationService {
  private reminderInterval: NodeJS.Timeout | null = null;

  // Core Notification Methods
  async createNotification(
    userId: EntityId,
    type: Notification['type'],
    title: string,
    message: string,
    priority: Notification['priority'] = 'medium',
    actionUrl?: string,
    scheduledFor?: Date
  ): Promise<Notification> {
    return await notificationRepository.createNotification(
      userId,
      type,
      title,
      message,
      priority,
      actionUrl
    );
  }

  async getNotificationsByUser(userId: EntityId): Promise<Notification[]> {
    return await notificationRepository.findByUser(userId);
  }

  async getUnreadNotifications(userId: EntityId): Promise<Notification[]> {
    return await notificationRepository.findUnread(userId);
  }

  async markAsRead(notificationId: EntityId): Promise<Notification> {
    return await notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: EntityId): Promise<void> {
    return await notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: EntityId): Promise<boolean> {
    try {
      return await notificationRepository.delete(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  // Automated Reminder System
  startAutomatedReminders(): void {
    // Check for reminders every hour
    this.reminderInterval = setInterval(() => {
      this.checkAndCreateReminders();
    }, 60 * 60 * 1000); // 1 hour

    // Run immediately on start
    this.checkAndCreateReminders();
  }

  stopAutomatedReminders(): void {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
      this.reminderInterval = null;
    }
  }

  private async checkAndCreateReminders(): Promise<void> {
    try {
      await Promise.all([
        this.checkReportDueReminders(),
        this.checkVisitReminders(),
        this.checkPlacementMilestones(),
        this.checkBudgetAlerts(),
        this.checkDocumentExpirations(),
        this.checkInactivityReminders()
      ]);
    } catch (error) {
      console.error('Error checking automated reminders:', error);
    }
  }

  // Report Due Reminders
  private async checkReportDueReminders(): Promise<void> {
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get all active placements that might need reports
    const activePlacements = await placementRepository.findActive();

    for (const placement of activePlacements) {
      const lastReportDate = this.getLastReportDate(placement);
      const nextReportDue = this.calculateNextReportDue(lastReportDate);

      if (nextReportDue && nextReportDue <= threeDaysFromNow) {
        await this.createReportDueReminder(placement, nextReportDue);
      }
    }
  }

  private async createReportDueReminder(placement: Placement, dueDate: Date): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (!child || !family) return;

    const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const title = daysUntilDue <= 1 
      ? 'Relatório vence hoje!' 
      : `Relatório vence em ${daysUntilDue} dias`;

    const message = `Relatório mensal do acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name} deve ser entregue até ${dueDate.toLocaleDateString('pt-BR')}.`;

    // Get all coordinators for notification
    const coordinators = await this.getCoordinators();
    
    for (const coordinator of coordinators) {
      // Check if notification already exists to avoid duplicates
      const existingNotifications = await this.getNotificationsByUser(coordinator.id);
      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'report_due' && 
        n.message.includes(child.personalInfo.name) &&
        n.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000) // Created in last 24 hours
      );

      if (!alreadyNotified) {
        await this.createNotification(
          coordinator.id,
          'report_due',
          title,
          message,
          daysUntilDue <= 1 ? 'urgent' : 'high',
          `/placements/${placement.id}/reports`
        );
      }
    }
  }

  // Visit Reminders
  private async checkVisitReminders(): Promise<void> {
    const activePlacements = await placementRepository.findActive();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const placement of activePlacements) {
      // Check for scheduled visits
      const upcomingVisits = placement.visits?.filter(visit => {
        const visitDate = new Date(visit.visitDate);
        return visitDate >= new Date() && visitDate <= tomorrow;
      }) || [];

      for (const visit of upcomingVisits) {
        await this.createVisitReminder(placement, visit);
      }

      // Check if placement needs a visit (no visit in last 30 days)
      const lastVisit = this.getLastVisitDate(placement);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (!lastVisit || lastVisit < thirtyDaysAgo) {
        await this.createVisitNeededReminder(placement);
      }
    }
  }

  private async createVisitReminder(placement: Placement, visit: any): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (!child || !family) return;

    const visitDate = new Date(visit.visitDate);
    const title = 'Visita técnica agendada para amanhã';
    const message = `Visita técnica agendada para ${visitDate.toLocaleDateString('pt-BR')} às ${visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} na família ${family.primaryContact.name} (${child.personalInfo.name}).`;

    const coordinators = await this.getCoordinators();
    
    for (const coordinator of coordinators) {
      await this.createNotification(
        coordinator.id,
        'visit_reminder',
        title,
        message,
        'high',
        `/placements/${placement.id}/visits`
      );
    }
  }

  private async createVisitNeededReminder(placement: Placement): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (!child || !family) return;

    const title = 'Visita técnica necessária';
    const message = `O acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name} não recebe visita técnica há mais de 30 dias. Agende uma visita.`;

    const coordinators = await this.getCoordinators();
    
    for (const coordinator of coordinators) {
      // Check if already notified in the last 7 days
      const existingNotifications = await this.getNotificationsByUser(coordinator.id);
      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'visit_reminder' && 
        n.message.includes(child.personalInfo.name) &&
        n.message.includes('não recebe visita técnica') &&
        n.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Created in last 7 days
      );

      if (!alreadyNotified) {
        await this.createNotification(
          coordinator.id,
          'visit_reminder',
          title,
          message,
          'medium',
          `/placements/${placement.id}/visits`
        );
      }
    }
  }

  // Placement Milestone Reminders
  private async checkPlacementMilestones(): Promise<void> {
    const activePlacements = await placementRepository.findActive();

    for (const placement of activePlacements) {
      const placementDuration = this.calculatePlacementDuration(placement.startDate);
      
      // Notify at 30, 90, 180, and 365 days
      const milestones = [30, 90, 180, 365];
      
      for (const milestone of milestones) {
        if (Math.abs(placementDuration - milestone) <= 1) { // Within 1 day of milestone
          await this.createMilestoneReminder(placement, milestone);
        }
      }
    }
  }

  private async createMilestoneReminder(placement: Placement, days: number): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (!child || !family) return;

    const title = `Marco de ${days} dias de acolhimento`;
    const message = `O acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name} completou ${days} dias. Considere uma avaliação do progresso.`;

    const coordinators = await this.getCoordinators();
    
    for (const coordinator of coordinators) {
      await this.createNotification(
        coordinator.id,
        'placement_update',
        title,
        message,
        'medium',
        `/placements/${placement.id}`
      );
    }
  }

  // Budget Alerts
  private async checkBudgetAlerts(): Promise<void> {
    try {
      // This would integrate with the budget service
      const budgetService = await import('./index.js').then(m => m.budgetService);
      const budgetSummary = await budgetService.getBudgetSummary();
      
      const utilizationPercentage = (budgetSummary.allocatedBudget / budgetSummary.totalBudget) * 100;
      
      // Alert at 80% and 95% utilization
      if (utilizationPercentage >= 95) {
        await this.createBudgetAlert('Orçamento quase esgotado', 
          `O orçamento está ${utilizationPercentage.toFixed(1)}% utilizado. Ação urgente necessária.`, 'urgent');
      } else if (utilizationPercentage >= 80) {
        await this.createBudgetAlert('Orçamento em alerta', 
          `O orçamento está ${utilizationPercentage.toFixed(1)}% utilizado. Monitore os gastos.`, 'high');
      }
    } catch (error) {
      console.error('Error checking budget alerts:', error);
    }
  }

  private async createBudgetAlert(title: string, message: string, priority: Notification['priority']): Promise<void> {
    const coordinators = await this.getCoordinators();
    
    for (const coordinator of coordinators) {
      // Check if already notified in the last 24 hours
      const existingNotifications = await this.getNotificationsByUser(coordinator.id);
      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'budget_alert' && 
        n.title === title &&
        n.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      if (!alreadyNotified) {
        await this.createNotification(
          coordinator.id,
          'budget_alert',
          title,
          message,
          priority,
          '/budget'
        );
      }
    }
  }

  // Document Expiration Reminders
  private async checkDocumentExpirations(): Promise<void> {
    const families = await familyRepository.findAll({ limit: 1000 });
    const children = await childRepository.findAll({ limit: 1000 });
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Check family documents
    for (const family of families.data) {
      for (const document of family.documents || []) {
        // Assuming documents have an expiration date field
        // This would need to be added to the document type
        // if (document.expirationDate && new Date(document.expirationDate) <= thirtyDaysFromNow) {
        //   await this.createDocumentExpirationReminder(family, document);
        // }
      }
    }
  }

  // Inactivity Reminders
  private async checkInactivityReminders(): Promise<void> {
    const families = await familyRepository.findAll({ limit: 1000 });
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const family of families.data) {
      if (family.status === 'under_evaluation' && family.updatedAt < sevenDaysAgo) {
        await this.createInactivityReminder(family);
      }
    }
  }

  private async createInactivityReminder(family: Family): Promise<void> {
    const title = 'Família pendente de avaliação';
    const message = `A família ${family.primaryContact.name} está há mais de 7 dias com status "Em Avaliação". Verifique se é necessária alguma ação.`;

    const coordinators = await this.getCoordinators();
    
    for (const coordinator of coordinators) {
      // Check if already notified in the last 7 days
      const existingNotifications = await this.getNotificationsByUser(coordinator.id);
      const alreadyNotified = existingNotifications.some(n => 
        n.type === 'system' && 
        n.message.includes(family.primaryContact.name) &&
        n.message.includes('pendente de avaliação') &&
        n.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

      if (!alreadyNotified) {
        await this.createNotification(
          coordinator.id,
          'system',
          title,
          message,
          'medium',
          `/families/${family.id}`
        );
      }
    }
  }

  // Utility Methods
  private async getCoordinators(): Promise<Array<{ id: string }>> {
    try {
      const userRepository = await import('../repositories/index.js').then(m => m.userRepository);
      const coordinators = await userRepository.findByRole('coordinator');
      return coordinators;
    } catch (error) {
      console.error('Error getting coordinators:', error);
      return [];
    }
  }

  private getLastReportDate(placement: Placement): Date | null {
    if (!placement.reports || placement.reports.length === 0) {
      return null;
    }
    
    const sortedReports = placement.reports.sort((a, b) => 
      new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
    );
    
    return new Date(sortedReports[0].reportDate);
  }

  private calculateNextReportDue(lastReportDate: Date | null): Date | null {
    if (!lastReportDate) {
      // If no reports yet, report is due 30 days after placement start
      return null; // Would need placement start date
    }
    
    const nextDue = new Date(lastReportDate);
    nextDue.setMonth(nextDue.getMonth() + 1); // Monthly reports
    return nextDue;
  }

  private getLastVisitDate(placement: Placement): Date | null {
    if (!placement.visits || placement.visits.length === 0) {
      return null;
    }
    
    const sortedVisits = placement.visits.sort((a, b) => 
      new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
    );
    
    return new Date(sortedVisits[0].visitDate);
  }

  private calculatePlacementDuration(startDate: Date): number {
    const today = new Date();
    const start = new Date(startDate);
    const diffTime = Math.abs(today.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Notification Statistics
  async getNotificationStats(userId: EntityId): Promise<{
    total: number;
    unread: number;
    byType: Record<Notification['type'], number>;
    byPriority: Record<Notification['priority'], number>;
  }> {
    const notifications = await this.getNotificationsByUser(userId);
    const unreadNotifications = await this.getUnreadNotifications(userId);

    const byType: Record<Notification['type'], number> = {
      'report_due': 0,
      'visit_reminder': 0,
      'placement_update': 0,
      'budget_alert': 0,
      'system': 0
    };

    const byPriority: Record<Notification['priority'], number> = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'urgent': 0
    };

    notifications.forEach(notification => {
      byType[notification.type]++;
      byPriority[notification.priority]++;
    });

    return {
      total: notifications.length,
      unread: unreadNotifications.length,
      byType,
      byPriority
    };
  }

  // Bulk Operations
  async markMultipleAsRead(notificationIds: EntityId[]): Promise<void> {
    await Promise.all(
      notificationIds.map(id => this.markAsRead(id))
    );
  }

  async deleteMultiple(notificationIds: EntityId[]): Promise<void> {
    await Promise.all(
      notificationIds.map(id => this.deleteNotification(id))
    );
  }

  // Custom Notification Creation
  async createCustomReminder(
    userId: EntityId,
    title: string,
    message: string,
    scheduledFor: Date,
    priority: Notification['priority'] = 'medium'
  ): Promise<Notification> {
    return await this.createNotification(
      userId,
      'system',
      title,
      message,
      priority,
      undefined,
      scheduledFor
    );
  }
}

export default NotificationService;