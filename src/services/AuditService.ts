import { auditRepository } from '../repositories/index.js';
import type { 
  AuditLog,
  AuditAction,
  AuditResource,
  AuditDetails,
  AuditMetadata,
  AuditSearchCriteria,
  AuditSummary,
  LGPDComplianceReport,
  LGPDViolation,
  DataSubjectRequest,
  DataSubjectRequestType,
  AuditSensitivity,
  LGPDLegalBasis,
  EntityId
} from '../types/index.js';

interface AuditContext {
  userId: string;
  userEmail: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  source?: 'web' | 'api' | 'system' | 'import' | 'sync';
  component?: string;
  correlationId?: string;
}

interface CreateAuditLogRequest {
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  details: AuditDetails;
  metadata?: Partial<AuditMetadata>;
  legacyData?: any;
  newData?: any;
}

export class AuditService {
  private currentContext: AuditContext | null = null;
  private readonly RETENTION_PERIOD_DAYS = 2555; // 7 years as required by LGPD
  private readonly HIGH_SENSITIVITY_ACTIONS: AuditAction[] = ['delete', 'export', 'download'];
  private readonly PERSONAL_DATA_FIELDS = [
    'name', 'cpf', 'email', 'phone', 'birthDate', 'address', 
    'healthConditions', 'medications', 'familyBackground', 'income'
  ];

  /**
   * Set the current audit context for the session
   */
  setContext(context: AuditContext): void {
    this.currentContext = context;
  }

  /**
   * Clear the audit context (on logout)
   */
  clearContext(): void {
    this.currentContext = null;
  }

  /**
   * Log an audit event with LGPD compliance
   */
  async logEvent(request: CreateAuditLogRequest): Promise<AuditLog> {
    if (!this.currentContext) {
      throw new Error('Audit context not set. Call setContext() first.');
    }

    const auditLog: AuditLog = {
      id: this.generateId(),
      userId: this.currentContext.userId,
      userEmail: this.currentContext.userEmail,
      userName: this.currentContext.userName,
      action: request.action,
      resource: request.resource,
      resourceId: request.resourceId,
      details: {
        ...request.details,
        personalDataAccessed: this.identifyPersonalDataAccess(request.newData || request.legacyData),
        legalBasis: request.details.legalBasis || this.determineLegalBasis(request.action, request.resource)
      },
      metadata: {
        source: this.currentContext.source || 'web',
        component: this.currentContext.component,
        correlationId: this.currentContext.correlationId || this.generateId(),
        businessProcess: this.determineBusinessProcess(request.resource, request.action),
        complianceFlags: this.determineComplianceFlags(request),
        ...request.metadata
      },
      timestamp: new Date(),
      ipAddress: this.currentContext.ipAddress,
      userAgent: this.currentContext.userAgent,
      sessionId: this.currentContext.sessionId,
      legacyData: this.sanitizeData(request.legacyData),
      newData: this.sanitizeData(request.newData)
    };

    // Real-time compliance monitoring
    await this.performComplianceCheck(auditLog);

    // Store the audit log
    const createdLog = await auditRepository.create(auditLog);

    // Trigger alerts for high-sensitivity actions
    if (this.isHighSensitivityAction(auditLog)) {
      await this.triggerSecurityAlert(auditLog);
    }

    return createdLog;
  }

  /**
   * Log authentication events
   */
  async logAuthentication(action: 'login' | 'logout', userId: string, success: boolean, reason?: string): Promise<AuditLog> {
    const details: AuditDetails = {
      description: `User ${action} ${success ? 'successful' : 'failed'}`,
      reason: reason,
      sensitivity: action === 'login' ? 'medium' : 'low',
      legalBasis: 'legitimate_interests'
    };

    if (!success && reason) {
      details.sensitivity = 'high';
    }

    return this.logEvent({
      action: action,
      resource: 'authentication',
      resourceId: userId,
      details,
      metadata: {
        businessProcess: 'user_authentication'
      }
    });
  }

