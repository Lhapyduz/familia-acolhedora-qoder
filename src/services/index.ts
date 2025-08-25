import {
  userRepository,
  familyRepository,
  childRepository,
  placementRepository,
  budgetRepository,
  notificationRepository,
  documentRepository,
  matchingRepository,
  reportRepository,
  technicalVisitRepository,
  auditRepository
} from '../repositories/index.js';
import ReportService from './ReportService.js';
import NotificationService from './NotificationService.js';

import type {
  User,
  Family,
  Child,
  Placement,
  Budget,
  Notification,
  Document,
  Matching,
  LoginCredentials,
  AuthResponse,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  CreateChildRequest,
  UpdateChildRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserStats,
  PermissionGroup,
  FamilyStatus,
  ChildStatus,
  PlacementStatus,
  EntityId,
  PaginatedResponse,
  QueryOptions,
  FamilyFilters,
  ChildFilters,
  BudgetSummary,
  Statistics,
  CompatibilityScore,
  CompatibilityFactors,
  Permission
} from '../types/index.js';

// Service base class with common error handling
export abstract class BaseService {
  protected async handleServiceCall<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(`${errorMessage}:`, error);
      throw new ServiceError(errorMessage, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Custom service error class
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly originalError?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

// Authentication Service
export class AuthService extends BaseService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    return this.handleServiceCall(async () => {
      const user = await userRepository.validateCredentials(
        credentials.email,
        credentials.password
      );

      if (!user) {
        throw new ServiceError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      if (user.role !== credentials.role) {
        throw new ServiceError('Invalid role for this user', 'INVALID_ROLE');
      }

      // Generate mock token (in real app, use proper JWT)
      const token = `token_${user.id}_${Date.now()}`;
      const refreshToken = `refresh_${user.id}_${Date.now()}`;

      // Store session
      const { hybridDatabaseService } = await import('./index.js');
      hybridDatabaseService.setCurrentUser(user);
      hybridDatabaseService.setAuthToken(token);

      return {
        user,
        token,
        refreshToken
      };
    }, 'Authentication failed');
  }

  async logout(): Promise<void> {
    return this.handleServiceCall(async () => {
      const { hybridDatabaseService } = await import('./index.js');
      hybridDatabaseService.clearUserSession();
    }, 'Logout failed');
  }

  async getCurrentUser(): Promise<User | null> {
    return this.handleServiceCall(async () => {
      const { hybridDatabaseService } = await import('./index.js');
      return hybridDatabaseService.getCurrentUserLocal();
    }, 'Failed to get current user');
  }

  async refreshToken(): Promise<string> {
    return this.handleServiceCall(async () => {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new ServiceError('No active session', 'NO_SESSION');
      }

      const newToken = `token_${currentUser.id}_${Date.now()}`;
      const { hybridDatabaseService } = await import('./index.js');
      hybridDatabaseService.setAuthToken(newToken);

      return newToken;
    }, 'Token refresh failed');
  }

  async hasPermission(permission: Permission): Promise<boolean> {
    return this.handleServiceCall(async () => {
      const currentUser = await this.getCurrentUser();
      return currentUser?.permissions.includes(permission) || false;
    }, 'Permission check failed');
  }
}

// Family Service
export class FamilyService extends BaseService {
  async list(options: QueryOptions = {}): Promise<PaginatedResponse<Family>> {
    return this.handleServiceCall(async () => {
      return familyRepository.findAll(options);
    }, 'Failed to retrieve families');
  }

  async getById(id: EntityId): Promise<Family | null> {
    return this.handleServiceCall(async () => {
      return familyRepository.findById(id);
    }, `Failed to retrieve family with id ${id}`);
  }

  async create(familyData: CreateFamilyRequest): Promise<Family> {
    return this.handleServiceCall(async () => {
      // Validate family data
      this.validateFamilyData(familyData);
      
      const family = await familyRepository.create(familyData);
      
      // Create notification for coordinators
      await this.notifyCoordinators(
        'New family registered',
        `Family ${familyData.primaryContact.name} has been registered`,
        'system'
      );
      
      return family;
    }, 'Failed to create family');
  }

  async update(id: EntityId, updates: UpdateFamilyRequest): Promise<Family> {
    return this.handleServiceCall(async () => {
      const existingFamily = await familyRepository.findById(id);
      if (!existingFamily) {
        throw new ServiceError(`Family with id ${id} not found`, 'FAMILY_NOT_FOUND');
      }

      return familyRepository.update(id, updates);
    }, `Failed to update family with id ${id}`);
  }

  async delete(id: EntityId): Promise<boolean> {
    return this.handleServiceCall(async () => {
      // Check if family has active placements
      const activePlacements = await placementRepository.findByFamily(id);
      const hasActivePlacements = activePlacements.some(p => p.status === 'active');
      
      if (hasActivePlacements) {
        throw new ServiceError(
          'Cannot delete family with active placements',
          'FAMILY_HAS_ACTIVE_PLACEMENTS'
        );
      }

      return familyRepository.delete(id);
    }, `Failed to delete family with id ${id}`);
  }

  async updateStatus(id: EntityId, status: FamilyStatus): Promise<Family> {
    return this.handleServiceCall(async () => {
      return familyRepository.updateStatus(id, status);
    }, `Failed to update family status for id ${id}`);
  }

  async search(filters: FamilyFilters): Promise<Family[]> {
    return this.handleServiceCall(async () => {
      return familyRepository.searchFamilies(filters);
    }, 'Failed to search families');
  }

  async getCompatibleFamilies(childId: EntityId): Promise<Family[]> {
    return this.handleServiceCall(async () => {
      const child = await childRepository.findById(childId);
      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      return familyRepository.findCompatibleFamilies(child);
    }, `Failed to find compatible families for child ${childId}`);
  }

  private validateFamilyData(data: CreateFamilyRequest): void {
    if (!data.primaryContact.name || !data.primaryContact.email) {
      throw new ServiceError('Primary contact name and email are required', 'INVALID_DATA');
    }

    if (!data.address.street || !data.address.city) {
      throw new ServiceError('Address street and city are required', 'INVALID_DATA');
    }

    if (data.preferences.ageRange.min > data.preferences.ageRange.max) {
      throw new ServiceError('Invalid age range', 'INVALID_AGE_RANGE');
    }
  }

  private async notifyCoordinators(title: string, message: string, type: Notification['type']): Promise<void> {
    const coordinators = await userRepository.findByRole('coordinator');
    
    await Promise.all(
      coordinators.map(coordinator =>
        notificationRepository.createNotification(
          coordinator.id,
          type,
          title,
          message,
          'medium'
        )
      )
    );
  }
}

// Children Service
export class ChildrenService extends BaseService {
  async list(options: QueryOptions = {}): Promise<PaginatedResponse<Child>> {
    return this.handleServiceCall(async () => {
      return childRepository.findAll(options);
    }, 'Failed to retrieve children');
  }

  async getById(id: EntityId): Promise<Child | null> {
    return this.handleServiceCall(async () => {
      return childRepository.findById(id);
    }, `Failed to retrieve child with id ${id}`);
  }

  async create(childData: CreateChildRequest): Promise<Child> {
    return this.handleServiceCall(async () => {
      this.validateChildData(childData);
      
      const child = await childRepository.create(childData);
      
      // Create notification for coordinators
      await this.notifyCoordinators(
        'New child registered',
        `Child ${childData.personalInfo.name} has been registered`,
        'system'
      );
      
      return child;
    }, 'Failed to create child');
  }

  async update(id: EntityId, updates: UpdateChildRequest): Promise<Child> {
    return this.handleServiceCall(async () => {
      const existingChild = await childRepository.findById(id);
      if (!existingChild) {
        throw new ServiceError(`Child with id ${id} not found`, 'CHILD_NOT_FOUND');
      }

      return childRepository.update(id, updates);
    }, `Failed to update child with id ${id}`);
  }

  async delete(id: EntityId): Promise<boolean> {
    return this.handleServiceCall(async () => {
      // Check if child has active placement
      const currentPlacement = await placementRepository.getCurrentPlacement(id);
      
      if (currentPlacement && currentPlacement.status === 'active') {
        throw new ServiceError(
          'Cannot delete child with active placement',
          'CHILD_HAS_ACTIVE_PLACEMENT'
        );
      }

      return childRepository.delete(id);
    }, `Failed to delete child with id ${id}`);
  }

