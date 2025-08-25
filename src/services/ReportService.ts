import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  reportRepository,
  familyRepository,
  childRepository,
  placementRepository,
  budgetRepository
} from '../repositories/index.js';
import type {
  ReportTemplate,
  GeneratedReport,
  ScheduledReport,
  ReportData,
  ReportSectionData,
  ReportSummary,
  ChartData,
  TableData,
  ReportExportOptions,
  Statistics,
  Family,
  Child,
  Placement,
  Budget,
  EntityId
} from '../types/index.js';

export class ReportService {
  // Template Management
  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> {
    return await reportRepository.createTemplate(template);
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    return await reportRepository.getTemplates();
  }

  async getTemplateById(id: EntityId): Promise<ReportTemplate | null> {
    return await reportRepository.getTemplateById(id);
  }

  async getTemplatesByType(type: ReportTemplate['type']): Promise<ReportTemplate[]> {
    return await reportRepository.getTemplatesByType(type);
  }

  // Report Generation
  async generateReport(
    templateId: EntityId,
    parameters: Record<string, any>,
    generatedBy: string
  ): Promise<GeneratedReport> {
    const template = await reportRepository.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const reportData = await this.buildReportData(template, parameters);
    
    const report = await reportRepository.createGeneratedReport({
      templateId,
      name: `${template.name} - ${new Date().toLocaleDateString('pt-BR')}`,
      generatedBy,
      generatedAt: new Date(),
      parameters,
      data: reportData,
      status: 'completed'
    });

    return report;
  }

  async getGeneratedReports(): Promise<GeneratedReport[]> {
    return await reportRepository.getGeneratedReports();
  }

  async getRecentReports(limit: number = 10): Promise<GeneratedReport[]> {
    return await reportRepository.getRecentReports(limit);
  }

  // Data Collection and Processing
  private async buildReportData(template: ReportTemplate, parameters: Record<string, any>): Promise<ReportData> {
    const period = this.extractDatePeriod(parameters);
    const statistics = await this.calculateStatistics(period);
    
    const sections: ReportSectionData[] = [];
    const charts: ChartData[] = [];
    const tables: TableData[] = [];

    // Process each section from template
    for (const sectionTemplate of template.sections.sort((a, b) => a.order - b.order)) {
      const sectionData = await this.buildSectionData(sectionTemplate, parameters, statistics);
      sections.push(sectionData);

      // Collect charts and tables
      if (sectionTemplate.type === 'chart' && sectionData.content) {
        charts.push(sectionData.content);
      } else if (sectionTemplate.type === 'table' && sectionData.content) {
        tables.push(sectionData.content);
      }
    }

    const summary = await this.buildReportSummary(period);

    return {
      title: template.name,
      subtitle: period ? `Período: ${period.startDate.toLocaleDateString('pt-BR')} - ${period.endDate.toLocaleDateString('pt-BR')}` : undefined,
      generatedAt: new Date(),
      period,
      sections,
      summary,
      charts,
      tables
    };
  }

  private async buildSectionData(
    sectionTemplate: any,
    parameters: Record<string, any>,
    statistics: Statistics
  ): Promise<ReportSectionData> {
    let content: any = null;

    switch (sectionTemplate.type) {
      case 'statistics':
        content = await this.buildStatisticsSection(parameters);
        break;
      case 'chart':
        content = await this.buildChartSection(sectionTemplate.config, parameters);
        break;
      case 'table':
        content = await this.buildTableSection(sectionTemplate.config, parameters);
        break;
      case 'summary':
        content = await this.buildReportSummary(this.extractDatePeriod(parameters));
        break;
      case 'text':
        content = this.buildTextSection(sectionTemplate.config, statistics);
        break;
    }

    return {
      id: sectionTemplate.id,
      title: sectionTemplate.title,
      type: sectionTemplate.type,
      content,
      order: sectionTemplate.order
    };
  }

