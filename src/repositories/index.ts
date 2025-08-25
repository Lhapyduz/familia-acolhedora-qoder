import { BaseRepository, NotFoundError, ValidationError } from './base-repository.js';
import ReportRepository from './ReportRepository.js';
import type {
  User,
  Family,
  Child,
  Placement,
  Budget,
  Notification,
  Document,
  Matching,
  TechnicalVisit,
  ReportTemplate,
  GeneratedReport,
  ScheduledReport,
  AuditLog,
  LGPDViolation,
  DataSubjectRequest,
  AuditSearchCriteria,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  CreateChildRequest,
  UpdateChildRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserStats,
  Permission,
  StatusHistory,
  StatusChangeRequest,
  ChildStatusStats,
  FamilyStatus,
  ChildStatus,
  PlacementStatus,
  EntityId,
  FamilyFilters,
  ChildFilters,
  Database
} from '../types/index.js';

// User Repository
export class UserRepository extends BaseRepository<User, CreateUserRequest, UpdateUserRequest> {
  protected tableName: keyof Database = 'users';

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findWhere({ email });
    return users[0] || null;
  }

  async findByRole(role: User['role']): Promise<User[]> {
    return this.findWhere({ role });
  }

  async findActive(): Promise<User[]> {
    return this.findWhere({ isActive: true });
  }

  async findInactive(): Promise<User[]> {
    return this.findWhere({ isActive: false });
  }

  async updateLastLogin(id: EntityId): Promise<User> {
    return this.update(id, { lastLogin: new Date() } as Partial<User>);
  }

  async toggleUserStatus(id: EntityId): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('user', id);
    }
    return this.update(id, { isActive: !user.isActive });
  }

  async updatePermissions(id: EntityId, permissions: Permission[]): Promise<User> {
    return this.update(id, { permissions });
  }

  async changeRole(id: EntityId, role: User['role']): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('user', id);
    }

    // Define default permissions based on role
    let defaultPermissions: Permission[];
    if (role === 'coordinator') {
      defaultPermissions = [
        'families:read', 'families:write', 'families:delete',
        'children:read', 'children:write', 'children:delete',
        'matching:read', 'matching:write',
        'budget:read', 'budget:write',
        'reports:read', 'reports:write',
        'settings:read', 'settings:write',
        'users:read', 'users:write', 'users:delete'
      ];
    } else {
      defaultPermissions = [
        'families:read', 'families:write',
        'children:read', 'children:write',
        'matching:read', 'matching:write',
        'reports:read', 'reports:write'
      ];
    }

    return this.update(id, { role, permissions: defaultPermissions });
  }

  async getUserStats(): Promise<UserStats> {
    const allUsers = await this.findAll();
    const activeUsers = allUsers.data.filter(user => user.isActive);
    const inactiveUsers = allUsers.data.filter(user => !user.isActive);
    const coordinators = allUsers.data.filter(user => user.role === 'coordinator');
    const technicians = allUsers.data.filter(user => user.role === 'technician');

    return {
      total: allUsers.data.length,
      active: activeUsers.length,
      inactive: inactiveUsers.length,
      coordinators: coordinators.length,
      technicians: technicians.length
    };
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    // In a real app, this would hash and compare passwords
    // For demo purposes, we'll use simple validation
    const user = await this.findByEmail(email);
    
    if (!user || !user.isActive) {
      return null;
    }

    // Simple password validation (in real app, use proper hashing)
    const isValidPassword = password === 'admin123' || password === 'tech123';
    
    if (!isValidPassword) {
      return null;
    }

    await this.updateLastLogin(user.id);
    return user;
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    // Check if email already exists
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ValidationError('user', 'Email already exists');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new ValidationError('user', 'Invalid email format');
    }

    // Validate permissions based on role
    const validPermissions = this.getValidPermissionsForRole(data.role);
    const invalidPermissions = data.permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      throw new ValidationError('user', `Invalid permissions for ${data.role}: ${invalidPermissions.join(', ')}`);
    }

    const newUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      ...data,
      lastLogin: new Date()
    };

    return this.create(newUser);
  }

  private getValidPermissionsForRole(role: User['role']): Permission[] {
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
  }
}