  async updateStatus(id: EntityId, status: ChildStatus): Promise<Child> {
    return this.handleServiceCall(async () => {
      return childRepository.updateStatus(id, status);
    }, `Failed to update child status for id ${id}`);
  }

  async search(filters: ChildFilters): Promise<Child[]> {
    return this.handleServiceCall(async () => {
      return childRepository.searchChildren(filters);
    }, 'Failed to search children');
  }

  async assignToFamily(childId: EntityId, familyId: EntityId): Promise<Placement> {
    return this.handleServiceCall(async () => {
      // Validate child and family exist
      const child = await childRepository.findById(childId);
      const family = await familyRepository.findById(familyId);

      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      if (!family) {
        throw new ServiceError(`Family with id ${familyId} not found`, 'FAMILY_NOT_FOUND');
      }

      // Check if child is available
      if (child.currentStatus !== 'awaiting') {
        throw new ServiceError('Child is not available for placement', 'CHILD_NOT_AVAILABLE');
      }

      // Check if family is available
      if (family.status !== 'available') {
        throw new ServiceError('Family is not available for placement', 'FAMILY_NOT_AVAILABLE');
      }

      // Create placement
      const placement: Omit<Placement, 'id' | 'createdAt' | 'updatedAt'> = {
        childId,
        familyId,
        startDate: new Date(),
        status: 'active',
        approximationProcess: {
          stages: [
            {
              id: '1',
              name: 'Initial Contact',
              description: 'First meeting between child and family',
              completed: false
            },
            {
              id: '2',
              name: 'Orientation Visit',
              description: 'Child visits family home',
              completed: false
            },
            {
              id: '3',
              name: 'Trial Period',
              description: 'Short-term stay to assess compatibility',
              completed: false
            },
            {
              id: '4',
              name: 'Full Placement',
              description: 'Child moves in permanently',
              completed: false
            }
          ],
          currentStage: '1',
          startDate: new Date(),
          expectedDuration: 90 // days
        },
        reports: [],
        visits: [],
        budget: {
          monthlyAllocation: await this.calculatePlacementCost(child),
          totalCost: 0,
          paymentHistory: []
        }
      };

      const newPlacement = await placementRepository.create(placement);

      // Update child and family status
      await childRepository.assignToFamily(childId, familyId);
      await familyRepository.updateStatus(familyId, 'active_placement');

      // Update budget
      await this.updateBudgetForPlacement(newPlacement);

      return newPlacement;
    }, `Failed to assign child ${childId} to family ${familyId}`);
  }

  async uploadDocument(childId: EntityId, uploadRequest: any): Promise<any> {
    return this.handleServiceCall(async () => {
      const child = await childRepository.findById(childId);
      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      // Create document entry
      const document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        childId,
        name: uploadRequest.file.name,
        type: uploadRequest.file.type,
        url: `documents/${childId}/${uploadRequest.file.name}`, // Simulated URL
        uploadDate: new Date(),
        uploadedBy: 'current_user', // TODO: Get from auth context
        size: uploadRequest.file.size,
        mimeType: uploadRequest.file.type,
        category: uploadRequest.category,
        isRequired: uploadRequest.isRequired,
        expirationDate: uploadRequest.expirationDate,
        status: 'pending' as const,
        description: uploadRequest.description,
        tags: uploadRequest.tags,
        accessLevel: uploadRequest.accessLevel
      };

      // Add document to child's documents array
      const updatedDocuments = [...(child.documents || []), document];
      await childRepository.update(childId, { documents: updatedDocuments });

      return document;
    }, `Failed to upload document for child ${childId}`);
  }

  async deleteDocument(childId: EntityId, documentId: string): Promise<void> {
    return this.handleServiceCall(async () => {
      const child = await childRepository.findById(childId);
      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      // Remove document from child's documents array
      const updatedDocuments = (child.documents || []).filter(doc => doc.id !== documentId);
      await childRepository.update(childId, { documents: updatedDocuments });
    }, `Failed to delete document ${documentId} for child ${childId}`);
  }

  async updateDocument(childId: EntityId, documentId: string, updates: any): Promise<any> {
    return this.handleServiceCall(async () => {
      const child = await childRepository.findById(childId);
      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      // Find and update document in child's documents array
      const documentIndex = (child.documents || []).findIndex(doc => doc.id === documentId);
      if (documentIndex === -1) {
        throw new ServiceError(`Document with id ${documentId} not found`, 'DOCUMENT_NOT_FOUND');
      }

      const updatedDocuments = [...(child.documents || [])];
      updatedDocuments[documentIndex] = { ...updatedDocuments[documentIndex], ...updates };
      
      await childRepository.update(childId, { documents: updatedDocuments });
      return updatedDocuments[documentIndex];
    }, `Failed to update document ${documentId} for child ${childId}`);
  }

  private async calculatePlacementCost(child: Child): Promise<number> {
    const budgetService = new BudgetService();
    return budgetService.calculateChildCost(child);
  }

  private async updateBudgetForPlacement(placement: Placement): Promise<void> {
    const budgetService = new BudgetService();
    await budgetService.allocateBudgetForPlacement(placement);
  }

  private validateChildData(data: CreateChildRequest): void {
    if (!data.personalInfo.name || !data.personalInfo.birthDate) {
      throw new ServiceError('Child name and birth date are required', 'INVALID_DATA');
    }

    if (!data.legalStatus.courtOrder) {
      throw new ServiceError('Court order is required', 'INVALID_DATA');
    }
  }

  private async notifyCoordinators(title: string, message: string, type: Notification['type']): Promise<void> {
    const coordinators = await userRepository.findByRole('coordinator');
    
    await Promise.all(
      coordinators.map(coordinator =>
        notificationRepository.createNotification(
          coordinator.id,
          type,
          title,
          message,
          'medium'
        )
      )
    );
  }
}

// Budget Service
export class BudgetService extends BaseService {
  async getBudgetSummary(): Promise<BudgetSummary> {
    return this.handleServiceCall(async () => {
      const currentBudget = await budgetRepository.getCurrentBudget();
      const activePlacements = await placementRepository.findActive();

      if (!currentBudget) {
        // Create current year budget if it doesn't exist
        const currentYear = new Date().getFullYear();
        await budgetRepository.createYearlyBudget(currentYear, 1000000); // Default 1M
        return this.getBudgetSummary(); // Recursive call after creation
      }

      return {
        totalBudget: currentBudget.totalAmount,
        allocatedBudget: currentBudget.allocatedAmount,
        availableBudget: currentBudget.availableAmount,
        activePlacements: activePlacements.length,
        monthlyAllocations: currentBudget.allocations
      };
    }, 'Failed to get budget summary');
  }

  async updateTotalBudget(amount: number): Promise<Budget> {
    return this.handleServiceCall(async () => {
      const currentBudget = await budgetRepository.getCurrentBudget();
      
      if (!currentBudget) {
        const currentYear = new Date().getFullYear();
        return budgetRepository.createYearlyBudget(currentYear, amount);
      }

      const availableAmount = amount - currentBudget.allocatedAmount;
      
      if (availableAmount < 0) {
        throw new ServiceError(
          'New budget amount is less than currently allocated amount',
          'INSUFFICIENT_BUDGET'
        );
      }

      return budgetRepository.update(currentBudget.id, {
        totalAmount: amount,
        availableAmount
      });
    }, 'Failed to update total budget');
  }

  async calculateChildCost(child: Child, siblings: Child[] = []): Promise<number> {
    return this.handleServiceCall(async () => {
      const settings = await this.getBudgetSettings();
      let baseCost = settings.minimumWage;

      // Special needs calculation (50% additional)
      if (child.specialNeeds.hasSpecialNeeds) {
        baseCost += settings.minimumWage * settings.specialNeedsMultiplier;
      }

      // Sibling calculation (30% per additional sibling)
      if (siblings.length > 0) {
        const siblingCost = settings.minimumWage * settings.siblingMultiplier * siblings.length;
        baseCost += siblingCost;
      }

      return baseCost;
    }, 'Failed to calculate child cost');
  }

