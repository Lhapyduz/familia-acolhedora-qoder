import { reportService, notificationService } from './index.js';
import { reportRepository } from '../repositories/index.js';
import type { 
  ScheduledReport, 
  GeneratedReport, 
  EntityId,
  User
} from '../types/index.js';

interface ScheduleCalculation {
  nextRun: Date;
  shouldRun: boolean;
}

export class ReportSchedulerService {
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute

  /**
   * Start the automated report scheduler
   */
  startScheduler(): void {
    if (this.isRunning) {
      console.log('Report scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting automated report scheduler...');

    // Run immediately on start
    this.processScheduledReports();

    // Set up recurring check
    this.schedulerInterval = setInterval(() => {
      this.processScheduledReports();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop the automated report scheduler
   */
  stopScheduler(): void {
    if (!this.isRunning) {
      console.log('Report scheduler is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    console.log('Report scheduler stopped');
  }

  /**
   * Check if scheduler is currently running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Process all scheduled reports and generate those that are due
   */
  private async processScheduledReports(): Promise<void> {
    try {
      const activeScheduledReports = await reportRepository.getActiveScheduledReports();
      
      for (const scheduledReport of activeScheduledReports) {
        try {
          const schedule = this.calculateNextRun(scheduledReport);
          
          if (schedule.shouldRun) {
            await this.executeScheduledReport(scheduledReport);
          }
          
          // Update next generation time if needed
          if (schedule.nextRun > scheduledReport.nextGeneration) {
            await reportRepository.updateScheduledReport(scheduledReport.id, {
              nextGeneration: schedule.nextRun
            });
          }
        } catch (error) {
          console.error(`Error processing scheduled report ${scheduledReport.id}:`, error);
          await this.handleScheduledReportError(scheduledReport, error);
        }
      }
    } catch (error) {
      console.error('Error in report scheduler:', error);
    }
  }

  /**
   * Execute a specific scheduled report
   */
  private async executeScheduledReport(scheduledReport: ScheduledReport): Promise<void> {
    console.log(`Executing scheduled report: ${scheduledReport.name}`);

    try {
      // Generate the report
      const generatedReport = await reportService.generateReport(
        scheduledReport.templateId,
        this.prepareReportParameters(scheduledReport),
        'system-scheduler'
      );

      // Update the scheduled report with last generation time
      const nextGeneration = this.calculateNextGenerationDate(scheduledReport);
      await reportRepository.updateScheduledReport(scheduledReport.id, {
        lastGenerated: new Date(),
        nextGeneration
      });

      // Send notifications to recipients
      await this.notifyRecipients(scheduledReport, generatedReport);

      console.log(`Successfully generated scheduled report: ${generatedReport.id}`);
    } catch (error) {
      console.error(`Failed to generate scheduled report ${scheduledReport.id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate if a scheduled report should run now and when it should run next
   */
  private calculateNextRun(scheduledReport: ScheduledReport): ScheduleCalculation {
    const now = new Date();
    const nextGeneration = new Date(scheduledReport.nextGeneration);
    
    // Check if it's time to run (within 1 minute tolerance)
    const shouldRun = nextGeneration <= new Date(now.getTime() + 60000);
    
    let nextRun: Date;
    
    if (shouldRun) {
      nextRun = this.calculateNextGenerationDate(scheduledReport);
    } else {
      nextRun = nextGeneration;
    }

    return { nextRun, shouldRun };
  }

  /**
   * Calculate the next generation date based on schedule frequency
   */
  private calculateNextGenerationDate(scheduledReport: ScheduledReport): Date {
    const { schedule } = scheduledReport;
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);
    
    let nextDate = new Date();
    nextDate.setHours(hours, minutes, 0, 0);

    switch (schedule.frequency) {
      case 'daily':
        // If today's time has passed, schedule for tomorrow
        if (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
        break;

      case 'weekly':
        // Schedule for specific day of week
        const targetDay = schedule.dayOfWeek || 1; // Default to Monday
        const currentDay = nextDate.getDay();
        let daysUntilTarget = targetDay - currentDay;
        
        if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextDate <= now)) {
          daysUntilTarget += 7; // Next week
        }
        
        nextDate.setDate(nextDate.getDate() + daysUntilTarget);
        break;

      case 'monthly':
        // Schedule for specific day of month
        const targetDayOfMonth = schedule.dayOfMonth || 1;
        nextDate.setDate(targetDayOfMonth);
        
        // If this month's date has passed, go to next month
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(targetDayOfMonth);
        }
        break;

      case 'quarterly':
        // Schedule for first day of next quarter
        const currentMonth = nextDate.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const nextQuarterStart = (currentQuarter + 1) * 3;
        
        nextDate.setMonth(nextQuarterStart % 12);
        nextDate.setDate(1);
        
        // If we've gone to next year
        if (nextQuarterStart >= 12) {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }
        break;

      default:
        throw new Error(`Unsupported frequency: ${schedule.frequency}`);
    }

    return nextDate;
  }

  /**
   * Prepare report parameters with automatic date ranges for scheduled reports
   */
  private prepareReportParameters(scheduledReport: ScheduledReport): Record<string, any> {
    const parameters = { ...scheduledReport.parameters };
    const now = new Date();

    // Auto-generate date ranges based on frequency
    switch (scheduledReport.schedule.frequency) {
      case 'daily':
        // Yesterday's data
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        parameters.startDate = yesterday;
        parameters.endDate = yesterday;
        break;

      case 'weekly':
        // Last week's data
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1); // Yesterday
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekStart.getDate() - 6); // 7 days ago
        parameters.startDate = lastWeekStart;
        parameters.endDate = lastWeekEnd;
        break;

      case 'monthly':
        // Last month's data
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // First day of previous month
        parameters.startDate = lastMonthStart;
        parameters.endDate = lastMonthEnd;
        break;

      case 'quarterly':
        // Last quarter's data
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const lastQuarter = currentQuarter - 1;
        const year = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        
        const quarterStart = new Date(year, adjustedQuarter * 3, 1);
        const quarterEnd = new Date(year, (adjustedQuarter + 1) * 3, 0);
        parameters.startDate = quarterStart;
        parameters.endDate = quarterEnd;
        break;
    }

    return parameters;
  }

  /**
   * Send notifications to report recipients
   */
  private async notifyRecipients(scheduledReport: ScheduledReport, generatedReport: GeneratedReport): Promise<void> {
    const title = `Relatório Automatizado: ${scheduledReport.name}`;
    const message = `O relatório "${scheduledReport.name}" foi gerado automaticamente e está disponível para visualização.`;

    // In a real application, you would:
    // 1. Send emails to the recipients list
    // 2. Create in-app notifications for users
    // 3. Potentially upload to shared storage/cloud

    // For now, we'll create notifications for coordinators
    try {
      // This would be improved to match recipients to actual user IDs
      await notificationService.createCustomReminder(
        'system', // This would be improved
        title,
        message,
        new Date(),
        'medium'
      );
    } catch (error) {
      console.error('Failed to notify recipients:', error);
    }
  }

  /**
   * Handle errors in scheduled report execution
   */
  private async handleScheduledReportError(scheduledReport: ScheduledReport, error: any): Promise<void> {
    console.error(`Scheduled report ${scheduledReport.id} failed:`, error);

    // Create error notification
    const title = `Erro na Geração de Relatório: ${scheduledReport.name}`;
    const message = `Falha ao gerar o relatório automatizado "${scheduledReport.name}". Erro: ${error.message || 'Erro desconhecido'}`;

    try {
      await notificationService.createCustomReminder(
        'system',
        title,
        message,
        new Date(),
        'high'
      );
    } catch (notificationError) {
      console.error('Failed to create error notification:', notificationError);
    }

    // Update next generation time to retry later (add 1 hour)
    const retryTime = new Date();
    retryTime.setHours(retryTime.getHours() + 1);
    
    try {
      await reportRepository.updateScheduledReport(scheduledReport.id, {
        nextGeneration: retryTime
      });
    } catch (updateError) {
      console.error('Failed to update retry time:', updateError);
    }
  }

  /**
   * Manually trigger a scheduled report (for testing or immediate generation)
   */
  async triggerScheduledReport(scheduledReportId: EntityId): Promise<GeneratedReport> {
    const scheduledReport = await reportRepository.getScheduledReportById(scheduledReportId);
    
    if (!scheduledReport) {
      throw new Error('Scheduled report not found');
    }

    if (!scheduledReport.isActive) {
      throw new Error('Scheduled report is not active');
    }

    console.log(`Manually triggering scheduled report: ${scheduledReport.name}`);
    
    const generatedReport = await reportService.generateReport(
      scheduledReport.templateId,
      this.prepareReportParameters(scheduledReport),
      'manual-trigger'
    );

    // Update last generated time
    await reportRepository.updateScheduledReport(scheduledReportId, {
      lastGenerated: new Date()
    });

    await this.notifyRecipients(scheduledReport, generatedReport);

    return generatedReport;
  }

  /**
   * Get scheduler status and statistics
   */
  async getSchedulerStatus(): Promise<{
    isRunning: boolean;
    activeSchedules: number;
    nextScheduledRun: Date | null;
    lastProcessedAt: Date | null;
    todayGenerated: number;
    weekGenerated: number;
  }> {
    const activeScheduledReports = await reportRepository.getActiveScheduledReports();
    
    let nextScheduledRun: Date | null = null;
    if (activeScheduledReports.length > 0) {
      const nextRuns = activeScheduledReports.map(sr => new Date(sr.nextGeneration));
      nextScheduledRun = new Date(Math.min(...nextRuns.map(d => d.getTime())));
    }

    // Calculate today's and this week's generated reports
    const allReports = await reportService.getGeneratedReports();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const todayGenerated = allReports.filter(r => 
      new Date(r.generatedAt) >= todayStart
    ).length;

    const weekGenerated = allReports.filter(r => 
      new Date(r.generatedAt) >= weekStart
    ).length;

    return {
      isRunning: this.isRunning,
      activeSchedules: activeScheduledReports.length,
      nextScheduledRun,
      lastProcessedAt: new Date(), // Would be tracked in real implementation
      todayGenerated,
      weekGenerated
    };
  }

  /**
   * Create a new scheduled report with validation
   */
  async createScheduledReport(scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextGeneration'>): Promise<ScheduledReport> {
    // Validate the schedule
    this.validateSchedule(scheduledReport.schedule);

    // Calculate initial next generation time
    const mockScheduledReport = {
      ...scheduledReport,
      id: 'temp',
      createdAt: new Date(),
      nextGeneration: new Date()
    } as ScheduledReport;
    
    const nextGeneration = this.calculateNextGenerationDate(mockScheduledReport);

    const newScheduledReport = await reportRepository.createScheduledReport({
      ...scheduledReport,
      nextGeneration
    });

    return newScheduledReport;
  }

  /**
   * Validate schedule configuration
   */
  private validateSchedule(schedule: ScheduledReport['schedule']): void {
    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(schedule.time)) {
      throw new Error('Invalid time format. Use HH:mm format (e.g., 09:30)');
    }

    // Validate day of week for weekly reports
    if (schedule.frequency === 'weekly') {
      if (schedule.dayOfWeek === undefined || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
        throw new Error('Day of week must be between 0 (Sunday) and 6 (Saturday) for weekly reports');
      }
    }

    // Validate day of month for monthly reports
    if (schedule.frequency === 'monthly') {
      if (schedule.dayOfMonth === undefined || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
        throw new Error('Day of month must be between 1 and 31 for monthly reports');
      }
    }
  }

  /**
   * Update scheduled report and recalculate next generation time if needed
   */
  async updateScheduledReport(id: EntityId, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
    // If schedule is being updated, recalculate next generation time
    if (updates.schedule) {
      this.validateSchedule(updates.schedule);
      
      const existingReport = await reportRepository.getScheduledReportById(id);
      if (existingReport) {
        const mockUpdatedReport = { ...existingReport, ...updates } as ScheduledReport;
        updates.nextGeneration = this.calculateNextGenerationDate(mockUpdatedReport);
      }
    }

    return await reportRepository.updateScheduledReport(id, updates);
  }

  /**
   * Bulk cleanup of old generated reports
   */
  async performMaintenanceCleanup(): Promise<{
    expiredReportsRemoved: number;
    oldReportsArchived: number;
  }> {
    console.log('Starting report maintenance cleanup...');

    try {
      // Clean expired reports
      const expiredReportsRemoved = await reportRepository.cleanupExpiredReports();

      // Archive old reports (older than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const allReports = await reportService.getGeneratedReports();
      const oldReports = allReports.filter(r => new Date(r.generatedAt) < oneYearAgo);
      
      // In a real implementation, you would move these to archival storage
      // For now, we'll just count them
      const oldReportsArchived = oldReports.length;

      console.log(`Maintenance completed: ${expiredReportsRemoved} expired reports removed, ${oldReportsArchived} old reports identified for archival`);

      return {
        expiredReportsRemoved,
        oldReportsArchived
      };
    } catch (error) {
      console.error('Error during maintenance cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reportSchedulerService = new ReportSchedulerService();