// Family Repository
export class FamilyRepository extends BaseRepository<Family, CreateFamilyRequest, UpdateFamilyRequest> {
  protected tableName: keyof Database = 'families';

  async findByStatus(status: FamilyStatus): Promise<Family[]> {
    return this.findWhere({ status });
  }

  async findAvailable(): Promise<Family[]> {
    return this.findByStatus('available');
  }

  async findByCity(city: string): Promise<Family[]> {
    return this.findWhere({ 'address.city': city });
  }

  async updateStatus(id: EntityId, status: FamilyStatus): Promise<Family> {
    return this.update(id, { status });
  }

  async searchFamilies(filters: FamilyFilters): Promise<Family[]> {
    const queryFilters: Record<string, any> = {};

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.city) {
      queryFilters['address.city'] = filters.city;
    }

    if (filters.state) {
      queryFilters['address.state'] = filters.state;
    }

    if (filters.hasSpecialNeedsCapacity !== undefined) {
      queryFilters['preferences.specialNeeds'] = filters.hasSpecialNeedsCapacity;
    }

    return this.findWhere(queryFilters);
  }

  async findCompatibleFamilies(child: Child): Promise<Family[]> {
    const availableFamilies = await this.findAvailable();
    
    return availableFamilies.filter(family => {
      // Age range compatibility
      const childAge = this.calculateAge(child.personalInfo.birthDate);
      const ageCompatible = childAge >= family.preferences.ageRange.min && 
                           childAge <= family.preferences.ageRange.max;

      // Gender preference
      const genderCompatible = family.preferences.gender === 'any' || 
                              family.preferences.gender === child.personalInfo.gender;

      // Special needs compatibility
      const specialNeedsCompatible = !child.specialNeeds.hasSpecialNeeds || 
                                    family.preferences.specialNeeds;

      return ageCompatible && genderCompatible && specialNeedsCompatible;
    });
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
}

// Child Repository
export class ChildRepository extends BaseRepository<Child, CreateChildRequest, UpdateChildRequest> {
  protected tableName: keyof Database = 'users';

  async findByStatus(status: ChildStatus): Promise<Child[]> {
    return this.findWhere({ currentStatus: status });
  }

  async findAwaiting(): Promise<Child[]> {
    return this.findByStatus('awaiting');
  }

  async findInPlacement(): Promise<Child[]> {
    return this.findByStatus('in_placement');
  }

  async findBySiblings(siblingIds: string[]): Promise<Child[]> {
    const children = await this.findWhere({});
    return children.filter(child => 
      child.familyBackground.siblings.some(siblingId => siblingIds.includes(siblingId))
    );
  }

  async findBySpecialNeeds(): Promise<Child[]> {
    return this.findWhere({ 'specialNeeds.hasSpecialNeeds': true });
  }

  async updateStatus(id: EntityId, status: ChildStatus, reason: string, changedBy: string): Promise<Child> {
    const child = await this.findById(id);
    if (!child) {
      throw new NotFoundError('child', id);
    }

    // Validate status transition
    const isValidTransition = this.validateStatusTransition(child.currentStatus, status);
    if (!isValidTransition) {
      throw new ValidationError('child', `Invalid status transition from ${child.currentStatus} to ${status}`);
    }

    // Record status history
    await this.recordStatusChange(id, child.currentStatus, status, reason, changedBy);

    // Update child status
    const updatedChild = await this.update(id, { 
      currentStatus: status,
      updatedAt: new Date()
    });

    return updatedChild;
  }

  async assignToFamily(childId: EntityId, familyId: EntityId): Promise<Child> {
    const currentPlacement = {
      familyId,
      startDate: new Date(),
      status: 'active' as PlacementStatus
    };

    return this.update(childId, { 
      currentStatus: 'in_placement',
      currentPlacement 
    });
  }