  /**
   * Log data access events (for LGPD compliance)
   */
  async logDataAccess(resource: AuditResource, resourceId: string, accessType: 'view' | 'search' | 'export', data?: any): Promise<AuditLog> {
    const personalDataFields = this.identifyPersonalDataAccess(data);
    const sensitivity: AuditSensitivity = personalDataFields.length > 0 ? 'high' : 'medium';

    const details: AuditDetails = {
      description: `Data ${accessType} on ${resource}`,
      sensitivity,
      personalDataAccessed: personalDataFields,
      legalBasis: 'child_protection'
    };

    return this.logEvent({
      action: accessType,
      resource,
      resourceId,
      details,
      newData: data
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(
    action: 'create' | 'update' | 'delete',
    resource: AuditResource,
    resourceId: string,
    oldData?: any,
    newData?: any,
    reason?: string
  ): Promise<AuditLog> {
    const changes = this.calculateFieldChanges(oldData, newData);
    const personalDataChanged = changes.filter(change => this.isPersonalDataField(change.field));
    const sensitivity: AuditSensitivity = personalDataChanged.length > 0 ? 'high' : 'medium';

    const details: AuditDetails = {
      description: `${action} operation on ${resource}`,
      changes,
      reason,
      sensitivity,
      personalDataAccessed: personalDataChanged.map(change => change.field),
      legalBasis: 'child_protection'
    };

    return this.logEvent({
      action,
      resource,
      resourceId,
      details,
      legacyData: oldData,
      newData: newData
    });
  }

  /**
   * Search audit logs with LGPD compliance
   */
  async searchLogs(criteria: AuditSearchCriteria): Promise<AuditLog[]> {
    // Log the search operation itself
    await this.logEvent({
      action: 'search',
      resource: 'audit',
      resourceId: 'audit-logs',
      details: {
        description: 'Audit log search performed',
        context: JSON.stringify(criteria),
        sensitivity: 'medium',
        legalBasis: 'legal_obligation'
      }
    });

    return auditRepository.search(criteria);
  }

  /**
   * Generate audit summary for compliance reporting
   */
  async generateAuditSummary(startDate: Date, endDate: Date): Promise<AuditSummary> {
    const logs = await auditRepository.getLogsByDateRange(startDate, endDate);
    
    const summary: AuditSummary = {
      totalEvents: logs.length,
      eventsByAction: this.groupByAction(logs),
      eventsByResource: this.groupByResource(logs),
      eventsBySensitivity: this.groupBySensitivity(logs),
      personalDataAccesses: logs.filter(log => 
        log.details.personalDataAccessed && log.details.personalDataAccessed.length > 0
      ).length,
      sensitiveDataAccesses: logs.filter(log => 
        log.details.sensitivity === 'high' || log.details.sensitivity === 'critical'
      ).length,
      complianceViolations: await this.countComplianceViolations(startDate, endDate),
      uniqueUsers: new Set(logs.map(log => log.userId)).size,
      dateRange: { start: startDate, end: endDate }
    };

    // Log the summary generation
    await this.logEvent({
      action: 'read',
      resource: 'report',
      resourceId: 'audit-summary',
      details: {
        description: 'Audit summary generated',
        sensitivity: 'medium',
        legalBasis: 'legal_obligation'
      }
    });

    return summary;
  }

  /**
   * Generate LGPD compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<LGPDComplianceReport> {
    const summary = await this.generateAuditSummary(startDate, endDate);
    const violations = await this.detectViolations(startDate, endDate);
    const dataSubjectRequests = await this.getDataSubjectRequestSummary(startDate, endDate);

    const report: LGPDComplianceReport = {
      id: this.generateId(),
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary,
      violations,
      dataSubjectRequests,
      recommendations: this.generateComplianceRecommendations(summary, violations),
      nextAuditDate: this.calculateNextAuditDate()
    };

    // Log the compliance report generation
    await this.logEvent({
      action: 'read',
      resource: 'report',
      resourceId: report.id,
      details: {
        description: 'LGPD compliance report generated',
        sensitivity: 'high',
        legalBasis: 'legal_obligation'
      }
    });

    return report;
  }

  /**
   * Create data subject request
   */
  async createDataSubjectRequest(
    subjectId: string,
    subjectType: 'child' | 'family',
    requestType: DataSubjectRequestType,
    requestedBy: string,
    reason?: string,
    details?: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: this.generateId(),
      subjectId,
      subjectType,
      requestType,
      status: 'submitted',
      requestedBy,
      requestedAt: new Date(),
      reason,
      details,
      auditTrail: []
    };

    // Log the data subject request creation
    const auditLog = await this.logEvent({
      action: 'create',
      resource: subjectType,
      resourceId: subjectId,
      details: {
        description: `Data subject request created: ${requestType}`,
        context: `Request by ${requestedBy}`,
        sensitivity: 'high',
        legalBasis: 'legal_obligation'
      },
      newData: request
    });

    request.auditTrail.push(auditLog);
    
    return auditRepository.createDataSubjectRequest(request);
  }

  /**
   * Process data subject request
   */
  async processDataSubjectRequest(
    requestId: string,
    status: 'approved' | 'rejected' | 'completed',
    processedBy: string,
    reason?: string
  ): Promise<DataSubjectRequest> {
    const request = await auditRepository.getDataSubjectRequest(requestId);
    if (!request) {
      throw new Error('Data subject request not found');
    }

    const updatedRequest = {
      ...request,
      status,
      processedBy,
      processedAt: new Date(),
      reason
    };

    // Log the processing
    const auditLog = await this.logEvent({
      action: 'update',
      resource: request.subjectType,
      resourceId: request.subjectId,
      details: {
        description: `Data subject request ${status}: ${request.requestType}`,
        reason,
        sensitivity: 'high',
        legalBasis: 'legal_obligation'
      },
      legacyData: request,
      newData: updatedRequest
    });

    updatedRequest.auditTrail.push(auditLog);

    return auditRepository.updateDataSubjectRequest(requestId, updatedRequest);
  }

  /**
   * Archive old audit logs (LGPD compliance)
   */
  async archiveOldLogs(): Promise<{ archived: number; deleted: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_PERIOD_DAYS);

    const oldLogs = await auditRepository.getLogsOlderThan(cutoffDate);
    
    // Archive logs older than retention period
    const archived = await auditRepository.archiveLogs(oldLogs.map(log => log.id));
    
    // Permanently delete logs older than legal requirement (10 years)
    const deleteCutoffDate = new Date();
    deleteCutoffDate.setFullYear(deleteCutoffDate.getFullYear() - 10);
    const deleted = await auditRepository.deleteLogsOlderThan(deleteCutoffDate);

    // Log the archival process
    await this.logEvent({
      action: 'archive',
      resource: 'audit',
      resourceId: 'audit-logs',
      details: {
        description: `Archived ${archived} logs, deleted ${deleted} logs`,
        sensitivity: 'medium',
        legalBasis: 'legal_obligation'
      }
    });

    return { archived, deleted };
  }

  // Private helper methods

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private identifyPersonalDataAccess(data: any): string[] {
    if (!data || typeof data !== 'object') return [];
    
    const personalFields: string[] = [];
    const checkObject = (obj: any, prefix = '') => {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (this.isPersonalDataField(key)) {
          personalFields.push(fullKey);
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          checkObject(obj[key], fullKey);
        }
      }
    };
    
    checkObject(data);
    return personalFields;
  }

