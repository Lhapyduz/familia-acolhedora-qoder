import {
  authService,
  userService,
  familyService,
  childrenService,
  placementService,
  budgetService,
  notificationService,
  technicalVisitService,
  reportService,
  auditService
} from '../services/index.js';
import { database } from '../lib/database.js';
import type {
  User,
  Family,
  Child,
  Placement,
  CreateFamilyRequest,
  CreateChildRequest,
  TechnicalVisit,
  Budget,
  Notification,
  EntityId
} from '../types/index.js';

/**
 * Comprehensive System Integration Tests for Foster Family Management System
 * Tests all CRUD operations and data synchronization across the entire system
 */
export class SystemIntegrationTests {
  private testResults: TestResult[] = [];
  private testUsers: User[] = [];
  private testFamilies: Family[] = [];
  private testChildren: Child[] = [];
  private testPlacements: Placement[] = [];

  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 Starting Comprehensive System Integration Tests...');
    
    try {
      // Initialize test environment
      await this.setupTestEnvironment();
      
      // Run all test suites
      await this.testUserManagement();
      await this.testFamilyManagement();
      await this.testChildrenManagement();
      await this.testPlacementManagement();
      await this.testBudgetManagement();
      await this.testNotificationSystem();
      await this.testTechnicalVisits();
      await this.testReportingSystem();
      await this.testAuditLogging();
      await this.testDataSynchronization();
      await this.testSystemIntegration();
      
      // Cleanup test data
      await this.cleanupTestEnvironment();
      
      return this.generateTestSummary();
    } catch (error) {
      console.error('❌ Critical test failure:', error);
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    await this.runTest('Setup Test Environment', async () => {
      // Clear any existing test data
      await database.clearUserSession();
      
      // Create test coordinator user
      const coordinatorData = {
        email: 'test-coordinator@test.com',
        name: 'Test Coordinator',
        role: 'coordinator' as const,
        permissions: [
          'families:read', 'families:write', 'families:delete',
          'children:read', 'children:write', 'children:delete',
          'matching:read', 'matching:write',
          'budget:read', 'budget:write',
          'reports:read', 'reports:write',
          'settings:read', 'settings:write',
          'users:read', 'users:write', 'users:delete'
        ],
        isActive: true
      };
      
      const coordinator = await userService.createUser(coordinatorData);
      this.testUsers.push(coordinator);
      
      // Login as coordinator for tests
      await authService.login({
        email: 'test-coordinator@test.com',
        password: 'admin123',
        role: 'coordinator'
      });
      
      console.log('✅ Test environment setup complete');
    });
  }

  private async testUserManagement(): Promise<void> {
    console.log('👥 Testing User Management CRUD Operations...');
    
    // Test Create User
    await this.runTest('Create User', async () => {
      const userData = {
        email: 'test-technician@test.com',
        name: 'Test Technician',
        role: 'technician' as const,
        permissions: ['families:read', 'children:read', 'matching:read'],
        isActive: true
      };
      
      const user = await userService.createUser(userData);
      this.testUsers.push(user);
      
      this.assertNotNull(user.id, 'User ID should be generated');
      this.assertEqual(user.email, userData.email, 'User email should match');
      this.assertEqual(user.role, userData.role, 'User role should match');
    });
    
    // Test Read User
    await this.runTest('Read User', async () => {
      const user = this.testUsers[1]; // technician
      const retrievedUser = await userService.getById(user.id);
      
      this.assertNotNull(retrievedUser, 'User should be retrievable');
      this.assertEqual(retrievedUser!.id, user.id, 'Retrieved user ID should match');
      this.assertEqual(retrievedUser!.email, user.email, 'Retrieved user email should match');
    });
    
    // Test Update User
    await this.runTest('Update User', async () => {
      const user = this.testUsers[1]; // technician
      const updates = {
        name: 'Updated Test Technician',
        isActive: false
      };
      
      const updatedUser = await userService.updateUser(user.id, updates);
      
      this.assertEqual(updatedUser.name, updates.name, 'User name should be updated');
      this.assertEqual(updatedUser.isActive, updates.isActive, 'User status should be updated');
    });
    
    // Test List Users
    await this.runTest('List Users', async () => {
      const response = await userService.list({ limit: 10 });
      
      this.assertTrue(response.data.length >= 2, 'Should have at least 2 test users');
      this.assertTrue(response.total >= 2, 'Total count should be at least 2');
    });
  }