  async getStatusHistory(childId: EntityId): Promise<StatusHistory[]> {
    const db = await import('../lib/database.js');
    const statusHistory = db.database.getStatusHistory() || [];
    return statusHistory.filter(history => history.childId === childId)
      .sort((a, b) => new Date(b.changeDate).getTime() - new Date(a.changeDate).getTime());
  }

  async getStatusStats(): Promise<ChildStatusStats> {
    const allChildren = await this.findAll();
    const children = allChildren.data;
    
    const stats = {
      awaiting: children.filter(c => c.currentStatus === 'awaiting').length,
      in_placement: children.filter(c => c.currentStatus === 'in_placement').length,
      discharged: children.filter(c => c.currentStatus === 'discharged').length,
      returned_family: children.filter(c => c.currentStatus === 'returned_family').length,
      total: children.length
    };

    return stats;
  }

  async getPendingStatusChanges(): Promise<StatusChangeRequest[]> {
    const db = await import('../lib/database.js');
    return db.database.getPendingStatusChanges() || [];
  }

  async createStatusChangeRequest(request: Omit<StatusChangeRequest, 'id'>): Promise<StatusChangeRequest> {
    const db = await import('../lib/database.js');
    const newRequest: StatusChangeRequest = {
      ...request,
      childId: request.childId
    };
    
    const existingRequests = db.database.getPendingStatusChanges() || [];
    existingRequests.push(newRequest);
    db.database.setPendingStatusChanges(existingRequests);
    
    return newRequest;
  }

  async searchChildren(filters: ChildFilters): Promise<Child[]> {
    const queryFilters: Record<string, any> = {};

    if (filters.status) {
      queryFilters.currentStatus = filters.status;
    }

    if (filters.gender) {
      queryFilters['personalInfo.gender'] = filters.gender;
    }

    if (filters.hasSpecialNeeds !== undefined) {
      queryFilters['specialNeeds.hasSpecialNeeds'] = filters.hasSpecialNeeds;
    }

    if (filters.hasSiblings !== undefined) {
      const children = await this.findWhere({});
      return children.filter(child => {
        const hasSiblings = child.familyBackground.siblings.length > 0;
        return hasSiblings === filters.hasSiblings;
      });
    }

    return this.findWhere(queryFilters);
  }

  private validateStatusTransition(currentStatus: ChildStatus, newStatus: ChildStatus): boolean {
    const allowedTransitions: Record<ChildStatus, ChildStatus[]> = {
      'awaiting': ['in_placement', 'returned_family'],
      'in_placement': ['discharged', 'returned_family', 'awaiting'],
      'discharged': [], // Terminal status - no transitions allowed
      'returned_family': [] // Terminal status - no transitions allowed
    };

    return allowedTransitions[currentStatus].includes(newStatus);
  }

  private async recordStatusChange(
    childId: EntityId, 
    previousStatus: ChildStatus, 
    newStatus: ChildStatus, 
    reason: string, 
    changedBy: string
  ): Promise<void> {
    const db = await import('../lib/database.js');
    const statusHistory: StatusHistory = {
      id: db.database.generateId(),
      childId,
      previousStatus,
      newStatus,
      changeDate: new Date(),
      reason,
      changedBy
    };

    const existingHistory = db.database.getStatusHistory() || [];
    existingHistory.push(statusHistory);
    db.database.setStatusHistory(existingHistory);
  }
}

// Placement Repository
export class PlacementRepository extends BaseRepository<Placement, Omit<Placement, 'id' | 'createdAt' | 'updatedAt'>, Partial<Placement>> {
  protected tableName: keyof Database = 'placements';

  async findByChild(childId: EntityId): Promise<Placement[]> {
    return this.findWhere({ childId });
  }

  async findByFamily(familyId: EntityId): Promise<Placement[]> {
    return this.findWhere({ familyId });
  }

  async findActive(): Promise<Placement[]> {
    return this.findWhere({ status: 'active' });
  }

  async findByStatus(status: PlacementStatus): Promise<Placement[]> {
    return this.findWhere({ status });
  }