  async allocateBudgetForPlacement(placement: Placement): Promise<void> {
    return this.handleServiceCall(async () => {
      const currentBudget = await budgetRepository.getCurrentBudget();
      
      if (!currentBudget) {
        throw new ServiceError('No budget found for current year', 'NO_BUDGET');
      }

      const newAllocatedAmount = currentBudget.allocatedAmount + placement.budget.monthlyAllocation;
      
      if (newAllocatedAmount > currentBudget.totalAmount) {
        throw new ServiceError('Insufficient budget for placement', 'INSUFFICIENT_BUDGET');
      }

      await budgetRepository.updateBudgetAllocation(currentBudget.id, newAllocatedAmount);
    }, 'Failed to allocate budget for placement');
  }

  private async getBudgetSettings() {
    const currentBudget = await budgetRepository.getCurrentBudget();
    return currentBudget?.settings || {
      minimumWage: 1320,
      siblingMultiplier: 0.30,
      specialNeedsMultiplier: 0.50
    };
  }
}

// Statistics Service
export class StatisticsService extends BaseService {
  async getOverallStatistics(): Promise<Statistics> {
    return this.handleServiceCall(async () => {
      const families = await familyRepository.findAll({ limit: 1000 });
      const children = await childRepository.findAll({ limit: 1000 });
      const placements = await placementRepository.findAll({ limit: 1000 });

      const availableFamilies = families.data.filter(f => f.status === 'available').length;
      const childrenInPlacement = children.data.filter(c => c.currentStatus === 'in_placement').length;
      const childrenAwaiting = children.data.filter(c => c.currentStatus === 'awaiting').length;
      const activePlacements = placements.data.filter(p => p.status === 'active').length;
      const completedPlacements = placements.data.filter(p => p.status === 'completed').length;

      // Calculate average placement duration
      const completedPlacementsWithDuration = placements.data
        .filter(p => p.status === 'completed' && p.endDate)
        .map(p => {
          const start = new Date(p.startDate).getTime();
          const end = new Date(p.endDate!).getTime();
          return (end - start) / (1000 * 60 * 60 * 24); // days
        });

      const averagePlacementDuration = completedPlacementsWithDuration.length > 0
        ? completedPlacementsWithDuration.reduce((a, b) => a + b, 0) / completedPlacementsWithDuration.length
        : 0;

      // Calculate budget utilization
      const budgetSummary = await new BudgetService().getBudgetSummary();
      const budgetUtilization = budgetSummary.totalBudget > 0
        ? (budgetSummary.allocatedBudget / budgetSummary.totalBudget) * 100
        : 0;

      return {
        totalFamilies: families.total,
        availableFamilies,
        totalChildren: children.total,
        childrenInPlacement,
        childrenAwaiting,
        activePlacements,
        completedPlacements,
        averagePlacementDuration,
        budgetUtilization,
        monthlyStats: [] // TODO: Implement monthly stats calculation
      };
    }, 'Failed to get overall statistics');
  }
}

// Matching Service
export class MatchingService extends BaseService {
  async calculateCompatibilityScore(childId: EntityId, familyId: EntityId): Promise<CompatibilityScore> {
    return this.handleServiceCall(async () => {
      const child = await childRepository.findById(childId);
      const family = await familyRepository.findById(familyId);

      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      if (!family) {
        throw new ServiceError(`Family with id ${familyId} not found`, 'FAMILY_NOT_FOUND');
      }

      const factors = this.calculateCompatibilityFactors(child, family);
      const overallScore = this.calculateOverallScore(factors);
      const recommendation = this.getRecommendation(overallScore);
      const notes = this.generateCompatibilityNotes(child, family, factors);

      return {
        familyId,
        childId,
        overallScore,
        factors,
        recommendation,
        notes
      };
    }, `Failed to calculate compatibility score for child ${childId} and family ${familyId}`);
  }