  private async testFamilyManagement(): Promise<void> {
    console.log('👨‍👩‍👧‍👦 Testing Family Management CRUD Operations...');
    
    // Test Create Family
    await this.runTest('Create Family', async () => {
      const familyData: CreateFamilyRequest = {
        primaryContact: {
          name: 'Test Family Silva',
          cpf: '123.456.789-00',
          phone: '(11) 98765-4321',
          email: 'familia.silva@test.com'
        },
        address: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brasil'
        },
        composition: [
          {
            name: 'João Silva',
            cpf: '123.456.789-00',
            birthDate: new Date('1980-01-01'),
            relationship: 'parent',
            occupation: 'Professor',
            income: 5000
          },
          {
            name: 'Maria Silva',
            cpf: '987.654.321-00',
            birthDate: new Date('1985-06-15'),
            relationship: 'parent',
            occupation: 'Enfermeira',
            income: 4500
          }
        ],
        preferences: {
          ageRange: { min: 5, max: 12 },
          gender: 'any',
          specialNeeds: true,
          maxChildren: 2,
          siblingGroups: true
        },
        limitations: []
      };
      
      const family = await familyService.create(familyData);
      this.testFamilies.push(family);
      
      this.assertNotNull(family.id, 'Family ID should be generated');
      this.assertEqual(family.primaryContact.name, familyData.primaryContact.name, 'Family name should match');
      this.assertEqual(family.status, 'under_evaluation', 'Initial status should be under_evaluation');
    });
    
    // Test Read Family
    await this.runTest('Read Family', async () => {
      const family = this.testFamilies[0];
      const retrievedFamily = await familyService.getById(family.id);
      
      this.assertNotNull(retrievedFamily, 'Family should be retrievable');
      this.assertEqual(retrievedFamily!.id, family.id, 'Retrieved family ID should match');
      this.assertEqual(retrievedFamily!.primaryContact.name, family.primaryContact.name, 'Family name should match');
    });
    
    // Test Update Family
    await this.runTest('Update Family', async () => {
      const family = this.testFamilies[0];
      const updates = {
        status: 'available' as const,
        limitations: ['No pets']
      };
      
      const updatedFamily = await familyService.update(family.id, updates);
      
      this.assertEqual(updatedFamily.status, updates.status, 'Family status should be updated');
      this.assertEqual(updatedFamily.limitations[0], updates.limitations[0], 'Limitations should be updated');
    });
    