  async updateStatus(id: EntityId, status: PlacementStatus): Promise<Placement> {
    return this.update(id, { status });
  }

  async endPlacement(id: EntityId, endDate: Date = new Date()): Promise<Placement> {
    return this.update(id, { 
      endDate, 
      status: 'completed'
    });
  }

  async getCurrentPlacement(childId: EntityId): Promise<Placement | null> {
    const activePlacements = await this.findWhere({ 
      childId, 
      status: 'active' 
    });
    return activePlacements[0] || null;
  }
}

// Budget Repository
export class BudgetRepository extends BaseRepository<Budget, Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>, Partial<Budget>> {
  protected tableName: keyof Database = 'budget';

  async getCurrentBudget(): Promise<Budget | null> {
    const currentYear = new Date().getFullYear();
    const budgets = await this.findWhere({ fiscalYear: currentYear });
    return budgets[0] || null;
  }

  async createYearlyBudget(fiscalYear: number, totalAmount: number): Promise<Budget> {
    const existingBudget = await this.findWhere({ fiscalYear });
    
    if (existingBudget.length > 0) {
      throw new ValidationError('budget', `Budget for year ${fiscalYear} already exists`);
    }

    const budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> = {
      fiscalYear,
      totalAmount,
      allocatedAmount: 0,
      availableAmount: totalAmount,
      allocations: [],
      transactions: [],
      settings: {
        minimumWage: 1320,
        siblingMultiplier: 0.30,
        specialNeedsMultiplier: 0.50
      }
    };

    return this.create(budget);
  }

  async updateBudgetAllocation(id: EntityId, allocatedAmount: number): Promise<Budget> {
    const budget = await this.findById(id);
    if (!budget) {
      throw new NotFoundError('budget', id);
    }

    const availableAmount = budget.totalAmount - allocatedAmount;
    
    if (availableAmount < 0) {
      throw new ValidationError('budget', 'Insufficient budget available');
    }

    return this.update(id, {
      allocatedAmount,
      availableAmount
    });
  }
}

// Notification Repository
export class NotificationRepository extends BaseRepository<Notification, Omit<Notification, 'id' | 'createdAt'>, Partial<Notification>> {
  protected tableName: keyof Database = 'notifications';

  async findByUser(userId: EntityId): Promise<Notification[]> {
    return this.findWhere({ userId });
  }

  async findUnread(userId: EntityId): Promise<Notification[]> {
    return this.findWhere({ userId, isRead: false });
  }

  async markAsRead(id: EntityId): Promise<Notification> {
    return this.update(id, { isRead: true });
  }

  async markAllAsRead(userId: EntityId): Promise<void> {
    const unreadNotifications = await this.findUnread(userId);
    
    await Promise.all(
      unreadNotifications.map(notification => 
        this.markAsRead(notification.id)
      )
    );
  }

  async createNotification(
    userId: EntityId,
    type: Notification['type'],
    title: string,
    message: string,
    priority: Notification['priority'] = 'medium',
    actionUrl?: string
  ): Promise<Notification> {
    const notification: Omit<Notification, 'id' | 'createdAt'> = {
      userId,
      type,
      title,
      message,
      isRead: false,
      priority,
      actionUrl
    };

    return this.create(notification);
  }
}

// Document Repository
export class DocumentRepository extends BaseRepository<Document, Omit<Document, 'id'>, Partial<Document>> {
  protected tableName: keyof Database = 'documents';

  async findByEntity(entityType: string, entityId: EntityId): Promise<Document[]> {
    // For simplicity, we'll store entity info in the document name or use a custom field
    return this.findWhere({}); // In real implementation, add entity tracking
  }

  async findByType(type: string): Promise<Document[]> {
    return this.findWhere({ type });
  }

  async findByUploader(uploadedBy: EntityId): Promise<Document[]> {
    return this.findWhere({ uploadedBy });
  }
}

// Matching Repository
export class MatchingRepository extends BaseRepository<Matching, Omit<Matching, 'id' | 'createdAt' | 'updatedAt'>, Partial<Matching>> {
  protected tableName: keyof Database = 'matchings';