  private async buildStatisticsSection(parameters: Record<string, any>): Promise<any> {
    const families = await familyRepository.findAll();
    const children = await childRepository.findAll();
    const placements = await placementRepository.findAll();

    return {
      totalFamilies: families.length,
      availableFamilies: families.filter(f => f.status === 'available').length,
      totalChildren: children.length,
      childrenInPlacement: children.filter(c => c.currentStatus === 'in_placement').length,
      activePlacements: placements.filter(p => p.status === 'active').length
    };
  }

  private async buildChartSection(config: any, parameters: Record<string, any>): Promise<ChartData> {
    const period = this.extractDatePeriod(parameters);
    
    switch (config.chartType) {
      case 'placements_by_month':
        return await this.buildPlacementsByMonthChart(period);
      case 'families_by_status':
        return await this.buildFamiliesByStatusChart();
      case 'children_by_age':
        return await this.buildChildrenByAgeChart();
      case 'budget_utilization':
        return await this.buildBudgetUtilizationChart(period);
      default:
        throw new Error(`Unknown chart type: ${config.chartType}`);
    }
  }

  private async buildTableSection(config: any, parameters: Record<string, any>): Promise<TableData> {
    switch (config.tableType) {
      case 'active_placements':
        return await this.buildActivePlacementsTable();
      case 'family_list':
        return await this.buildFamilyListTable(parameters);
      case 'budget_summary':
        return await this.buildBudgetSummaryTable();
      default:
        throw new Error(`Unknown table type: ${config.tableType}`);
    }
  }

  private buildTextSection(config: any, statistics: Statistics): string {
    return config.template
      .replace('{{totalFamilies}}', statistics.totalFamilies)
      .replace('{{totalChildren}}', statistics.totalChildren)
      .replace('{{activePlacements}}', statistics.activePlacements)
      .replace('{{generatedDate}}', new Date().toLocaleDateString('pt-BR'));
  }

  // Chart Builders
  private async buildPlacementsByMonthChart(period?: { startDate: Date; endDate: Date }): Promise<ChartData> {
    const placements = await placementRepository.findAll();
    const monthlyData = new Map<string, number>();

    placements.forEach(placement => {
      const startDate = new Date(placement.startDate);
      if (period && (startDate < period.startDate || startDate > period.endDate)) {
        return;
      }

      const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
    });

    const labels = Array.from(monthlyData.keys()).sort();
    const data = labels.map(label => monthlyData.get(label) || 0);

    return {
      id: 'placements_by_month',
      title: 'Acolhimentos por Mês',
      type: 'line',
      data: {
        labels: labels.map(label => {
          const [year, month] = label.split('-');
          return `${month}/${year}`;
        }),
        datasets: [{
          label: 'Acolhimentos',
          data,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true
        }]
      }
    };
  }

