import { 
  authService,
  userService,
  familyService,
  childrenService,
  placementService,
  budgetService,
  auditService
} from '../services/index.js';
import type { 
  CreateFamilyRequest,
  CreateChildRequest,
  User,
  Family,
  Child,
  Placement
} from '../types/index.js';

/**
 * CRUD Operations Validation for Foster Family Management System
 * Browser-compatible validation of all system operations
 */
export class CRUDValidation {
  private results: ValidationResult[] = [];
  private testData: {
    users: User[];
    families: Family[];
    children: Child[];
    placements: Placement[];
  } = {
    users: [],
    families: [],
    children: [],
    placements: []
  };

  async validateAllOperations(): Promise<ValidationSummary> {
    console.log('🔍 Starting CRUD Operations Validation...');
    
    try {
      await this.setupValidation();
      await this.validateUserOperations();
      await this.validateFamilyOperations();
      await this.validateChildrenOperations();
      await this.validatePlacementOperations();
      await this.validateBudgetOperations();
      await this.validateDataIntegrity();
      await this.validateAuditCompliance();
      
      return this.generateSummary();
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  private async setupValidation(): Promise<void> {
    await this.validate('Setup Validation Environment', async () => {
      // Set up audit context
      auditService.setContext({
        userId: 'validation-user',
        userEmail: 'validation@test.com',
        userName: 'Validation User',
        ipAddress: '127.0.0.1',
        source: 'web',
        component: 'validation-suite'
      });
      
      console.log('✅ Validation environment set up');
    });
  }

  private async validateUserOperations(): Promise<void> {
    console.log('👥 Validating User CRUD Operations...');
    
    // Test user creation
    await this.validate('User Creation', async () => {
      const userData = {
        email: 'validation-tech@test.com',
        name: 'Validation Technician',
        role: 'technician' as const,
        permissions: ['families:read', 'children:read', 'matching:read'],
        isActive: true
      };
      
      const user = await userService.createUser(userData);
      this.testData.users.push(user);
      
      if (!user.id) throw new Error('User ID not generated');
      if (user.email !== userData.email) throw new Error('User email mismatch');
      if (user.role !== userData.role) throw new Error('User role mismatch');
    });
    
    // Test user reading
    await this.validate('User Reading', async () => {
      if (this.testData.users.length === 0) throw new Error('No test users available');
      
      const user = this.testData.users[0];
      const retrieved = await userService.getById(user.id);
      
      if (!retrieved) throw new Error('User not found');
      if (retrieved.id !== user.id) throw new Error('Retrieved user ID mismatch');
    });
    
    // Test user updating
    await this.validate('User Updating', async () => {
      if (this.testData.users.length === 0) throw new Error('No test users available');
      
      const user = this.testData.users[0];
      const updates = { name: 'Updated Validation Technician' };
      
      const updated = await userService.updateUser(user.id, updates);
      
      if (updated.name !== updates.name) throw new Error('User name not updated');
      
      // Update local reference
      this.testData.users[0] = updated;
    });
    
    // Test user listing
    await this.validate('User Listing', async () => {
      const response = await userService.list({ limit: 10 });
      
      if (!Array.isArray(response.data)) throw new Error('User list not an array');
      if (response.total < 1) throw new Error('No users found in database');
    });
  }

  private async validateFamilyOperations(): Promise<void> {
    console.log('👨‍👩‍👧‍👦 Validating Family CRUD Operations...');
    
    // Test family creation
    await this.validate('Family Creation', async () => {
      const familyData: CreateFamilyRequest = {
        primaryContact: {
          name: 'Validation Family',
          cpf: '000.000.001-00',
          phone: '(11) 99999-0001',
          email: 'validation.family@test.com'
        },
        address: {
          street: 'Rua de Validação',
          number: '1',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '00000-001',
          country: 'Brasil'
        },
        composition: [
          {
            name: 'João Validation',
            cpf: '000.000.001-00',
            birthDate: new Date('1980-01-01'),
            relationship: 'parent',
            occupation: 'Validation Worker',
            income: 3000
          }
        ],
        preferences: {
          ageRange: { min: 3, max: 15 },
          gender: 'any',
          specialNeeds: true,
          maxChildren: 2,
          siblingGroups: true
        },
        limitations: []
      };
      
      const family = await familyService.create(familyData);
      this.testData.families.push(family);
      
      if (!family.id) throw new Error('Family ID not generated');
      if (family.primaryContact.name !== familyData.primaryContact.name) {
        throw new Error('Family name mismatch');
      }
    });
    
    // Test family reading
    await this.validate('Family Reading', async () => {
      if (this.testData.families.length === 0) throw new Error('No test families available');
      
      const family = this.testData.families[0];
      const retrieved = await familyService.getById(family.id);
      
      if (!retrieved) throw new Error('Family not found');
      if (retrieved.id !== family.id) throw new Error('Retrieved family ID mismatch');
    });
    
    // Test family updating
    await this.validate('Family Updating', async () => {
      if (this.testData.families.length === 0) throw new Error('No test families available');
      
      const family = this.testData.families[0];
      const updates = {
        status: 'available' as const,
        limitations: ['Validation limitation']
      };
      
      const updated = await familyService.update(family.id, updates);
      
      if (updated.status !== updates.status) throw new Error('Family status not updated');
      if (!updated.limitations.includes('Validation limitation')) {
        throw new Error('Family limitations not updated');
      }
      
      // Update local reference
      this.testData.families[0] = updated;
    });
    
    // Test family listing
    await this.validate('Family Listing', async () => {
      const response = await familyService.list({ limit: 10 });
      
      if (!Array.isArray(response.data)) throw new Error('Family list not an array');
      if (response.data.length === 0) throw new Error('No families found');
    });
  }

  private async validateChildrenOperations(): Promise<void> {
    console.log('👶 Validating Children CRUD Operations...');
    
    // Test child creation
    await this.validate('Child Creation', async () => {
      const childData: CreateChildRequest = {
        personalInfo: {
          name: 'Validation Child',
          birthDate: new Date('2015-06-15'),
          gender: 'female',
          cpf: '000.000.002-00',
          birthCertificate: 'BC-VALIDATION-001'
        },
        specialNeeds: {
          hasSpecialNeeds: false,
          healthConditions: [],
          medications: [],
          educationalNeeds: [],
          therapeuticNeeds: []
        },
        familyBackground: {
          originFamily: 'Validation Origin Family',
          siblings: [],
          communityTies: [],
          culturalConsiderations: []
        },
        legalStatus: {
          courtOrder: 'Validation Court Order 001',
          legalGuardian: 'Validation Guardian',
          caseWorker: 'Validation Case Worker'
        }
      };
      
      const child = await childrenService.create(childData);
      this.testData.children.push(child);
      
      if (!child.id) throw new Error('Child ID not generated');
      if (child.personalInfo.name !== childData.personalInfo.name) {
        throw new Error('Child name mismatch');
      }
      if (child.status !== 'awaiting') throw new Error('Initial child status incorrect');
    });
    
    // Test child reading
    await this.validate('Child Reading', async () => {
      if (this.testData.children.length === 0) throw new Error('No test children available');
      
      const child = this.testData.children[0];
      const retrieved = await childrenService.getById(child.id);
      
      if (!retrieved) throw new Error('Child not found');
      if (retrieved.id !== child.id) throw new Error('Retrieved child ID mismatch');
    });
    
    // Test child updating
    await this.validate('Child Updating', async () => {
      if (this.testData.children.length === 0) throw new Error('No test children available');
      
      const child = this.testData.children[0];
      const updates = {
        specialNeeds: {
          ...child.specialNeeds,
          hasSpecialNeeds: true,
          healthConditions: ['Validation Health Condition']
        }
      };
      
      const updated = await childrenService.update(child.id, updates);
      
      if (!updated.specialNeeds.hasSpecialNeeds) {
        throw new Error('Child special needs not updated');
      }
      
      // Update local reference
      this.testData.children[0] = updated;
    });
    
    // Test child listing
    await this.validate('Child Listing', async () => {
      const response = await childrenService.list({ limit: 10 });
      
      if (!Array.isArray(response.data)) throw new Error('Children list not an array');
      if (response.data.length === 0) throw new Error('No children found');
    });
  }

  private async validatePlacementOperations(): Promise<void> {
    console.log('🏠 Validating Placement CRUD Operations...');
    
    // Test placement creation
    await this.validate('Placement Creation', async () => {
      if (this.testData.families.length === 0 || this.testData.children.length === 0) {
        throw new Error('Test families and children must be created first');
      }
      
      const family = this.testData.families[0];
      const child = this.testData.children[0];
      
      const placementData = {
        familyId: family.id,
        childId: child.id,
        startDate: new Date(),
        expectedDuration: 180, // 6 months
        goals: ['Validation goal 1', 'Validation goal 2'],
        requirements: ['Validation requirement'],
        budget: {
          monthlyAmount: 1200,
          specialNeedsSupport: 300,
          additionalBenefits: []
        }
      };
      
      const placement = await placementService.create(placementData);
      this.testData.placements.push(placement);
      
      if (!placement.id) throw new Error('Placement ID not generated');
      if (placement.familyId !== family.id) throw new Error('Family ID mismatch');
      if (placement.childId !== child.id) throw new Error('Child ID mismatch');
    });
    
    // Test placement reading
    await this.validate('Placement Reading', async () => {
      if (this.testData.placements.length === 0) throw new Error('No test placements available');
      
      const placement = this.testData.placements[0];
      const retrieved = await placementService.getById(placement.id);
      
      if (!retrieved) throw new Error('Placement not found');
      if (retrieved.id !== placement.id) throw new Error('Retrieved placement ID mismatch');
    });
    
    // Test placement updating
    await this.validate('Placement Updating', async () => {
      if (this.testData.placements.length === 0) throw new Error('No test placements available');
      
      const placement = this.testData.placements[0];
      const updates = {
        status: 'active' as const,
        goals: [...placement.goals, 'Validation goal 3']
      };
      
      const updated = await placementService.update(placement.id, updates);
      
      if (updated.status !== updates.status) throw new Error('Placement status not updated');
      if (updated.goals.length !== 3) throw new Error('Placement goals not updated');
      
      // Update local reference
      this.testData.placements[0] = updated;
    });
    
    // Test placement listing
    await this.validate('Placement Listing', async () => {
      const response = await placementService.list({ limit: 10 });
      
      if (!Array.isArray(response.data)) throw new Error('Placement list not an array');
      if (response.data.length === 0) throw new Error('No placements found');
    });
  }

  private async validateBudgetOperations(): Promise<void> {
    console.log('💰 Validating Budget Operations...');
    
    await this.validate('Budget Calculation', async () => {
      if (this.testData.placements.length === 0) throw new Error('No test placements available');
      
      const placement = this.testData.placements[0];
      const budget = await budgetService.calculateBudgetForPlacement(placement.id);
      
      if (!budget) throw new Error('Budget not calculated');
      if (budget.totalBudget <= 0) throw new Error('Invalid budget amount');
      if (budget.monthlyAmount <= 0) throw new Error('Invalid monthly amount');
    });
    
    await this.validate('Budget Overview', async () => {
      const overview = await budgetService.getBudgetOverview();
      
      if (!overview) throw new Error('Budget overview not available');
      if (overview.totalAllocated < 0) throw new Error('Invalid total allocated');
      if (overview.totalUsed < 0) throw new Error('Invalid total used');
    });
  }

  private async validateDataIntegrity(): Promise<void> {
    console.log('🔗 Validating Data Integrity...');
    
    await this.validate('Referential Integrity', async () => {
      if (this.testData.placements.length === 0) throw new Error('No test placements available');
      
      const placement = this.testData.placements[0];
      
      // Verify referenced family exists
      const family = await familyService.getById(placement.familyId);
      if (!family) throw new Error('Referenced family not found');
      
      // Verify referenced child exists
      const child = await childrenService.getById(placement.childId);
      if (!child) throw new Error('Referenced child not found');
      
      // Verify child status reflects placement
      if (child.status !== 'in_placement') {
        throw new Error('Child status not synchronized with placement');
      }
    });
    
    await this.validate('Data Synchronization', async () => {
      // Test that updates propagate correctly
      const placement = this.testData.placements[0];
      const child = await childrenService.getById(placement.childId);
      
      if (!child) throw new Error('Child not found for synchronization test');
      
      // Child should be in placement status
      if (child.status !== 'in_placement') {
        throw new Error('Child status not synchronized');
      }
    });
  }

  private async validateAuditCompliance(): Promise<void> {
    console.log('📝 Validating Audit Compliance...');
    
    await this.validate('Audit Logging', async () => {
      // Log a test audit event
      const auditLog = await auditService.logEvent({
        action: 'read',
        resource: 'child',
        resourceId: this.testData.children[0]?.id || 'test-child',
        details: {
          description: 'Validation audit test',
          sensitivity: 'medium',
          legalBasis: 'child_protection'
        }
      });
      
      if (!auditLog.id) throw new Error('Audit log not created');
      if (auditLog.action !== 'read') throw new Error('Audit action mismatch');
    });
  }

  private async validate(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name: testName,
        status: 'PASSED',
        duration,
        message: `✅ ${testName} completed successfully`
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        name: testName,
        status: 'FAILED',
        duration,
        message: `❌ ${testName} failed: ${message}`
      });
      
      console.error(`❌ ${testName} - FAILED (${duration}ms):`, error);
    }
  }

  private generateSummary(): ValidationSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      total,
      passed,
      failed,
      passRate: (passed / total) * 100,
      totalDuration,
      results: this.results,
      testData: this.testData
    };
  }
}

interface ValidationResult {
  name: string;
  status: 'PASSED' | 'FAILED';
  duration: number;
  message: string;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  totalDuration: number;
  results: ValidationResult[];
  testData: {
    users: User[];
    families: Family[];
    children: Child[];
    placements: Placement[];
  };
}

export const crudValidation = new CRUDValidation();