  async findByChild(childId: EntityId): Promise<Matching[]> {
    return this.findWhere({ childId });
  }

  async findByFamily(familyId: EntityId): Promise<Matching[]> {
    return this.findWhere({ familyId });
  }

  async findByStatus(status: Matching['status']): Promise<Matching[]> {
    return this.findWhere({ status });
  }

  async findProposed(): Promise<Matching[]> {
    return this.findByStatus('proposed');
  }

  async findApproved(): Promise<Matching[]> {
    return this.findByStatus('approved');
  }

  async findByUser(userId: EntityId): Promise<Matching[]> {
    return this.findWhere({ proposedBy: userId });
  }

  async updateStatus(id: EntityId, status: Matching['status'], approvedBy?: EntityId): Promise<Matching> {
    const updates: Partial<Matching> = { status };
    
    if (status === 'approved' && approvedBy) {
      updates.approvedBy = approvedBy;
      updates.approvedDate = new Date();
    }
    
    return this.update(id, updates);
  }
}

// Technical Visit Repository
export class TechnicalVisitRepository extends BaseRepository<TechnicalVisit, Omit<TechnicalVisit, 'id'>, Partial<TechnicalVisit>> {
  protected tableName: keyof Database = 'technicalVisits';

  async findByPlacement(placementId: EntityId): Promise<TechnicalVisit[]> {
    return this.findWhere({ placementId });
  }

  async findByTechnician(technicianId: EntityId): Promise<TechnicalVisit[]> {
    return this.findWhere({ technicianId });
  }

  async findByTechnicianInRange(technicianId: EntityId, startDate: Date, endDate: Date): Promise<TechnicalVisit[]> {
    const visits = await this.findByTechnician(technicianId);
    return visits.filter(visit => {
      const visitDate = new Date(visit.visitDate);
      return visitDate >= startDate && visitDate <= endDate;
    });
  }

  async findInDateRange(startDate: Date, endDate: Date): Promise<TechnicalVisit[]> {
    const allVisits = await this.findWhere({});
    return allVisits.filter(visit => {
      const visitDate = new Date(visit.visitDate);
      return visitDate >= startDate && visitDate <= endDate;
    });
  }

  async findOverdue(): Promise<TechnicalVisit[]> {
    const now = new Date();
    const allVisits = await this.findWhere({});
    return allVisits.filter(visit => {
      const visitDate = new Date(visit.visitDate);
      return visitDate < now && !visit.observations; // No observations means not completed
    });
  }

  async getLastVisitForPlacement(placementId: EntityId): Promise<TechnicalVisit | null> {
    const visits = await this.findByPlacement(placementId);
    if (visits.length === 0) return null;
    
    return visits.reduce((latest, current) => {
      return new Date(current.visitDate) > new Date(latest.visitDate) ? current : latest;
    });
  }

  async list(options: { limit?: number; page?: number; filters?: Record<string, any> } = {}): Promise<TechnicalVisit[]> {
    const { limit = 50, page = 1, filters = {} } = options;
    const offset = (page - 1) * limit;
    
    let visits = await this.findWhere(filters);
    
    // Sort by visit date (most recent first)
    visits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
    
    // Apply pagination
    return visits.slice(offset, offset + limit);
  }

  // Specialized query methods for visit scheduling
  async findConflictingVisits(technicianId: EntityId, visitDate: Date, excludeId?: EntityId): Promise<TechnicalVisit[]> {
    const dayStart = new Date(visitDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(visitDate);
    dayEnd.setHours(23, 59, 59, 999);

    const visits = await this.findByTechnicianInRange(technicianId, dayStart, dayEnd);
    
    return excludeId ? visits.filter(v => v.id !== excludeId) : visits;
  }

  async getVisitFrequencyByPlacement(placementId: EntityId): Promise<number> {
    const visits = await this.findByPlacement(placementId);
    
    if (visits.length < 2) return 0;
    
    // Sort visits by date
    visits.sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());
    
    // Calculate average days between visits
    let totalDays = 0;
    for (let i = 1; i < visits.length; i++) {
      const prevDate = new Date(visits[i - 1].visitDate);
      const currentDate = new Date(visits[i].visitDate);
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalDays += diffDays;
    }
    
    return Math.round(totalDays / (visits.length - 1));
  }