  private async buildFamiliesByStatusChart(): Promise<ChartData> {
    const families = await familyRepository.findAll();
    const statusCounts = new Map<string, number>();

    families.forEach(family => {
      statusCounts.set(family.status, (statusCounts.get(family.status) || 0) + 1);
    });

    const statusLabels = {
      'available': 'Disponível',
      'unavailable': 'Indisponível',
      'under_evaluation': 'Em Avaliação',
      'active_placement': 'Com Acolhimento Ativo'
    };

    const labels = Array.from(statusCounts.keys()).map(status => statusLabels[status as keyof typeof statusLabels] || status);
    const data = Array.from(statusCounts.values());

    return {
      id: 'families_by_status',
      title: 'Famílias por Status',
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label: 'Famílias',
          data,
          backgroundColor: [
            '#10B981', // green
            '#F59E0B', // yellow
            '#3B82F6', // blue
            '#EF4444'  // red
          ]
        }]
      }
    };
  }

  private async buildChildrenByAgeChart(): Promise<ChartData> {
    const children = await childRepository.findAll();
    const ageGroups = {
      '0-2': 0,
      '3-5': 0,
      '6-9': 0,
      '10-12': 0,
      '13-15': 0,
      '16-18': 0
    };

    children.forEach(child => {
      const age = this.calculateAge(child.personalInfo.birthDate);
      
      if (age <= 2) ageGroups['0-2']++;
      else if (age <= 5) ageGroups['3-5']++;
      else if (age <= 9) ageGroups['6-9']++;
      else if (age <= 12) ageGroups['10-12']++;
      else if (age <= 15) ageGroups['13-15']++;
      else ageGroups['16-18']++;
    });

    return {
      id: 'children_by_age',
      title: 'Crianças por Faixa Etária',
      type: 'bar',
      data: {
        labels: Object.keys(ageGroups),
        datasets: [{
          label: 'Crianças',
          data: Object.values(ageGroups),
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          borderWidth: 1
        }]
      }
    };
  }

  private async buildBudgetUtilizationChart(period?: { startDate: Date; endDate: Date }): Promise<ChartData> {
    const budgets = await budgetRepository.findAll();
    const currentBudget = budgets.find(b => b.fiscalYear === new Date().getFullYear());

    if (!currentBudget) {
      throw new Error('Orçamento atual não encontrado');
    }

    const utilized = (currentBudget.allocatedAmount / currentBudget.totalAmount) * 100;
    const available = 100 - utilized;

    return {
      id: 'budget_utilization',
      title: 'Utilização do Orçamento',
      type: 'doughnut',
      data: {
        labels: ['Utilizado', 'Disponível'],
        datasets: [{
          label: 'Porcentagem',
          data: [utilized, available],
          backgroundColor: ['#EF4444', '#10B981']
        }]
      }
    };
  }

  // Table Builders
  private async buildActivePlacementsTable(): Promise<TableData> {
    const placements = await placementRepository.findActive();
    const families = await familyRepository.findAll();
    const children = await childRepository.findAll();

    const headers = ['Criança', 'Família', 'Data Início', 'Duração (dias)'];
    const rows: (string | number)[][] = [];

    placements.forEach(placement => {
      const child = children.find(c => c.id === placement.childId);
      const family = families.find(f => f.id === placement.familyId);
      
      if (child && family) {
        const duration = Math.ceil((new Date().getTime() - new Date(placement.startDate).getTime()) / (1000 * 60 * 60 * 24));
        
        rows.push([
          child.personalInfo.name,
          family.primaryContact.name,
          new Date(placement.startDate).toLocaleDateString('pt-BR'),
          duration
        ]);
      }
    });

    return {
      id: 'active_placements',
      title: 'Acolhimentos Ativos',
      headers,
      rows
    };
  }

  private async buildFamilyListTable(parameters: Record<string, any>): Promise<TableData> {
    const families = await familyRepository.findAll();
    const headers = ['Nome', 'Cidade', 'Status', 'Capacidade'];
    const rows: (string | number)[][] = [];

    families.forEach(family => {
      rows.push([
        family.primaryContact.name,
        family.address.city,
        this.getStatusLabel(family.status),
        family.preferences.maxChildren
      ]);
    });

    return {
      id: 'family_list',
      title: 'Lista de Famílias',
      headers,
      rows
    };
  }

  private async buildBudgetSummaryTable(): Promise<TableData> {
    const budgets = await budgetRepository.findAll();
    const headers = ['Ano Fiscal', 'Orçamento Total', 'Alocado', 'Disponível', 'Utilização (%)'];
    const rows: (string | number)[][] = [];

    budgets.forEach(budget => {
      const utilization = Math.round((budget.allocatedAmount / budget.totalAmount) * 100);
      
      rows.push([
        budget.fiscalYear.toString(),
        `R$ ${budget.totalAmount.toLocaleString('pt-BR')}`,
        `R$ ${budget.allocatedAmount.toLocaleString('pt-BR')}`,
        `R$ ${budget.availableAmount.toLocaleString('pt-BR')}`,
        `${utilization}%`
      ]);
    });

    return {
      id: 'budget_summary',
      title: 'Resumo Orçamentário',
      headers,
      rows
    };
  }

  // Report Summary
  private async buildReportSummary(period?: { startDate: Date; endDate: Date }): Promise<ReportSummary> {
    const families = await familyRepository.findAll();
    const children = await childRepository.findAll();
    const placements = await placementRepository.findAll();
    const budgets = await budgetRepository.findAll();

    let filteredPlacements = placements;
    if (period) {
      filteredPlacements = placements.filter(p => {
        const startDate = new Date(p.startDate);
        return startDate >= period.startDate && startDate <= period.endDate;
      });
    }

    const currentBudget = budgets.find(b => b.fiscalYear === new Date().getFullYear());
    const completedPlacements = filteredPlacements.filter(p => p.status === 'completed');
    const successRate = filteredPlacements.length > 0 
      ? Math.round((completedPlacements.length / filteredPlacements.length) * 100)
      : 0;

    return {
      totalFamilies: families.length,
      totalChildren: children.length,
      activePlacements: placements.filter(p => p.status === 'active').length,
      newPlacements: filteredPlacements.length,
      completedPlacements: completedPlacements.length,
      budgetAllocated: currentBudget?.allocatedAmount || 0,
      budgetSpent: currentBudget?.allocatedAmount || 0,
      successRate
    };
  }

  // PDF Export
  async exportToPDF(reportId: EntityId, options: ReportExportOptions = this.getDefaultExportOptions()): Promise<string> {
    const report = await reportRepository.getGeneratedReportById(reportId);
    if (!report) {
      throw new Error('Relatório não encontrado');
    }

    const pdf = new jsPDF({
      orientation: options.pageOrientation,
      unit: 'mm',
      format: 'a4'
    });

    await this.buildPDFContent(pdf, report, options);
    
    const pdfBlob = pdf.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    
    // In a real app, you would upload this to a file storage service
    // For now, we'll just return the blob URL
    return url;
  }

  private async buildPDFContent(pdf: jsPDF, report: GeneratedReport, options: ReportExportOptions): Promise<void> {
    let yPosition = 20;

    // Cover page
    if (options.includeCover) {
      pdf.setFontSize(24);
      pdf.text(report.data.title, 20, yPosition);
      yPosition += 15;

      if (report.data.subtitle) {
        pdf.setFontSize(14);
        pdf.text(report.data.subtitle, 20, yPosition);
        yPosition += 10;
      }

      pdf.setFontSize(12);
      pdf.text(`Gerado em: ${report.data.generatedAt.toLocaleDateString('pt-BR')}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`Por: ${report.generatedBy}`, 20, yPosition);
      
      pdf.addPage();
      yPosition = 20;
    }

    // Summary
    if (report.data.summary) {
      pdf.setFontSize(16);
      pdf.text('Resumo Executivo', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      const summary = report.data.summary;
      pdf.text(`Total de Famílias: ${summary.totalFamilies}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Total de Crianças: ${summary.totalChildren}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Acolhimentos Ativos: ${summary.activePlacements}`, 20, yPosition);
      yPosition += 7;
      pdf.text(`Taxa de Sucesso: ${summary.successRate}%`, 20, yPosition);
      yPosition += 15;
    }

    // Sections
    for (const section of report.data.sections) {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text(section.title, 20, yPosition);
      yPosition += 10;

      if (section.type === 'table' && options.includeTables && section.content) {
        yPosition = await this.addTableToPDF(pdf, section.content, yPosition);
      } else if (section.type === 'text' && section.content) {
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(section.content, 170);
        pdf.text(lines, 20, yPosition);
        yPosition += lines.length * 5;
      }

      yPosition += 10;
    }
  }

  private async addTableToPDF(pdf: jsPDF, table: TableData, yPosition: number): Promise<number> {
    pdf.setFontSize(10);

    // Headers
    let xPosition = 20;
    table.headers.forEach(header => {
      pdf.text(header, xPosition, yPosition);
      xPosition += 40; // Adjust column width as needed
    });
    yPosition += 7;

    // Rows
    table.rows.forEach(row => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      xPosition = 20;
      row.forEach(cell => {
        pdf.text(String(cell), xPosition, yPosition);
        xPosition += 40;
      });
      yPosition += 5;
    });

    return yPosition + 10;
  }

  // Utility Methods
  private extractDatePeriod(parameters: Record<string, any>): { startDate: Date; endDate: Date } | undefined {
    if (parameters.startDate && parameters.endDate) {
      return {
        startDate: new Date(parameters.startDate),
        endDate: new Date(parameters.endDate)
      };
    }
    return undefined;
  }

  private async calculateStatistics(period?: { startDate: Date; endDate: Date }): Promise<Statistics> {
    const families = await familyRepository.findAll();
    const children = await childRepository.findAll();
    const placements = await placementRepository.findAll();

    let filteredPlacements = placements;
    if (period) {
      filteredPlacements = placements.filter(p => {
        const startDate = new Date(p.startDate);
        return startDate >= period.startDate && startDate <= period.endDate;
      });
    }

    const activePlacements = placements.filter(p => p.status === 'active');
    const completedPlacements = filteredPlacements.filter(p => p.status === 'completed');
    
    const totalDuration = completedPlacements.reduce((sum, p) => {
      if (p.endDate) {
        const duration = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
        return sum + duration;
      }
      return sum;
    }, 0);

    const averagePlacementDuration = completedPlacements.length > 0
      ? Math.round(totalDuration / (completedPlacements.length * 1000 * 60 * 60 * 24))
      : 0;

    return {
      totalFamilies: families.length,
      availableFamilies: families.filter(f => f.status === 'available').length,
      totalChildren: children.length,
      childrenInPlacement: children.filter(c => c.currentStatus === 'in_placement').length,
      childrenAwaiting: children.filter(c => c.currentStatus === 'awaiting').length,
      activePlacements: activePlacements.length,
      completedPlacements: completedPlacements.length,
      averagePlacementDuration,
      budgetUtilization: 0, // To be calculated from budget data
      monthlyStats: [] // To be implemented
    };
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  private getStatusLabel(status: string): string {
    const labels = {
      'available': 'Disponível',
      'unavailable': 'Indisponível',
      'under_evaluation': 'Em Avaliação',
      'active_placement': 'Com Acolhimento Ativo'
    };
    return labels[status as keyof typeof labels] || status;
  }

  private getDefaultExportOptions(): ReportExportOptions {
    return {
      format: 'pdf',
      includeCover: true,
      includeCharts: true,
      includeTables: true,
      pageOrientation: 'portrait',
      fontSize: 'medium'
    };
  }

  // Scheduled Reports
  async createScheduledReport(scheduledReport: Omit<ScheduledReport, 'id' | 'createdAt'>): Promise<ScheduledReport> {
    return await reportRepository.createScheduledReport(scheduledReport);
  }

  async getScheduledReports(): Promise<ScheduledReport[]> {
    return await reportRepository.getScheduledReports();
  }

  async updateScheduledReport(id: EntityId, updates: Partial<ScheduledReport>): Promise<ScheduledReport | null> {
    return await reportRepository.updateScheduledReport(id, updates);
  }

  async deleteScheduledReport(id: EntityId): Promise<boolean> {
    return await reportRepository.deleteScheduledReport(id);
  }

  // Cleanup
  async cleanupExpiredReports(): Promise<number> {
    return await reportRepository.cleanupExpiredReports();
  }
}

export default ReportService;