    // Test List Families
    await this.runTest('List Families', async () => {
      const response = await familyService.list({ limit: 10 });
      
      this.assertTrue(response.data.length >= 1, 'Should have at least 1 test family');
      this.assertTrue(response.total >= 1, 'Total count should be at least 1');
    });
  }

  private async testChildrenManagement(): Promise<void> {
    console.log('👶 Testing Children Management CRUD Operations...');
    
    // Test Create Child
    await this.runTest('Create Child', async () => {
      const childData: CreateChildRequest = {
        personalInfo: {
          name: 'Ana Costa',
          birthDate: new Date('2015-03-20'),
          gender: 'female',
          cpf: '456.789.123-00',
          birthCertificate: 'BC123456789'
        },
        specialNeeds: {
          hasSpecialNeeds: true,
          healthConditions: ['Asma'],
          medications: ['Bombinha para asma'],
          educationalNeeds: ['Reforço escolar'],
          therapeuticNeeds: ['Fonoaudiologia']
        },
        familyBackground: {
          originFamily: 'Família Costa',
          siblings: [],
          communityTies: ['Escola Municipal'],
          culturalConsiderations: []
        },
        legalStatus: {
          courtOrder: 'Processo 123/2024',
          legalGuardian: 'Conselho Tutelar',
          caseWorker: 'Dr. Roberto Santos'
        }
      };
      
      const child = await childrenService.create(childData);
      this.testChildren.push(child);
      
      this.assertNotNull(child.id, 'Child ID should be generated');
      this.assertEqual(child.personalInfo.name, childData.personalInfo.name, 'Child name should match');
      this.assertEqual(child.status, 'awaiting', 'Initial status should be awaiting');
    });
    
    // Test Read Child
    await this.runTest('Read Child', async () => {
      const child = this.testChildren[0];
      const retrievedChild = await childrenService.getById(child.id);
      
      this.assertNotNull(retrievedChild, 'Child should be retrievable');
      this.assertEqual(retrievedChild!.id, child.id, 'Retrieved child ID should match');
      this.assertEqual(retrievedChild!.personalInfo.name, child.personalInfo.name, 'Child name should match');
    });
    
    // Test Update Child
    await this.runTest('Update Child', async () => {
      const child = this.testChildren[0];
      const updates = {
        specialNeeds: {
          ...child.specialNeeds,
          medications: ['Bombinha para asma', 'Vitamina D']
        }
      };
      
      const updatedChild = await childrenService.update(child.id, updates);
      
      this.assertEqual(updatedChild.specialNeeds.medications.length, 2, 'Should have 2 medications');
      this.assertTrue(
        updatedChild.specialNeeds.medications.includes('Vitamina D'),
        'Should include new medication'
      );
    });
    
    // Test List Children
    await this.runTest('List Children', async () => {
      const response = await childrenService.list({ limit: 10 });
      
      this.assertTrue(response.data.length >= 1, 'Should have at least 1 test child');
      this.assertTrue(response.total >= 1, 'Total count should be at least 1');
    });
  }

  private async testPlacementManagement(): Promise<void> {
    console.log('🏠 Testing Placement Management CRUD Operations...');
    
    // Test Create Placement
    await this.runTest('Create Placement', async () => {
      if (this.testFamilies.length === 0 || this.testChildren.length === 0) {
        throw new Error('Test families and children must be created first');
      }
      
      const family = this.testFamilies[0];
      const child = this.testChildren[0];
      
      const placementData = {
        familyId: family.id,
        childId: child.id,
        startDate: new Date(),
        expectedDuration: 365, // 1 year
        goals: ['Adaptação familiar', 'Desenvolvimento educacional'],
        requirements: ['Acompanhamento psicológico'],
        budget: {
          monthlyAmount: 1500,
          specialNeedsSupport: 500,
          additionalBenefits: []
        }
      };
      
      const placement = await placementService.create(placementData);
      this.testPlacements.push(placement);
      
      this.assertNotNull(placement.id, 'Placement ID should be generated');
      this.assertEqual(placement.familyId, family.id, 'Family ID should match');
      this.assertEqual(placement.childId, child.id, 'Child ID should match');
      this.assertEqual(placement.status, 'approximation', 'Initial status should be approximation');
    });
    
    // Test Read Placement
    await this.runTest('Read Placement', async () => {
      const placement = this.testPlacements[0];
      const retrievedPlacement = await placementService.getById(placement.id);
      
      this.assertNotNull(retrievedPlacement, 'Placement should be retrievable');
      this.assertEqual(retrievedPlacement!.id, placement.id, 'Retrieved placement ID should match');
      this.assertEqual(retrievedPlacement!.familyId, placement.familyId, 'Family ID should match');
    });
    
    // Test Update Placement
    await this.runTest('Update Placement', async () => {
      const placement = this.testPlacements[0];
      const updates = {
        status: 'active' as const,
        goals: [...placement.goals, 'Integração escolar']
      };
      
      const updatedPlacement = await placementService.update(placement.id, updates);
      
      this.assertEqual(updatedPlacement.status, updates.status, 'Placement status should be updated');
      this.assertEqual(updatedPlacement.goals.length, 3, 'Should have 3 goals');
    });
    
    // Test List Placements
    await this.runTest('List Placements', async () => {
      const response = await placementService.list({ limit: 10 });
      
      this.assertTrue(response.data.length >= 1, 'Should have at least 1 test placement');
      this.assertTrue(response.total >= 1, 'Total count should be at least 1');
    });
  }

  private async testBudgetManagement(): Promise<void> {
    console.log('💰 Testing Budget Management Operations...');
    
    await this.runTest('Budget Calculations', async () => {
      if (this.testPlacements.length === 0) {
        throw new Error('Test placement must be created first');
      }
      
      const placement = this.testPlacements[0];
      const budget = await budgetService.calculateBudgetForPlacement(placement.id);
      
      this.assertNotNull(budget, 'Budget should be calculated');
      this.assertTrue(budget.totalBudget > 0, 'Total budget should be positive');
      this.assertTrue(budget.monthlyAmount > 0, 'Monthly amount should be positive');
    });
    
    await this.runTest('Budget Overview', async () => {
      const overview = await budgetService.getBudgetOverview();
      
      this.assertNotNull(overview, 'Budget overview should be available');
      this.assertTrue(overview.totalAllocated >= 0, 'Total allocated should be non-negative');
      this.assertTrue(overview.totalUsed >= 0, 'Total used should be non-negative');
    });
  }

  private async testNotificationSystem(): Promise<void> {
    console.log('🔔 Testing Notification System...');
    
    await this.runTest('Create Notification', async () => {
      const coordinator = this.testUsers[0];
      
      const notification = await notificationService.createCustomReminder(
        coordinator.id,
        'Test Notification',
        'This is a test notification for system validation',
        new Date(),
        'medium'
      );
      
      this.assertNotNull(notification, 'Notification should be created');
      this.assertEqual(notification.userId, coordinator.id, 'User ID should match');
      this.assertEqual(notification.title, 'Test Notification', 'Title should match');
    });
    
    await this.runTest('List Notifications', async () => {
      const coordinator = this.testUsers[0];
      const notifications = await notificationService.getUserNotifications(coordinator.id);
      
      this.assertTrue(notifications.length > 0, 'Should have at least 1 notification');
    });
  }

  private async testTechnicalVisits(): Promise<void> {
    console.log('🏥 Testing Technical Visits Management...');
    
    await this.runTest('Create Technical Visit', async () => {
      if (this.testPlacements.length === 0) {
        throw new Error('Test placement must be created first');
      }
      
      const placement = this.testPlacements[0];
      const technician = this.testUsers[1]; // technician user
      
      const visitData: Omit<TechnicalVisit, 'id'> = {
        placementId: placement.id,
        visitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        technicianId: technician.id,
        purpose: 'Avaliação inicial de adaptação',
        observations: '',
        recommendations: [],
        followUpRequired: false
      };
      
      const visit = await technicalVisitService.create(visitData);
      
      this.assertNotNull(visit.id, 'Visit ID should be generated');
      this.assertEqual(visit.placementId, placement.id, 'Placement ID should match');
      this.assertEqual(visit.technicianId, technician.id, 'Technician ID should match');
    });
    
    await this.runTest('List Technical Visits', async () => {
      const response = await technicalVisitService.list({ limit: 10 });
      
      this.assertTrue(response.data.length >= 1, 'Should have at least 1 technical visit');
    });
  }

  private async testReportingSystem(): Promise<void> {
    console.log('📊 Testing Reporting System...');
    
    await this.runTest('Get Report Templates', async () => {
      const templates = await reportService.getTemplates();
      
      this.assertTrue(templates.length >= 0, 'Should return template list');
    });
    
    await this.runTest('Get Generated Reports', async () => {
      const reports = await reportService.getGeneratedReports();
      
      this.assertTrue(reports.length >= 0, 'Should return reports list');
    });
  }

  private async testAuditLogging(): Promise<void> {
    console.log('📝 Testing Audit Logging System...');
    
    await this.runTest('Audit Service Context', async () => {
      // Set audit context
      auditService.setContext({
        userId: this.testUsers[0].id,
        userEmail: this.testUsers[0].email,
        userName: this.testUsers[0].name,
        ipAddress: '127.0.0.1',
        source: 'web'
      });
      
      // Log test audit event
      const auditLog = await auditService.logEvent({
        action: 'read',
        resource: 'family',
        resourceId: this.testFamilies[0]?.id || 'test-id',
        details: {
          description: 'Test audit log for system validation',
          sensitivity: 'low',
          legalBasis: 'child_protection'
        }
      });
      
      this.assertNotNull(auditLog.id, 'Audit log ID should be generated');
      this.assertEqual(auditLog.action, 'read', 'Action should match');
      this.assertEqual(auditLog.resource, 'family', 'Resource should match');
    });
  }

  private async testDataSynchronization(): Promise<void> {
    console.log('🔄 Testing Data Synchronization...');
    
    await this.runTest('Cross-Reference Data Integrity', async () => {
      if (this.testPlacements.length === 0) {
        throw new Error('Test placement must be created first');
      }
      
      const placement = this.testPlacements[0];
      
      // Verify family exists and references are consistent
      const family = await familyService.getById(placement.familyId);
      this.assertNotNull(family, 'Referenced family should exist');
      
      // Verify child exists and references are consistent
      const child = await childrenService.getById(placement.childId);
      this.assertNotNull(child, 'Referenced child should exist');
      
      // Check child status was updated when placement was created
      this.assertTrue(
        child!.status === 'in_placement',
        'Child status should reflect placement'
      );
    });
    
    await this.runTest('Database Consistency', async () => {
      // Test that database operations maintain consistency
      const allFamilies = database.getAllFamilies();
      const allChildren = database.getAllChildren();
      const allPlacements = database.getAllPlacements();
      
      this.assertTrue(allFamilies.length > 0, 'Should have families in database');
      this.assertTrue(allChildren.length > 0, 'Should have children in database');
      this.assertTrue(allPlacements.length > 0, 'Should have placements in database');
      
      // Verify referential integrity
      for (const placement of allPlacements) {
        const familyExists = allFamilies.some(f => f.id === placement.familyId);
        const childExists = allChildren.some(c => c.id === placement.childId);
        
        this.assertTrue(familyExists, `Family ${placement.familyId} should exist`);
        this.assertTrue(childExists, `Child ${placement.childId} should exist`);
      }
    });
  }

  private async testSystemIntegration(): Promise<void> {
    console.log('🔗 Testing System Integration...');
    
    await this.runTest('End-to-End Workflow', async () => {
      // Test complete workflow: Family registration → Child registration → Matching → Placement
      console.log('Testing complete foster care workflow...');
      
      // Verify all components are properly integrated
      this.assertTrue(this.testFamilies.length > 0, 'Families should be created');
      this.assertTrue(this.testChildren.length > 0, 'Children should be created');
      this.assertTrue(this.testPlacements.length > 0, 'Placements should be created');
      
      // Test that services can work together
      const placement = this.testPlacements[0];
      const budget = await budgetService.calculateBudgetForPlacement(placement.id);
      
      this.assertTrue(budget.totalBudget > 0, 'Budget calculation should work with placement');
    });
    
    await this.runTest('System Performance', async () => {
      const startTime = Date.now();
      
      // Perform multiple operations to test performance
      await Promise.all([
        familyService.list({ limit: 5 }),
        childrenService.list({ limit: 5 }),
        placementService.list({ limit: 5 }),
        userService.list({ limit: 5 })
      ]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.assertTrue(duration < 5000, 'System should respond within 5 seconds');
      console.log(`✅ System performance test completed in ${duration}ms`);
    });
  }

  private async cleanupTestEnvironment(): Promise<void> {
    await this.runTest('Cleanup Test Environment', async () => {
      // Clean up test data in reverse order to maintain referential integrity
      for (const placement of this.testPlacements) {
        await placementService.delete(placement.id);
      }
      
      for (const child of this.testChildren) {
        await childrenService.delete(child.id);
      }
      
      for (const family of this.testFamilies) {
        await familyService.delete(family.id);
      }
      
      // Note: Keep test users for audit trail, but mark as inactive
      for (const user of this.testUsers) {
        if (user.email.includes('test')) {
          await userService.updateUser(user.id, { isActive: false });
        }
      }
      
      // Clear session
      await authService.logout();
      
      console.log('✅ Test environment cleanup complete');
    });
  }

  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    let result: TestResult;
    
    try {
      await testFunction();
      const duration = Date.now() - startTime;
      result = {
        name: testName,
        status: 'PASSED',
        duration,
        message: `Test completed successfully in ${duration}ms`
      };
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      result = {
        name: testName,
        status: 'FAILED',
        duration,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error : new Error('Unknown error')
      };
      console.error(`❌ ${testName} - FAILED (${duration}ms):`, error);
    }
    
    this.testResults.push(result);
  }

  private generateTestSummary(): TestSummary {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    return {
      total,
      passed,
      failed,
      passRate: (passed / total) * 100,
      totalDuration,
      results: this.testResults
    };
  }

  // Assertion helper methods
  private assertNotNull(value: any, message: string): void {
    if (value === null || value === undefined) {
      throw new Error(`Assertion failed: ${message} (got ${value})`);
    }
  }

  private assertEqual(actual: any, expected: any, message: string): void {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
    }
  }

  private assertTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }
}

// Type definitions for test framework
interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED';
  duration: number;
  message: string;
  error?: Error;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  totalDuration: number;
  results: TestResult[];
}

// Export the test runner
export const systemTests = new SystemIntegrationTests();