  async getTechnicianWorkload(technicianId: EntityId, dateRange?: { start: Date; end: Date }): Promise<{
    totalVisits: number;
    completedVisits: number;
    upcomingVisits: number;
    averageVisitsPerWeek: number;
  }> {
    let visits: TechnicalVisit[];
    
    if (dateRange) {
      visits = await this.findByTechnicianInRange(technicianId, dateRange.start, dateRange.end);
    } else {
      visits = await this.findByTechnician(technicianId);
    }
    
    const now = new Date();
    const completedVisits = visits.filter(v => new Date(v.visitDate) < now && v.observations).length;
    const upcomingVisits = visits.filter(v => new Date(v.visitDate) >= now).length;
    
    // Calculate average visits per week
    let averageVisitsPerWeek = 0;
    if (dateRange) {
      const timeDiff = dateRange.end.getTime() - dateRange.start.getTime();
      const weeksDiff = timeDiff / (1000 * 60 * 60 * 24 * 7);
      averageVisitsPerWeek = weeksDiff > 0 ? Math.round(visits.length / weeksDiff) : 0;
    }
    
    return {
      totalVisits: visits.length,
      completedVisits,
      upcomingVisits,
      averageVisitsPerWeek
    };
  }
}

// Audit Repository for LGPD Compliance
export class AuditRepository extends BaseRepository<AuditLog, AuditLog, Partial<AuditLog>> {
  protected tableName: keyof Database = 'auditLogs';
  private violationsKey = 'lgpd_violations';
  private dataSubjectRequestsKey = 'data_subject_requests';