  private isPersonalDataField(field: string): boolean {
    return this.PERSONAL_DATA_FIELDS.some(pf => 
      field.toLowerCase().includes(pf.toLowerCase())
    );
  }

  private determineLegalBasis(action: AuditAction, resource: AuditResource): LGPDLegalBasis {
    if (resource === 'child' || resource === 'family' || resource === 'placement') {
      return 'child_protection';
    }
    if (action === 'login' || action === 'logout') {
      return 'legitimate_interests';
    }
    return 'legal_obligation';
  }

  private determineBusinessProcess(resource: AuditResource, action: AuditAction): string {
    const processMap: Record<string, string> = {
      'family': 'family_management',
      'child': 'child_protection',
      'placement': 'placement_management',
      'visit': 'technical_visits',
      'document': 'document_management',
      'report': 'reporting',
      'budget': 'budget_management',
      'user': 'user_management'
    };
    
    return processMap[resource] || 'general_operation';
  }

  private determineComplianceFlags(request: CreateAuditLogRequest): string[] {
    const flags: string[] = ['data_minimization'];
    
    if (request.details.personalDataAccessed && request.details.personalDataAccessed.length > 0) {
      flags.push('purpose_limitation', 'integrity_confidentiality');
    }
    
    if (this.HIGH_SENSITIVITY_ACTIONS.includes(request.action)) {
      flags.push('data_subject_rights');
    }
    
    return flags;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Remove sensitive system information
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secretKey;
    
    return sanitized;
  }

  private calculateFieldChanges(oldData: any, newData: any): any[] {
    const changes: any[] = [];
    
    if (!oldData && newData) {
      // Creation - all fields are new
      for (const field in newData) {
        changes.push({
          field,
          oldValue: null,
          newValue: newData[field],
          fieldType: this.isPersonalDataField(field) ? 'personal' : 'administrative'
        });
      }
    } else if (oldData && newData) {
      // Update - compare fields
      const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      
      for (const field of allFields) {
        if (oldData[field] !== newData[field]) {
          changes.push({
            field,
            oldValue: oldData[field],
            newValue: newData[field],
            fieldType: this.isPersonalDataField(field) ? 'personal' : 'administrative'
          });
        }
      }
    }
    
    return changes;
  }

  private async performComplianceCheck(auditLog: AuditLog): Promise<void> {
    // Check for potential violations
    const violations = await this.checkForViolations(auditLog);
    
    if (violations.length > 0) {
      // Store violations for later reporting
      for (const violation of violations) {
        await auditRepository.createViolation(violation);
      }
    }
  }