  async findCompatibleFamilies(childId: EntityId, limit: number = 10): Promise<CompatibilityScore[]> {
    return this.handleServiceCall(async () => {
      const child = await childRepository.findById(childId);
      
      if (!child) {
        throw new ServiceError(`Child with id ${childId} not found`, 'CHILD_NOT_FOUND');
      }

      if (child.currentStatus !== 'awaiting') {
        throw new ServiceError('Child is not available for matching', 'CHILD_NOT_AVAILABLE');
      }

      const availableFamilies = await familyRepository.findAvailable();
      const compatibilityScores: CompatibilityScore[] = [];

      for (const family of availableFamilies) {
        try {
          const score = await this.calculateCompatibilityScore(childId, family.id);
          compatibilityScores.push(score);
        } catch (error) {
          console.warn(`Failed to calculate compatibility for family ${family.id}:`, error);
        }
      }

      // Sort by overall score (descending) and limit results
      return compatibilityScores
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, limit);
    }, `Failed to find compatible families for child ${childId}`);
  }

  async createMatching(
    childId: EntityId, 
    familyId: EntityId, 
    proposedBy: EntityId, 
    notes: string = ''
  ): Promise<Matching> {
    return this.handleServiceCall(async () => {
      const compatibilityScore = await this.calculateCompatibilityScore(childId, familyId);
      
      const matching: Omit<Matching, 'id' | 'createdAt' | 'updatedAt'> = {
        childId,
        familyId,
        compatibilityScore,
        status: 'proposed',
        proposedBy,
        proposedDate: new Date(),
        notes
      };

      const newMatching = await matchingRepository.create(matching);
      
      // Notify coordinators about new matching proposal
      await this.notifyMatchingProposal(newMatching);
      
      return newMatching;
    }, `Failed to create matching for child ${childId} and family ${familyId}`);
  }

  async approveMatching(matchingId: EntityId, approvedBy: EntityId): Promise<Matching> {
    return this.handleServiceCall(async () => {
      const matching = await matchingRepository.findById(matchingId);
      
      if (!matching) {
        throw new ServiceError(`Matching with id ${matchingId} not found`, 'MATCHING_NOT_FOUND');
      }

      if (matching.status !== 'proposed') {
        throw new ServiceError('Only proposed matchings can be approved', 'INVALID_STATUS');
      }

      const updatedMatching = await matchingRepository.updateStatus(matchingId, 'approved', approvedBy);
      
      // Notify about approval
      await this.notifyMatchingApproval(updatedMatching);
      
      return updatedMatching;
    }, `Failed to approve matching ${matchingId}`);
  }

  async rejectMatching(matchingId: EntityId, rejectedBy: EntityId, reason: string): Promise<Matching> {
    return this.handleServiceCall(async () => {
      const matching = await matchingRepository.findById(matchingId);
      
      if (!matching) {
        throw new ServiceError(`Matching with id ${matchingId} not found`, 'MATCHING_NOT_FOUND');
      }

      const updatedMatching = await matchingRepository.update(matchingId, {
        status: 'rejected',
        notes: `${matching.notes}\n\nRejected: ${reason}`
      });
      
      return updatedMatching;
    }, `Failed to reject matching ${matchingId}`);
  }

  async getMatchingsByChild(childId: EntityId): Promise<Matching[]> {
    return this.handleServiceCall(async () => {
      return matchingRepository.findByChild(childId);
    }, `Failed to get matchings for child ${childId}`);
  }

  async getMatchingsByFamily(familyId: EntityId): Promise<Matching[]> {
    return this.handleServiceCall(async () => {
      return matchingRepository.findByFamily(familyId);
    }, `Failed to get matchings for family ${familyId}`);
  }

  async getProposedMatchings(): Promise<Matching[]> {
    return this.handleServiceCall(async () => {
      return matchingRepository.findProposed();
    }, 'Failed to get proposed matchings');
  }

  private calculateCompatibilityFactors(child: Child, family: Family): CompatibilityFactors {
    return {
      ageRange: this.calculateAgeRangeScore(child, family),
      specialNeeds: this.calculateSpecialNeedsScore(child, family),
      familySize: this.calculateFamilySizeScore(child, family),
      experience: this.calculateExperienceScore(family),
      availability: this.calculateAvailabilityScore(family)
    };
  }

  private calculateAgeRangeScore(child: Child, family: Family): number {
    const childAge = this.calculateAge(child.personalInfo.birthDate);
    const { min, max } = family.preferences.ageRange;
    
    if (childAge < min || childAge > max) {
      return 0; // Child is outside preferred age range
    }
    
    // Calculate score based on how well the child fits in the preferred range
    const rangeSize = max - min;
    const positionInRange = childAge - min;
    const centerOfRange = rangeSize / 2;
    const distanceFromCenter = Math.abs(positionInRange - centerOfRange);
    
    // Score is higher when child is closer to center of age range
    return Math.max(0, 1 - (distanceFromCenter / centerOfRange)) * 100;
  }

  private calculateSpecialNeedsScore(child: Child, family: Family): number {
    if (!child.specialNeeds.hasSpecialNeeds) {
      return 100; // No special needs, automatically compatible
    }
    
    if (!family.preferences.specialNeeds) {
      return 0; // Child has special needs but family doesn't accept them
    }
    
    // Base score for accepting special needs
    let score = 80;
    
    // Adjust based on complexity of needs
    const complexityFactors = [
      child.specialNeeds.healthConditions.length,
      child.specialNeeds.medications.length,
      child.specialNeeds.educationalNeeds.length
    ];
    
    const totalComplexity = complexityFactors.reduce((sum, factor) => sum + factor, 0);
    
    // Reduce score based on complexity (max reduction of 30 points)
    const complexityReduction = Math.min(30, totalComplexity * 5);
    
    return Math.max(50, score - complexityReduction);
  }

  private calculateFamilySizeScore(child: Child, family: Family): number {
    const familySize = family.composition.length + 1; // +1 for primary contact
    const maxChildren = family.preferences.maxChildren;
    
    // Get current active placements for this family
    const currentChildren = 1; // Simplified - should query actual active placements
    
    if (currentChildren >= maxChildren) {
      return 0; // Family is at capacity
    }
    
    // Score based on family capacity and size
    let score = 100;
    
    // Larger families might be better for some children
    if (familySize > 4) {
      score += 10; // Bonus for larger, more experienced families
    }
    
    // Consider siblings
    if (child.familyBackground.siblings.length > 0) {
      const remainingCapacity = maxChildren - currentChildren;
      if (remainingCapacity >= child.familyBackground.siblings.length) {
        score += 20; // Bonus for being able to accommodate siblings
      } else {
        score -= 10; // Penalty for not being able to keep siblings together
      }
    }
    
    return Math.min(100, score);
  }

  private calculateExperienceScore(family: Family): number {
    // Base score
    let score = 60;
    
    // Check for previous successful placements
    const successfulPlacements = family.history?.filter(
      h => h.outcome === 'successful'
    ).length || 0;
    
    // Add points for experience
    score += Math.min(30, successfulPlacements * 10);
    
    // Check for interrupted placements (penalty)
    const interruptedPlacements = family.history?.filter(
      h => h.outcome === 'interrupted'
    ).length || 0;
    
    score -= Math.min(20, interruptedPlacements * 5);
    
    // Consider family composition experience
    const hasChildren = family.composition.some(member => member.relationship === 'child');
    if (hasChildren) {
      score += 10; // Bonus for having parenting experience
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateAvailabilityScore(family: Family): number {
    if (family.status !== 'available') {
      return 0;
    }
    
    // Base availability score
    let score = 100;
    
    // Consider recent placements (might need time to adjust)
    const recentPlacements = family.history?.filter(h => {
      const endDate = new Date(h.endDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return endDate > threeMonthsAgo;
    }).length || 0;
    
    if (recentPlacements > 0) {
      score -= 10; // Small penalty for recent placement activity
    }
    
    return score;
  }

  private calculateOverallScore(factors: CompatibilityFactors): number {
    // Weighted average of all factors
    const weights = {
      ageRange: 0.25,      // 25% - Age compatibility is crucial
      specialNeeds: 0.30,   // 30% - Special needs compatibility is critical
      familySize: 0.15,     // 15% - Family capacity matters
      experience: 0.20,     // 20% - Experience is important
      availability: 0.10    // 10% - Availability is basic requirement
    };
    
    return Math.round(
      factors.ageRange * weights.ageRange +
      factors.specialNeeds * weights.specialNeeds +
      factors.familySize * weights.familySize +
      factors.experience * weights.experience +
      factors.availability * weights.availability
    );
  }

  private getRecommendation(score: number): 'high' | 'medium' | 'low' {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  private generateCompatibilityNotes(child: Child, family: Family, factors: CompatibilityFactors): string[] {
    const notes: string[] = [];
    
    // Age range notes
    const childAge = this.calculateAge(child.personalInfo.birthDate);
    if (factors.ageRange === 0) {
      notes.push(`Child age (${childAge}) is outside family's preferred range (${family.preferences.ageRange.min}-${family.preferences.ageRange.max})`);
    } else if (factors.ageRange > 90) {
      notes.push(`Excellent age match - child fits perfectly in family's preferred age range`);
    }
    
    // Special needs notes
    if (child.specialNeeds.hasSpecialNeeds) {
      if (factors.specialNeeds === 0) {
        notes.push('Family does not accept children with special needs');
      } else if (factors.specialNeeds < 70) {
        notes.push('Child has complex special needs that may require additional support');
      } else {
        notes.push('Family is well-suited to support child\'s special needs');
      }
    }
    
    // Family size notes
    if (factors.familySize === 0) {
      notes.push('Family is at maximum capacity');
    } else if (child.familyBackground.siblings.length > 0) {
      notes.push(`Child has ${child.familyBackground.siblings.length} sibling(s) - consider placement together`);
    }
    
    // Experience notes
    if (factors.experience < 50) {
      notes.push('Family has limited fostering experience');
    } else if (factors.experience > 80) {
      notes.push('Family has excellent fostering track record');
    }
    
    // Add gender preference note
    if (family.preferences.gender !== 'any' && family.preferences.gender !== child.personalInfo.gender) {
      notes.push(`Family prefers ${family.preferences.gender === 'male' ? 'boys' : 'girls'} but child is ${child.personalInfo.gender === 'male' ? 'male' : 'female'}`);
    }
    
    return notes;
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

  private async notifyMatchingProposal(matching: Matching): Promise<void> {
    const child = await childRepository.findById(matching.childId);
    const family = await familyRepository.findById(matching.familyId);
    
    if (child && family) {
      await this.notifyCoordinators(
        'New Matching Proposal',
        `A new matching has been proposed between ${child.personalInfo.name} and ${family.primaryContact.name} (Score: ${matching.compatibilityScore.overallScore}%)`,
        'placement_update'
      );
    }
  }

  private async notifyMatchingApproval(matching: Matching): Promise<void> {
    const child = await childRepository.findById(matching.childId);
    const family = await familyRepository.findById(matching.familyId);
    
    if (child && family) {
      await this.notifyCoordinators(
        'Matching Approved',
        `Matching between ${child.personalInfo.name} and ${family.primaryContact.name} has been approved and is ready for placement process`,
        'placement_update'
      );
    }
  }

  private async notifyCoordinators(title: string, message: string, type: Notification['type']): Promise<void> {
    const coordinators = await userRepository.findByRole('coordinator');
    
    await Promise.all(
      coordinators.map(coordinator =>
        notificationRepository.createNotification(
          coordinator.id,
          type,
          title,
          message,
          'medium'
        )
      )
    );
  }
}

// Placement Service
export class PlacementService extends BaseService {
  async list(options: QueryOptions = {}): Promise<PaginatedResponse<Placement>> {
    return this.handleServiceCall(async () => {
      return placementRepository.findAll(options);
    }, 'Failed to retrieve placements');
  }

  async getById(id: EntityId): Promise<Placement | null> {
    return this.handleServiceCall(async () => {
      return placementRepository.findById(id);
    }, `Failed to retrieve placement with id ${id}`);
  }

  async getByChild(childId: EntityId): Promise<Placement[]> {
    return this.handleServiceCall(async () => {
      return placementRepository.findByChild(childId);
    }, `Failed to retrieve placements for child ${childId}`);
  }

  async getByFamily(familyId: EntityId): Promise<Placement[]> {
    return this.handleServiceCall(async () => {
      return placementRepository.findByFamily(familyId);
    }, `Failed to retrieve placements for family ${familyId}`);
  }

  async getActive(): Promise<Placement[]> {
    return this.handleServiceCall(async () => {
      return placementRepository.findActive();
    }, 'Failed to retrieve active placements');
  }

  async update(id: EntityId, updates: Partial<Placement>): Promise<Placement> {
    return this.handleServiceCall(async () => {
      const existingPlacement = await placementRepository.findById(id);
      if (!existingPlacement) {
        throw new ServiceError(`Placement with id ${id} not found`, 'PLACEMENT_NOT_FOUND');
      }

      // Validate status transitions
      if (updates.status && updates.status !== existingPlacement.status) {
        this.validateStatusTransition(existingPlacement.status, updates.status);
      }

      const updatedPlacement = await placementRepository.update(id, {
        ...updates,
        updatedAt: new Date()
      });

      // Update child and family status if placement status changed
      if (updates.status) {
        await this.updateRelatedEntitiesStatus(updatedPlacement);
      }

      // Notify coordinators about status changes
      if (updates.status && updates.status !== existingPlacement.status) {
        await this.notifyStatusChange(updatedPlacement, existingPlacement.status);
      }

      return updatedPlacement;
    }, `Failed to update placement with id ${id}`);
  }

  async updateApproximationStage(
    placementId: EntityId, 
    stageId: string, 
    updates: Partial<ApproximationStage>
  ): Promise<Placement> {
    return this.handleServiceCall(async () => {
      const placement = await placementRepository.findById(placementId);
      if (!placement) {
        throw new ServiceError(`Placement with id ${placementId} not found`, 'PLACEMENT_NOT_FOUND');
      }

      const updatedStages = placement.approximationProcess.stages.map(stage => 
        stage.id === stageId ? { ...stage, ...updates } : stage
      );

      // Update current stage if this stage was just completed
      let currentStage = placement.approximationProcess.currentStage;
      if (updates.completed) {
        const currentIndex = updatedStages.findIndex(s => s.id === stageId);
        const nextStage = updatedStages[currentIndex + 1];
        if (nextStage && !nextStage.completed) {
          currentStage = nextStage.id;
        }
      }

      const updatedProcess: ApproximationProcess = {
        ...placement.approximationProcess,
        stages: updatedStages,
        currentStage
      };

      const updatedPlacement = await placementRepository.update(placementId, {
        approximationProcess: updatedProcess,
        updatedAt: new Date()
      });

      // Notify about stage completion
      if (updates.completed) {
        await this.notifyStageCompletion(updatedPlacement, stageId);
      }

      return updatedPlacement;
    }, `Failed to update approximation stage for placement ${placementId}`);
  }

  async addStageNote(
    placementId: EntityId, 
    stageId: string, 
    note: string
  ): Promise<Placement> {
    return this.handleServiceCall(async () => {
      const placement = await placementRepository.findById(placementId);
      if (!placement) {
        throw new ServiceError(`Placement with id ${placementId} not found`, 'PLACEMENT_NOT_FOUND');
      }

      const stage = placement.approximationProcess.stages.find(s => s.id === stageId);
      if (!stage) {
        throw new ServiceError(`Stage with id ${stageId} not found`, 'STAGE_NOT_FOUND');
      }

      const existingNotes = stage.notes || '';
      const separator = existingNotes ? '\n\n' : '';
      const timestamp = new Date().toLocaleString('pt-BR');
      const updatedNotes = `${existingNotes}${separator}[${timestamp}] ${note}`;

      return this.updateApproximationStage(placementId, stageId, { notes: updatedNotes });
    }, `Failed to add note to stage ${stageId} for placement ${placementId}`);
  }

  async getPlacementMetrics(): Promise<{
    total: number;
    active: number;
    completed: number;
    interrupted: number;
    behindSchedule: number;
    avgDuration: number;
  }> {
    return this.handleServiceCall(async () => {
      const allPlacements = await placementRepository.findAll({ limit: 1000 });
      const placements = allPlacements.data;
      
      const total = placements.length;
      const active = placements.filter(p => p.status === 'active').length;
      const completed = placements.filter(p => p.status === 'completed').length;
      const interrupted = placements.filter(p => p.status === 'interrupted').length;
      
      const behindSchedule = placements.filter(p => {
        if (p.status !== 'active') return false;
        const progress = this.calculateProgress(p);
        return progress.actualProgress < progress.expectedProgress - 15;
      }).length;

      const completedPlacements = placements.filter(p => p.endDate);
      const avgDuration = completedPlacements.length > 0
        ? completedPlacements.reduce((sum, p) => {
            const duration = Math.ceil(
              (new Date(p.endDate!).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + duration;
          }, 0) / completedPlacements.length
        : 0;

      return {
        total,
        active,
        completed,
        interrupted,
        behindSchedule,
        avgDuration: Math.round(avgDuration)
      };
    }, 'Failed to get placement metrics');
  }

  async endPlacement(id: EntityId, reason: string): Promise<Placement> {
    return this.handleServiceCall(async () => {
      const placement = await placementRepository.findById(id);
      if (!placement) {
        throw new ServiceError(`Placement with id ${id} not found`, 'PLACEMENT_NOT_FOUND');
      }

      if (placement.status !== 'active') {
        throw new ServiceError('Only active placements can be ended', 'INVALID_STATUS');
      }

      const updatedPlacement = await placementRepository.update(id, {
        status: 'completed',
        endDate: new Date(),
        updatedAt: new Date()
      });

      // Update child status back to awaiting or other appropriate status
      await childRepository.updateStatus(placement.childId, 'discharged', reason, 'system');
      
      // Update family status back to available
      await familyRepository.updateStatus(placement.familyId, 'available');

      // Notify about placement completion
      await this.notifyPlacementCompletion(updatedPlacement, reason);

      return updatedPlacement;
    }, `Failed to end placement with id ${id}`);
  }

  async interruptPlacement(id: EntityId, reason: string): Promise<Placement> {
    return this.handleServiceCall(async () => {
      const placement = await placementRepository.findById(id);
      if (!placement) {
        throw new ServiceError(`Placement with id ${id} not found`, 'PLACEMENT_NOT_FOUND');
      }

      if (placement.status !== 'active') {
        throw new ServiceError('Only active placements can be interrupted', 'INVALID_STATUS');
      }

      const updatedPlacement = await placementRepository.update(id, {
        status: 'interrupted',
        endDate: new Date(),
        updatedAt: new Date()
      });

      // Update child status back to awaiting
      await childRepository.updateStatus(placement.childId, 'awaiting', reason, 'system');
      
      // Update family status based on their availability
      await familyRepository.updateStatus(placement.familyId, 'under_evaluation');

      // Notify about placement interruption
      await this.notifyPlacementInterruption(updatedPlacement, reason);

      return updatedPlacement;
    }, `Failed to interrupt placement with id ${id}`);
  }

  private calculateProgress(placement: Placement) {
    const process = placement.approximationProcess;
    const startDate = new Date(process.startDate);
    const currentDate = new Date();
    const daysElapsed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const completedStages = process.stages.filter(s => s.completed).length;
    const totalStages = process.stages.length;
    const actualProgress = Math.round((completedStages / totalStages) * 100);
    const expectedProgress = Math.min(100, Math.round((daysElapsed / process.expectedDuration) * 100));

    return {
      actualProgress,
      expectedProgress,
      daysElapsed,
      isOnTrack: actualProgress >= expectedProgress - 15
    };
  }

  private validateStatusTransition(currentStatus: PlacementStatus, newStatus: PlacementStatus): void {
    const allowedTransitions: Record<PlacementStatus, PlacementStatus[]> = {
      'active': ['completed', 'interrupted', 'transferred'],
      'completed': [], // Terminal status
      'interrupted': ['active'], // Can be reactivated
      'transferred': ['active'] // Can be reactivated
    };

    if (!allowedTransitions[currentStatus].includes(newStatus)) {
      throw new ServiceError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  private async updateRelatedEntitiesStatus(placement: Placement): Promise<void> {
    switch (placement.status) {
      case 'completed':
        await childRepository.updateStatus(placement.childId, 'discharged', 'Placement completed', 'system');
        await familyRepository.updateStatus(placement.familyId, 'available');
        break;
      case 'interrupted':
        await childRepository.updateStatus(placement.childId, 'awaiting', 'Placement interrupted', 'system');
        await familyRepository.updateStatus(placement.familyId, 'under_evaluation');
        break;
      case 'active':
        await childRepository.updateStatus(placement.childId, 'in_placement', 'Placement reactivated', 'system');
        await familyRepository.updateStatus(placement.familyId, 'active_placement');
        break;
    }
  }

  private async notifyStatusChange(placement: Placement, previousStatus: PlacementStatus): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (child && family) {
      await this.notifyCoordinators(
        'Status de Acolhimento Alterado',
        `O acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name} foi alterado de ${previousStatus} para ${placement.status}`,
        'placement_update'
      );
    }
  }

  private async notifyStageCompletion(placement: Placement, stageId: string): Promise<void> {
    const stage = placement.approximationProcess.stages.find(s => s.id === stageId);
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (stage && child && family) {
      await this.notifyCoordinators(
        'Etapa de Aproximação Concluída',
        `A etapa "${stage.name}" foi concluída no acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name}`,
        'placement_update'
      );
    }
  }

  private async notifyPlacementCompletion(placement: Placement, reason: string): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (child && family) {
      await this.notifyCoordinators(
        'Acolhimento Concluído',
        `O acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name} foi concluído. Motivo: ${reason}`,
        'placement_update'
      );
    }
  }

  private async notifyPlacementInterruption(placement: Placement, reason: string): Promise<void> {
    const child = await childRepository.findById(placement.childId);
    const family = await familyRepository.findById(placement.familyId);
    
    if (child && family) {
      await this.notifyCoordinators(
        'Acolhimento Interrompido',
        `O acolhimento de ${child.personalInfo.name} na família ${family.primaryContact.name} foi interrompido. Motivo: ${reason}`,
        'placement_update'
      );
    }
  }

  private async notifyCoordinators(title: string, message: string, type: Notification['type']): Promise<void> {
    const coordinators = await userRepository.findByRole('coordinator');
    
    await Promise.all(
      coordinators.map(coordinator =>
        notificationRepository.createNotification(
          coordinator.id,
          type,
          title,
          message,
          'medium'
        )
      )
    );
  }
}

// User Service
export class UserService extends BaseService {
  async list(options: QueryOptions = {}): Promise<PaginatedResponse<User>> {
    return this.handleServiceCall(async () => {
      return userRepository.findAll(options);
    }, 'Failed to retrieve users');
  }

  async getById(id: EntityId): Promise<User | null> {
    return this.handleServiceCall(async () => {
      return userRepository.findById(id);
    }, `Failed to retrieve user with id ${id}`);
  }

  async create(data: CreateUserRequest): Promise<User> {
    return this.handleServiceCall(async () => {
      this.validateCreateUserData(data);
      const user = await userRepository.createUser(data);
      
      // Notify other coordinators about new user
      await this.notifyCoordinators(
        'Novo Usuário Criado',
        `Um novo ${data.role === 'coordinator' ? 'coordenador' : 'técnico'} foi adicionado ao sistema: ${data.name}`,
        'system'
      );
      
      return user;
    }, 'Failed to create user');
  }

  async update(id: EntityId, data: UpdateUserRequest): Promise<User> {
    return this.handleServiceCall(async () => {
      this.validateUpdateUserData(data);
      
      const existingUser = await userRepository.findById(id);
      if (!existingUser) {
        throw new ServiceError('User not found', 'NOT_FOUND');
      }

      // Check if email is being changed and if it's already in use
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await userRepository.findByEmail(data.email);
        if (emailExists) {
          throw new ServiceError('Email already in use', 'EMAIL_EXISTS');
        }
      }

      const updatedUser = await userRepository.update(id, data);
      
      // Notify coordinators about user update
      await this.notifyCoordinators(
        'Usuário Atualizado',
        `O perfil do usuário ${updatedUser.name} foi atualizado`,
        'system'
      );
      
      return updatedUser;
    }, 'Failed to update user');
  }

  async delete(id: EntityId): Promise<void> {
    return this.handleServiceCall(async () => {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new ServiceError('User not found', 'NOT_FOUND');
      }

      // Prevent deletion of the last coordinator
      if (user.role === 'coordinator') {
        const coordinators = await userRepository.findByRole('coordinator');
        if (coordinators.length <= 1) {
          throw new ServiceError('Cannot delete the last coordinator', 'LAST_COORDINATOR');
        }
      }

      await userRepository.delete(id);
      
      // Notify coordinators about user deletion
      await this.notifyCoordinators(
        'Usuário Removido',
        `O usuário ${user.name} foi removido do sistema`,
        'system'
      );
    }, 'Failed to delete user');
  }

  async toggleStatus(id: EntityId): Promise<User> {
    return this.handleServiceCall(async () => {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new ServiceError('User not found', 'NOT_FOUND');
      }

      // Prevent deactivation of the last active coordinator
      if (user.role === 'coordinator' && user.isActive) {
        const activeCoordinators = await userRepository.findActive();
        const activeCoordinatorCount = activeCoordinators.filter(u => u.role === 'coordinator').length;
        if (activeCoordinatorCount <= 1) {
          throw new ServiceError('Cannot deactivate the last active coordinator', 'LAST_ACTIVE_COORDINATOR');
        }
      }

      const updatedUser = await userRepository.toggleUserStatus(id);
      
      // Notify coordinators about status change
      await this.notifyCoordinators(
        'Status do Usuário Alterado',
        `O usuário ${updatedUser.name} foi ${updatedUser.isActive ? 'ativado' : 'desativado'}`,
        'system'
      );
      
      return updatedUser;
    }, 'Failed to toggle user status');
  }

  async updatePermissions(id: EntityId, permissions: Permission[]): Promise<User> {
    return this.handleServiceCall(async () => {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new ServiceError('User not found', 'NOT_FOUND');
      }

      this.validatePermissions(permissions, user.role);
      
      const updatedUser = await userRepository.updatePermissions(id, permissions);
      
      // Notify coordinators about permission changes
      await this.notifyCoordinators(
        'Permissões Atualizadas',
        `As permissões do usuário ${updatedUser.name} foram atualizadas`,
        'system'
      );
      
      return updatedUser;
    }, 'Failed to update user permissions');
  }

  async changeRole(id: EntityId, role: User['role']): Promise<User> {
    return this.handleServiceCall(async () => {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new ServiceError('User not found', 'NOT_FOUND');
      }

      // Prevent changing role of the last coordinator
      if (user.role === 'coordinator' && role !== 'coordinator') {
        const coordinators = await userRepository.findByRole('coordinator');
        if (coordinators.length <= 1) {
          throw new ServiceError('Cannot change role of the last coordinator', 'LAST_COORDINATOR');
        }
      }

      const updatedUser = await userRepository.changeRole(id, role);
      
      // Notify coordinators about role change
      await this.notifyCoordinators(
        'Cargo Alterado',
        `O cargo do usuário ${updatedUser.name} foi alterado para ${role === 'coordinator' ? 'Coordenador' : 'Técnico'}`,
        'system'
      );
      
      return updatedUser;
    }, 'Failed to change user role');
  }

  async getStats(): Promise<UserStats> {
    return this.handleServiceCall(async () => {
      return userRepository.getUserStats();
    }, 'Failed to retrieve user statistics');
  }

  async getActiveUsers(): Promise<User[]> {
    return this.handleServiceCall(async () => {
      return userRepository.findActive();
    }, 'Failed to retrieve active users');
  }

  async getUsersByRole(role: User['role']): Promise<User[]> {
    return this.handleServiceCall(async () => {
      return userRepository.findByRole(role);
    }, 'Failed to retrieve users by role');
  }

  getPermissionGroups(): PermissionGroup[] {
    return [
      {
        id: 'families',
        name: 'Gestão de Famílias',
        description: 'Permissões para gerenciar famílias acolhedoras',
        permissions: ['families:read', 'families:write', 'families:delete']
      },
      {
        id: 'children',
        name: 'Gestão de Crianças',
        description: 'Permissões para gerenciar crianças e adolescentes',
        permissions: ['children:read', 'children:write', 'children:delete']
      },
      {
        id: 'matching',
        name: 'Matching e Acolhimento',
        description: 'Permissões para gerenciar o processo de matching',
        permissions: ['matching:read', 'matching:write']
      },
      {
        id: 'budget',
        name: 'Gestão Orçamentária',
        description: 'Permissões para gerenciar orçamento e custos',
        permissions: ['budget:read', 'budget:write']
      },
      {
        id: 'reports',
        name: 'Relatórios',
        description: 'Permissões para visualizar e gerar relatórios',
        permissions: ['reports:read', 'reports:write']
      },
      {
        id: 'settings',
        name: 'Configurações',
        description: 'Permissões para gerenciar configurações do sistema',
        permissions: ['settings:read', 'settings:write']
      },
      {
        id: 'users',
        name: 'Gestão de Usuários',
        description: 'Permissões para gerenciar usuários do sistema',
        permissions: ['users:read', 'users:write', 'users:delete']
      }
    ];
  }

  private validateCreateUserData(data: CreateUserRequest): void {
    if (!data.email || !data.name || !data.role) {
      throw new ServiceError('Email, name, and role are required', 'INVALID_DATA');
    }

    if (!data.email.includes('@')) {
      throw new ServiceError('Invalid email format', 'INVALID_EMAIL');
    }

    if (data.name.length < 2) {
      throw new ServiceError('Name must be at least 2 characters long', 'INVALID_NAME');
    }

    this.validatePermissions(data.permissions, data.role);
  }

  private validateUpdateUserData(data: UpdateUserRequest): void {
    if (data.email && !data.email.includes('@')) {
      throw new ServiceError('Invalid email format', 'INVALID_EMAIL');
    }

    if (data.name && data.name.length < 2) {
      throw new ServiceError('Name must be at least 2 characters long', 'INVALID_NAME');
    }

    if (data.permissions && data.role) {
      this.validatePermissions(data.permissions, data.role);
    }
  }

  private validatePermissions(permissions: Permission[], role: User['role']): void {
    const allowedPermissions = this.getAllowedPermissionsForRole(role);
    const invalidPermissions = permissions.filter(p => !allowedPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      throw new ServiceError(
        `Invalid permissions for ${role}: ${invalidPermissions.join(', ')}`,
        'INVALID_PERMISSIONS'
      );
    }
  }

  private getAllowedPermissionsForRole(role: User['role']): Permission[] {
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

  private async notifyCoordinators(title: string, message: string, type: Notification['type']): Promise<void> {
    const coordinators = await userRepository.findByRole('coordinator');
    
    await Promise.all(
      coordinators.map(coordinator =>
        notificationRepository.createNotification(
          coordinator.id,
          type,
          title,
          message,
          'medium'
        )
      )
    );
  }
}

// Technical Visit Management Service
export class TechnicalVisitService extends BaseService {
  async list(options: ListOptions = {}): Promise<ListResponse<TechnicalVisit>> {
    return this.handleServiceCall(async () => {
      const visits = await technicalVisitRepository.list(options);
      const total = await technicalVisitRepository.count();
      
      return {
        data: visits,
        total,
        page: options.page || 1,
        limit: options.limit || 50
      };
    }, 'Failed to retrieve technical visits');
  }

  async getById(id: EntityId): Promise<TechnicalVisit | null> {
    return this.handleServiceCall(async () => {
      return technicalVisitRepository.findById(id);
    }, `Failed to retrieve technical visit ${id}`);
  }

  async getByPlacement(placementId: EntityId): Promise<TechnicalVisit[]> {
    return this.handleServiceCall(async () => {
      return technicalVisitRepository.findByPlacement(placementId);
    }, `Failed to retrieve visits for placement ${placementId}`);
  }

  async getUpcoming(days: number = 7): Promise<TechnicalVisit[]> {
    return this.handleServiceCall(async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + days);
      
      return technicalVisitRepository.findInDateRange(startDate, endDate);
    }, 'Failed to retrieve upcoming visits');
  }

  async getOverdue(): Promise<TechnicalVisit[]> {
    return this.handleServiceCall(async () => {
      return technicalVisitRepository.findOverdue();
    }, 'Failed to retrieve overdue visits');
  }

  async create(visitData: Omit<TechnicalVisit, 'id'>): Promise<TechnicalVisit> {
    return this.handleServiceCall(async () => {
      // Validate placement exists and is active
      const placement = await placementRepository.findById(visitData.placementId);
      if (!placement) {
        throw new ServiceError('Placement not found', 'PLACEMENT_NOT_FOUND');
      }

      if (placement.status !== 'active') {
        throw new ServiceError('Cannot schedule visit for inactive placement', 'PLACEMENT_INACTIVE');
      }

      // Validate technician exists
      const technician = await userRepository.findById(visitData.technicianId);
      if (!technician) {
        throw new ServiceError('Technician not found', 'TECHNICIAN_NOT_FOUND');
      }

      if (technician.role !== 'technician' && technician.role !== 'coordinator') {
        throw new ServiceError('Invalid technician role', 'INVALID_TECHNICIAN');
      }

      // Check for scheduling conflicts
      await this.checkSchedulingConflicts(visitData.technicianId, visitData.visitDate);

      const visit = await technicalVisitRepository.create(visitData);

      // Create notification for the assigned technician
      await this.notifyTechnicianAssignment(visit);

      // Update placement with visit information
      await this.updatePlacementWithVisit(placement.id, visit.id);

      return visit;
    }, 'Failed to create technical visit');
  }

  async update(id: EntityId, updates: Partial<TechnicalVisit>): Promise<TechnicalVisit> {
    return this.handleServiceCall(async () => {
      const existingVisit = await technicalVisitRepository.findById(id);
      if (!existingVisit) {
        throw new ServiceError('Technical visit not found', 'VISIT_NOT_FOUND');
      }

      // If changing date or technician, check for conflicts
      if (updates.visitDate || updates.technicianId) {
        const technicianId = updates.technicianId || existingVisit.technicianId;
        const visitDate = updates.visitDate || existingVisit.visitDate;
        await this.checkSchedulingConflicts(technicianId, visitDate, id);
      }

      const updatedVisit = await technicalVisitRepository.update(id, updates);

      // Notify about changes if date or technician changed
      if (updates.visitDate || updates.technicianId) {
        await this.notifyVisitRescheduled(updatedVisit);
      }

      return updatedVisit;
    }, `Failed to update technical visit ${id}`);
  }

  async delete(id: EntityId): Promise<void> {
    return this.handleServiceCall(async () => {
      const visit = await technicalVisitRepository.findById(id);
      if (!visit) {
        throw new ServiceError('Technical visit not found', 'VISIT_NOT_FOUND');
      }

      // Only allow deletion of future visits
      if (new Date(visit.visitDate) <= new Date()) {
        throw new ServiceError('Cannot delete past or current visits', 'VISIT_ALREADY_OCCURRED');
      }

      await technicalVisitRepository.delete(id);

      // Notify technician about cancellation
      await this.notifyVisitCancelled(visit);

      // Remove visit reference from placement
      await this.removeVisitFromPlacement(visit.placementId, id);
    }, `Failed to delete technical visit ${id}`);
  }

  async completeVisit(
    id: EntityId, 
    observations: string, 
    recommendations: string[], 
    followUpRequired: boolean,
    nextVisitDate?: Date
  ): Promise<TechnicalVisit> {
    return this.handleServiceCall(async () => {
      const visit = await technicalVisitRepository.findById(id);
      if (!visit) {
        throw new ServiceError('Technical visit not found', 'VISIT_NOT_FOUND');
      }

      const completedVisit = await technicalVisitRepository.update(id, {
        observations,
        recommendations,
        followUpRequired,
        nextVisitDate
      });

      // Schedule follow-up visit if required
      if (followUpRequired && nextVisitDate) {
        await this.scheduleFollowUpVisit(completedVisit, nextVisitDate);
      }

      // Create notifications for coordinators about completed visit
      await this.notifyVisitCompleted(completedVisit);

      return completedVisit;
    }, `Failed to complete technical visit ${id}`);
  }

  async getVisitsByTechnician(technicianId: EntityId, dateRange?: { start: Date; end: Date }): Promise<TechnicalVisit[]> {
    return this.handleServiceCall(async () => {
      if (dateRange) {
        return technicalVisitRepository.findByTechnicianInRange(technicianId, dateRange.start, dateRange.end);
      }
      return technicalVisitRepository.findByTechnician(technicianId);
    }, `Failed to retrieve visits for technician ${technicianId}`);
  }

  async getVisitStats(): Promise<{
    total: number;
    completed: number;
    upcoming: number;
    overdue: number;
    byTechnician: Record<string, number>;
    averageFrequency: number;
  }> {
    return this.handleServiceCall(async () => {
      const all = await technicalVisitRepository.findAll();
      const now = new Date();
      
      const completed = all.filter(v => new Date(v.visitDate) < now && v.observations).length;
      const upcoming = all.filter(v => new Date(v.visitDate) >= now).length;
      const overdue = all.filter(v => new Date(v.visitDate) < now && !v.observations).length;
      
      const byTechnician: Record<string, number> = {};
      all.forEach(visit => {
        byTechnician[visit.technicianId] = (byTechnician[visit.technicianId] || 0) + 1;
      });

      // Calculate average frequency (simplified)
      const activePlacements = await placementRepository.findActive();
      const averageFrequency = activePlacements.length > 0 ? Math.round(all.length / activePlacements.length) : 0;

      return {
        total: all.length,
        completed,
        upcoming,
        overdue,
        byTechnician,
        averageFrequency
      };
    }, 'Failed to retrieve visit statistics');
  }

  async suggestVisitDates(placementId: EntityId, preferredTechnicianId?: EntityId): Promise<Date[]> {
    return this.handleServiceCall(async () => {
      const placement = await placementRepository.findById(placementId);
      if (!placement) {
        throw new ServiceError('Placement not found', 'PLACEMENT_NOT_FOUND');
      }

      // Get last visit date for this placement
      const lastVisit = await technicalVisitRepository.getLastVisitForPlacement(placementId);
      const lastVisitDate = lastVisit ? new Date(lastVisit.visitDate) : new Date(placement.startDate);
      
      // Brazilian regulations suggest visits every 30 days minimum
      const minDaysBetweenVisits = 30;
      const nextVisitDate = new Date(lastVisitDate);
      nextVisitDate.setDate(nextVisitDate.getDate() + minDaysBetweenVisits);

      // Get available technicians
      const technicians = preferredTechnicianId 
        ? [await userRepository.findById(preferredTechnicianId)]
        : await userRepository.findByRole('technician');

      const availableDates: Date[] = [];
      
      // Check next 14 days for availability
      for (let i = 0; i < 14; i++) {
        const checkDate = new Date(nextVisitDate);
        checkDate.setDate(checkDate.getDate() + i);
        
        // Skip weekends (optional - can be configured)
        if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
          continue;
        }

        // Check if any technician is available
        for (const technician of technicians) {
          if (technician && await this.isTechnicianAvailable(technician.id, checkDate)) {
            availableDates.push(checkDate);
            break;
          }
        }

        if (availableDates.length >= 5) break; // Return top 5 suggestions
      }

      return availableDates;
    }, `Failed to suggest visit dates for placement ${placementId}`);
  }

  private async checkSchedulingConflicts(technicianId: EntityId, visitDate: Date, excludeId?: EntityId): Promise<void> {
    const dayStart = new Date(visitDate);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(visitDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingVisits = await technicalVisitRepository.findByTechnicianInRange(technicianId, dayStart, dayEnd);
    
    const conflicts = excludeId 
      ? existingVisits.filter(v => v.id !== excludeId)
      : existingVisits;

    if (conflicts.length >= 3) { // Max 3 visits per day per technician
      throw new ServiceError('Technician already has maximum visits scheduled for this day', 'SCHEDULING_CONFLICT');
    }
  }

  private async isTechnicianAvailable(technicianId: EntityId, date: Date): Promise<boolean> {
    try {
      await this.checkSchedulingConflicts(technicianId, date);
      return true;
    } catch {
      return false;
    }
  }

  private async scheduleFollowUpVisit(completedVisit: TechnicalVisit, nextVisitDate: Date): Promise<TechnicalVisit> {
    const followUpVisit: Omit<TechnicalVisit, 'id'> = {
      placementId: completedVisit.placementId,
      visitDate: nextVisitDate,
      technicianId: completedVisit.technicianId,
      purpose: `Follow-up from visit on ${new Date(completedVisit.visitDate).toLocaleDateString('pt-BR')}`,
      observations: '',
      recommendations: [],
      followUpRequired: false
    };

    return this.create(followUpVisit);
  }

  private async updatePlacementWithVisit(placementId: EntityId, visitId: EntityId): Promise<void> {
    const placement = await placementRepository.findById(placementId);
    if (placement) {
      const updatedVisits = [...(placement.visits || []), { id: visitId } as TechnicalVisit];
      await placementRepository.update(placementId, { visits: updatedVisits });
    }
  }

  private async removeVisitFromPlacement(placementId: EntityId, visitId: EntityId): Promise<void> {
    const placement = await placementRepository.findById(placementId);
    if (placement && placement.visits) {
      const updatedVisits = placement.visits.filter(v => v.id !== visitId);
      await placementRepository.update(placementId, { visits: updatedVisits });
    }
  }

  private async notifyTechnicianAssignment(visit: TechnicalVisit): Promise<void> {
    const placement = await placementRepository.findById(visit.placementId);
    const child = placement ? await childRepository.findById(placement.childId) : null;
    const family = placement ? await familyRepository.findById(placement.familyId) : null;
    
    if (child && family) {
      const title = 'Nova visita técnica agendada';
      const message = `Visita agendada para ${new Date(visit.visitDate).toLocaleDateString('pt-BR')} - ${child.personalInfo.name} na família ${family.primaryContact.name}`;
      
      await notificationRepository.createNotification(
        visit.technicianId,
        'visit_reminder',
        title,
        message,
        'medium',
        `/visits/${visit.id}`
      );
    }
  }

  private async notifyVisitRescheduled(visit: TechnicalVisit): Promise<void> {
    const title = 'Visita técnica reagendada';
    const message = `Sua visita foi reagendada para ${new Date(visit.visitDate).toLocaleDateString('pt-BR')}`;
    
    await notificationRepository.createNotification(
      visit.technicianId,
      'visit_reminder',
      title,
      message,
      'high',
      `/visits/${visit.id}`
    );
  }

  private async notifyVisitCancelled(visit: TechnicalVisit): Promise<void> {
    const title = 'Visita técnica cancelada';
    const message = `A visita agendada para ${new Date(visit.visitDate).toLocaleDateString('pt-BR')} foi cancelada`;
    
    await notificationRepository.createNotification(
      visit.technicianId,
      'visit_reminder',
      title,
      message,
      'medium'
    );
  }

  private async notifyVisitCompleted(visit: TechnicalVisit): Promise<void> {
    const coordinators = await userRepository.findByRole('coordinator');
    const placement = await placementRepository.findById(visit.placementId);
    const child = placement ? await childRepository.findById(placement.childId) : null;
    
    if (child) {
      const title = 'Visita técnica concluída';
      const message = `Visita técnica para ${child.personalInfo.name} foi concluída. ${visit.followUpRequired ? 'Acompanhamento necessário.' : ''}`;
      
      for (const coordinator of coordinators) {
        await notificationRepository.createNotification(
          coordinator.id,
          'visit_reminder',
          title,
          message,
          visit.followUpRequired ? 'high' : 'medium',
          `/visits/${visit.id}`
        );
      }
    }
  }
}

// Export service instances
export const authService = new AuthService();
export const userService = new UserService();
export const familyService = new FamilyService();
export const childrenService = new ChildrenService();
export const placementService = new PlacementService();
export const budgetService = new BudgetService();
export const statisticsService = new StatisticsService();
export const matchingService = new MatchingService();
export const reportService = new ReportService();
export const notificationService = new NotificationService();
export const technicalVisitService = new TechnicalVisitService();

// Export specialized services
export { reportSchedulerService } from './ReportSchedulerService.js';
export { auditService } from './AuditService.js';

// Export hybrid database service
export { hybridDatabaseService } from './HybridDatabaseService.js';
