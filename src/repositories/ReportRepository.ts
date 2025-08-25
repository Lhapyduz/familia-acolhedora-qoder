import { database } from '../lib/database.js';
import type { 
  ReportTemplate, 
  GeneratedReport, 
  ScheduledReport,
  ReportData,
  Statistics,
  EntityId 
} from '../types/index.js';

export class ReportRepository {
  // Report Templates
  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    const newTemplate: ReportTemplate = {
      id: crypto.randomUUID(),
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const templates = await database.getReportTemplates();
    templates.push(newTemplate);
    await database.saveReportTemplates(templates);

    return newTemplate;
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    return await database.getReportTemplates();
  }

  async getTemplateById(id: EntityId): Promise<ReportTemplate | null> {
    const templates = await database.getReportTemplates();
    return templates.find(t => t.id === id) || null;
  }

  async getTemplatesByType(type: ReportTemplate['type']): Promise<ReportTemplate[]> {
    const templates = await database.getReportTemplates();
    return templates.filter(t => t.type === type);
  }

  async updateTemplate(id: EntityId, updates: Partial<ReportTemplate>): Promise<ReportTemplate | null> {
    const templates = await database.getReportTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return null;

    templates[index] = {
      ...templates[index],
      ...updates,
      updatedAt: new Date()
    };

    await database.saveReportTemplates(templates);
    return templates[index];
  }

  async deleteTemplate(id: EntityId): Promise<boolean> {
    const templates = await database.getReportTemplates();
    const index = templates.findIndex(t => t.id === id);
    
    if (index === -1) return false;

    templates.splice(index, 1);
    await database.saveReportTemplates(templates);
    return true;
  }

  // Generated Reports
  async createGeneratedReport(report: Omit<GeneratedReport, 'id'>): Promise<GeneratedReport> {
    const newReport: GeneratedReport = {
      id: crypto.randomUUID(),
      ...report
    };

    const reports = await database.getGeneratedReports();
    reports.push(newReport);
    await database.saveGeneratedReports(reports);

    return newReport;
  }

  async getGeneratedReports(): Promise<GeneratedReport[]> {
    return await database.getGeneratedReports();
  }

  async getGeneratedReportById(id: EntityId): Promise<GeneratedReport | null> {
    const reports = await database.getGeneratedReports();
    return reports.find(r => r.id === id) || null;
  }

  async getGeneratedReportsByUser(userId: string): Promise<GeneratedReport[]> {
    const reports = await database.getGeneratedReports();
    return reports.filter(r => r.generatedBy === userId);
  }

  async getRecentReports(limit: number = 10): Promise<GeneratedReport[]> {
    const reports = await database.getGeneratedReports();
    return reports
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, limit);
  }

  async updateGeneratedReport(id: EntityId, updates: Partial<GeneratedReport>): Promise<GeneratedReport | null> {
    const reports = await database.getGeneratedReports();
    const index = reports.findIndex(r => r.id === id);
    
    if (index === -1) return null;

    reports[index] = {
      ...reports[index],
      ...updates
    };

    await database.saveGeneratedReports(reports);
    return reports[index];
  }

  async deleteGeneratedReport(id: EntityId): Promise<boolean> {
    const reports = await database.getGeneratedReports();
    const index = reports.findIndex(r => r.id === id);
    
    if (index === -1) return false;

    reports.splice(index, 1);
    await database.saveGeneratedReports(reports);
    return true;
  }

  // Scheduled Reports
  async createScheduledReport(scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt'>): Promise<ScheduledReport> {
    const newScheduledReport: ScheduledReport = {
      id: crypto.randomUUID(),
      ...scheduledReport,
      createdAt: new Date()
    };

    const scheduledReports = await database.getScheduledReports();
    scheduledReports.push(newScheduledReport);
    await database.saveScheduledReports(scheduledReports);

    return newScheduledReport;
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    return await database.getScheduledReports();
  }

  async getActiveScheduledReports(): Promise<ScheduledReport[]> {
    const scheduledReports = await database.getScheduledReports();
    return scheduledReports.filter(sr => sr.isActive);
  }

  async getScheduledReportById(id: EntityId): Promise<ScheduledReport | null> {
    const scheduledReports = await database.getScheduledReports();
    return scheduledReports.find(sr => sr.id === id) || null;
  }

  async updateScheduledReport(id: EntityId, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
    const scheduledReports = await database.getScheduledReports();
    const index = scheduledReports.findIndex(sr => sr.id === id);
    
    if (index === -1) return null;

    scheduledReports[index] = {
      ...scheduledReports[index],
      ...updates
    };

    await database.saveScheduledReports(scheduledReports);
    return scheduledReports[index];
  }

  async deleteScheduledReport(id: EntityId): Promise<boolean> {
    const scheduledReports = await database.getScheduledReports();
    const index = scheduledReports.findIndex(sr => sr.id === id);
    
    if (index === -1) return false;

    scheduledReports.splice(index, 1);
    await database.saveScheduledReports(scheduledReports);
    return true;
  }

  // Cleanup expired reports
  async cleanupExpiredReports(): Promise<number> {
    const reports = await database.getGeneratedReports();
    const now = new Date();
    const activeReports = reports.filter(r => 
      !r.expiresAt || new Date(r.expiresAt) > now
    );
    
    const expiredCount = reports.length - activeReports.length;
    
    if (expiredCount > 0) {
      await database.saveGeneratedReports(activeReports);
    }
    
    return expiredCount;
  }
}

export default ReportRepository;