  private async checkForViolations(auditLog: AuditLog): Promise<LGPDViolation[]> {
    const violations: LGPDViolation[] = [];
    
    // Check for excessive data access
    if (auditLog.details.personalDataAccessed && auditLog.details.personalDataAccessed.length > 10) {
      violations.push({
        id: this.generateId(),
        type: 'excessive_data_collection',
        severity: 'medium',
        description: 'Excessive personal data access detected',
        detectedAt: new Date(),
        status: 'open',
        auditLogIds: [auditLog.id]
      });
    }
    
    // Check for unauthorized access patterns
    const recentLogs = await auditRepository.getRecentLogsByUser(auditLog.userId, 24); // Last 24 hours
    const highSensitivityCount = recentLogs.filter(log => 
      log.details.sensitivity === 'high' || log.details.sensitivity === 'critical'
    ).length;
    
    if (highSensitivityCount > 20) {
      violations.push({
        id: this.generateId(),
        type: 'unauthorized_access',
        severity: 'high',
        description: 'Unusual pattern of high-sensitivity data access',
        detectedAt: new Date(),
        status: 'open',
        auditLogIds: [auditLog.id]
      });
    }
    
    return violations;
  }

  private isHighSensitivityAction(auditLog: AuditLog): boolean {
    return this.HIGH_SENSITIVITY_ACTIONS.includes(auditLog.action) ||
           auditLog.details.sensitivity === 'critical' ||
           (auditLog.details.personalDataAccessed && auditLog.details.personalDataAccessed.length > 5);
  }

  private async triggerSecurityAlert(auditLog: AuditLog): Promise<void> {
    // In a real implementation, this would send notifications to security team
    console.warn('High-sensitivity audit event detected:', {
      user: auditLog.userEmail,
      action: auditLog.action,
      resource: auditLog.resource,
      timestamp: auditLog.timestamp
    });
  }

  private groupByAction(logs: AuditLog[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const log of logs) {
      grouped[log.action] = (grouped[log.action] || 0) + 1;
    }
    return grouped;
  }

  private groupByResource(logs: AuditLog[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const log of logs) {
      grouped[log.resource] = (grouped[log.resource] || 0) + 1;
    }
    return grouped;
  }

  private groupBySensitivity(logs: AuditLog[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const log of logs) {
      const sensitivity = log.details.sensitivity;
      grouped[sensitivity] = (grouped[sensitivity] || 0) + 1;
    }
    return grouped;
  }

  private async countComplianceViolations(startDate: Date, endDate: Date): Promise<number> {
    const violations = await auditRepository.getViolationsByDateRange(startDate, endDate);
    return violations.length;
  }

  private async detectViolations(startDate: Date, endDate: Date): Promise<LGPDViolation[]> {
    return auditRepository.getViolationsByDateRange(startDate, endDate);
  }

  private async getDataSubjectRequestSummary(startDate: Date, endDate: Date): Promise<any> {
    const requests = await auditRepository.getDataSubjectRequestsByDateRange(startDate, endDate);
    
    return {
      total: requests.length,
      byType: this.groupRequestsByType(requests),
      byStatus: this.groupRequestsByStatus(requests),
      averageProcessingTime: this.calculateAverageProcessingTime(requests),
      pendingRequests: requests.filter(r => r.status === 'submitted' || r.status === 'under_review').length
    };
  }

  private groupRequestsByType(requests: DataSubjectRequest[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const request of requests) {
      grouped[request.requestType] = (grouped[request.requestType] || 0) + 1;
    }
    return grouped;
  }

  private groupRequestsByStatus(requests: DataSubjectRequest[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const request of requests) {
      grouped[request.status] = (grouped[request.status] || 0) + 1;
    }
    return grouped;
  }

  private calculateAverageProcessingTime(requests: DataSubjectRequest[]): number {
    const completedRequests = requests.filter(r => r.processedAt);
    if (completedRequests.length === 0) return 0;
    
    const totalTime = completedRequests.reduce((sum, request) => {
      const processingTime = request.processedAt!.getTime() - request.requestedAt.getTime();
      return sum + processingTime;
    }, 0);
    
    return Math.round(totalTime / completedRequests.length / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private generateComplianceRecommendations(summary: AuditSummary, violations: LGPDViolation[]): string[] {
    const recommendations: string[] = [];
    
    if (summary.sensitiveDataAccesses > summary.totalEvents * 0.3) {
      recommendations.push('Consider implementing additional access controls for sensitive data');
    }
    
    if (violations.length > 0) {
      recommendations.push('Review and address identified compliance violations');
    }
    
    if (summary.uniqueUsers < 5) {
      recommendations.push('Consider implementing role-based access reviews');
    }
    
    recommendations.push('Conduct regular LGPD compliance training for all users');
    recommendations.push('Review data retention policies quarterly');
    
    return recommendations;
  }

  private calculateNextAuditDate(): Date {
    const nextAudit = new Date();
    nextAudit.setMonth(nextAudit.getMonth() + 3); // Quarterly audits
    return nextAudit;
  }
}

// Export singleton instance
export const auditService = new AuditService();