  async search(criteria: AuditSearchCriteria): Promise<AuditLog[]> {
    const allLogs = await this.findWhere({});
    
    return allLogs.filter(log => {
      // User filter
      if (criteria.userId && log.userId !== criteria.userId) {
        return false;
      }
      
      // Actions filter
      if (criteria.actions && !criteria.actions.includes(log.action)) {
        return false;
      }
      
      // Resources filter
      if (criteria.resources && !criteria.resources.includes(log.resource)) {
        return false;
      }
      
      // Resource ID filter
      if (criteria.resourceId && log.resourceId !== criteria.resourceId) {
        return false;
      }
      
      // Date range filter
      if (criteria.dateRange) {
        const logDate = new Date(log.timestamp);
        if (logDate < criteria.dateRange.start || logDate > criteria.dateRange.end) {
          return false;
        }
      }
      
      // Sensitivity filter
      if (criteria.sensitivity && !criteria.sensitivity.includes(log.details.sensitivity)) {
        return false;
      }
      
      // Legal basis filter
      if (criteria.legalBasis && log.details.legalBasis && 
          !criteria.legalBasis.includes(log.details.legalBasis)) {
        return false;
      }
      
      // Personal data accessed filter
      if (criteria.personalDataAccessed && criteria.personalDataAccessed.length > 0) {
        const logPersonalData = log.details.personalDataAccessed || [];
        const hasMatchingPersonalData = criteria.personalDataAccessed.some(field => 
          logPersonalData.some(logField => logField.includes(field))
        );
        if (!hasMatchingPersonalData) {
          return false;
        }
      }
      
      // Search term filter (searches in description, user email, and metadata)
      if (criteria.searchTerm) {
        const searchLower = criteria.searchTerm.toLowerCase();
        const searchableText = [
          log.details.description,
          log.userEmail,
          log.userName,
          JSON.stringify(log.metadata)
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }
      
      // IP Address filter
      if (criteria.ipAddress && log.ipAddress !== criteria.ipAddress) {
        return false;
      }
      
      // Session ID filter
      if (criteria.sessionId && log.sessionId !== criteria.sessionId) {
        return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getLogsByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    const allLogs = await this.findWhere({});
    
    return allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getLogsByUser(userId: string): Promise<AuditLog[]> {
    return this.findWhere({ userId });
  }

  async getRecentLogsByUser(userId: string, hours: number): Promise<AuditLog[]> {
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hours);
    
    const userLogs = await this.getLogsByUser(userId);
    return userLogs.filter(log => new Date(log.timestamp) >= sinceDate);
  }

  async getLogsByResource(resource: string, resourceId: string): Promise<AuditLog[]> {
    return this.findWhere({ resource, resourceId });
  }

  async getLogsOlderThan(date: Date): Promise<AuditLog[]> {
    const allLogs = await this.findWhere({});
    return allLogs.filter(log => new Date(log.timestamp) < date);
  }

  async archiveLogs(logIds: string[]): Promise<number> {
    // In a real implementation, this would move logs to archival storage
    // For this demo, we'll mark them as archived in metadata
    let archived = 0;
    
    for (const logId of logIds) {
      try {
        const log = await this.findById(logId);
        if (log) {
          await this.update(logId, {
            metadata: {
              ...log.metadata,
              archived: true,
              archivedAt: new Date()
            }
          });
          archived++;
        }
      } catch (error) {
        console.error(`Failed to archive log ${logId}:`, error);
      }
    }
    
    return archived;
  }

  async deleteLogsOlderThan(date: Date): Promise<number> {
    const oldLogs = await this.getLogsOlderThan(date);
    let deleted = 0;
    
    for (const log of oldLogs) {
      try {
        await this.delete(log.id);
        deleted++;
      } catch (error) {
        console.error(`Failed to delete log ${log.id}:`, error);
      }
    }
    
    return deleted;
  }

  // LGPD Violations Management
  async createViolation(violation: LGPDViolation): Promise<LGPDViolation> {
    const violations = await this.getViolations();
    violations.push(violation);
    this.setStorageItem(this.violationsKey, JSON.stringify(violations));
    return violation;
  }

  async getViolations(): Promise<LGPDViolation[]> {
    try {
      const stored = this.getStorageItem(this.violationsKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async getViolationsByDateRange(startDate: Date, endDate: Date): Promise<LGPDViolation[]> {
    const violations = await this.getViolations();
    return violations.filter(violation => {
      const detectedDate = new Date(violation.detectedAt);
      return detectedDate >= startDate && detectedDate <= endDate;
    });
  }

  async updateViolation(violationId: string, updates: Partial<LGPDViolation>): Promise<LGPDViolation | null> {
    const violations = await this.getViolations();
    const index = violations.findIndex(v => v.id === violationId);
    
    if (index === -1) return null;
    
    violations[index] = { ...violations[index], ...updates };
    this.setStorageItem(this.violationsKey, JSON.stringify(violations));
    return violations[index];
  }

  // Data Subject Requests Management
  async createDataSubjectRequest(request: DataSubjectRequest): Promise<DataSubjectRequest> {
    const requests = await this.getDataSubjectRequests();
    requests.push(request);
    this.setStorageItem(this.dataSubjectRequestsKey, JSON.stringify(requests));
    return request;
  }

  async getDataSubjectRequests(): Promise<DataSubjectRequest[]> {
    try {
      const stored = this.getStorageItem(this.dataSubjectRequestsKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  async getDataSubjectRequest(requestId: string): Promise<DataSubjectRequest | null> {
    const requests = await this.getDataSubjectRequests();
    return requests.find(r => r.id === requestId) || null;
  }

  async updateDataSubjectRequest(requestId: string, updates: Partial<DataSubjectRequest>): Promise<DataSubjectRequest | null> {
    const requests = await this.getDataSubjectRequests();
    const index = requests.findIndex(r => r.id === requestId);
    
    if (index === -1) return null;
    
    requests[index] = { ...requests[index], ...updates };
    this.setStorageItem(this.dataSubjectRequestsKey, JSON.stringify(requests));
    return requests[index];
  }

  async getDataSubjectRequestsByDateRange(startDate: Date, endDate: Date): Promise<DataSubjectRequest[]> {
    const requests = await this.getDataSubjectRequests();
    return requests.filter(request => {
      const requestDate = new Date(request.requestedAt);
      return requestDate >= startDate && requestDate <= endDate;
    });
  }

  async getDataSubjectRequestsBySubject(subjectId: string, subjectType: 'child' | 'family'): Promise<DataSubjectRequest[]> {
    const requests = await this.getDataSubjectRequests();
    return requests.filter(request => 
      request.subjectId === subjectId && request.subjectType === subjectType
    );
  }

  // Helper methods for storage access
  private getStorageItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
    }
  }
}

// Repository factory
export class RepositoryFactory {
  private static userRepository: UserRepository;
  private static familyRepository: FamilyRepository;
  private static childRepository: ChildRepository;
  private static placementRepository: PlacementRepository;
  private static budgetRepository: BudgetRepository;
  private static notificationRepository: NotificationRepository;
  private static documentRepository: DocumentRepository;
  private static matchingRepository: MatchingRepository;
  private static reportRepository: ReportRepository;
  private static technicalVisitRepository: TechnicalVisitRepository;
  private static auditRepository: AuditRepository;

  static getUserRepository(): UserRepository {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }
    return this.userRepository;
  }

  static getFamilyRepository(): FamilyRepository {
    if (!this.familyRepository) {
      this.familyRepository = new FamilyRepository();
    }
    return this.familyRepository;
  }

  static getChildRepository(): ChildRepository {
    if (!this.childRepository) {
      this.childRepository = new ChildRepository();
    }
    return this.childRepository;
  }

  static getPlacementRepository(): PlacementRepository {
    if (!this.placementRepository) {
      this.placementRepository = new PlacementRepository();
    }
    return this.placementRepository;
  }

  static getBudgetRepository(): BudgetRepository {
    if (!this.budgetRepository) {
      this.budgetRepository = new BudgetRepository();
    }
    return this.budgetRepository;
  }

  static getNotificationRepository(): NotificationRepository {
    if (!this.notificationRepository) {
      this.notificationRepository = new NotificationRepository();
    }
    return this.notificationRepository;
  }

  static getDocumentRepository(): DocumentRepository {
    if (!this.documentRepository) {
      this.documentRepository = new DocumentRepository();
    }
    return this.documentRepository;
  }

  static getMatchingRepository(): MatchingRepository {
    if (!this.matchingRepository) {
      this.matchingRepository = new MatchingRepository();
    }
    return this.matchingRepository;
  }

  static getReportRepository(): ReportRepository {
    if (!this.reportRepository) {
      this.reportRepository = new ReportRepository();
    }
    return this.reportRepository;
  }

  static getTechnicalVisitRepository(): TechnicalVisitRepository {
    if (!this.technicalVisitRepository) {
      this.technicalVisitRepository = new TechnicalVisitRepository();
    }
    return this.technicalVisitRepository;
  }

  static getAuditRepository(): AuditRepository {
    if (!this.auditRepository) {
      this.auditRepository = new AuditRepository();
    }
    return this.auditRepository;
  }
}

// Export repository instances
export const userRepository = RepositoryFactory.getUserRepository();
export const familyRepository = RepositoryFactory.getFamilyRepository();
export const childRepository = RepositoryFactory.getChildRepository();
export const placementRepository = RepositoryFactory.getPlacementRepository();
export const budgetRepository = RepositoryFactory.getBudgetRepository();
export const notificationRepository = RepositoryFactory.getNotificationRepository();
export const documentRepository = RepositoryFactory.getDocumentRepository();
export const matchingRepository = RepositoryFactory.getMatchingRepository();
export const reportRepository = RepositoryFactory.getReportRepository();
export const technicalVisitRepository = RepositoryFactory.getTechnicalVisitRepository();
export const auditRepository = RepositoryFactory.getAuditRepository();