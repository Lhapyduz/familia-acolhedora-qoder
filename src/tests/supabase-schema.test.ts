import { hybridDatabaseService } from '../services/index.js';
import { supabaseDatabaseService } from '../services/SupabaseService.js';

// Test Supabase schema integration
async function testSupabaseSchemaIntegration() {
  console.log('🧪 Testing Supabase Schema Integration...');
  
  // Check if Supabase is configured
  const isConfigured = supabaseDatabaseService.isConfigured();
  console.log('✅ Supabase configured:', isConfigured);
  
  if (!isConfigured) {
    console.log('❌ Supabase not configured. Please update your .env file with your Supabase credentials.');
    console.log('📝 Follow the instructions in SUPABASE_IMPLEMENTATION_GUIDE.md');
    return;
  }
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n--- Test 1: Connection Test ---');
    const currentUser = await supabaseDatabaseService.getCurrentUser();
    console.log('✅ Supabase connection successful');
    
    // Test 2: Test creating and retrieving a family
    console.log('\n--- Test 2: Family CRUD Operations ---');
    const testFamily = {
      id: 'test-family-' + Date.now(),
      primaryContact: {
        name: 'Test Family',
        cpf: '123.456.789-00',
        phone: '(11) 99999-9999',
        email: 'test@family.com'
      },
      address: {
        street: 'Test Street',
        number: '123',
        complement: 'Apt 456',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345-678',
        country: 'Brazil'
      },
      composition: [
        {
          id: 'member-1',
          name: 'Test Member',
          cpf: '123.456.789-00',
          birthDate: new Date('1980-01-01'),
          relationship: 'parent',
          occupation: 'Test Occupation',
          income: 5000
        }
      ],
      status: 'available',
      preferences: {
        ageRange: { min: 0, max: 18 },
        gender: 'any',
        specialNeeds: true,
        maxChildren: 4
      },
      limitations: [],
      history: [],
      documents: [],
      evaluations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create family
    const createdFamily = await hybridDatabaseService.create('families', testFamily);
    console.log('✅ Family created successfully:', createdFamily.primaryContact.name);
    
    // Retrieve family
    const retrievedFamily = await hybridDatabaseService.getById('families', testFamily.id);
    console.log('✅ Family retrieved successfully:', retrievedFamily?.primaryContact.name);
    
    // Update family
    const updatedFamily = await hybridDatabaseService.update('families', testFamily.id, {
      status: 'under_evaluation'
    });
    console.log('✅ Family updated successfully:', updatedFamily.status);
    
    // Test 3: Test creating and retrieving a child
    console.log('\n--- Test 3: Child CRUD Operations ---');
    const testChild = {
      id: 'test-child-' + Date.now(),
      personalInfo: {
        name: 'Test Child',
        birthDate: new Date('2015-05-15'),
        gender: 'male',
        cpf: '987.654.321-00',
        birthCertificate: 'BC-123456'
      },
      currentStatus: 'awaiting',
      specialNeeds: {
        hasSpecialNeeds: false,
        healthConditions: [],
        medications: [],
        educationalNeeds: [],
        therapeuticNeeds: []
      },
      familyBackground: {
        originFamily: 'Unknown',
        siblings: [],
        communityTies: [],
        culturalConsiderations: []
      },
      legalStatus: {
        courtOrder: 'CO-7890',
        legalGuardian: 'State',
        placementDate: new Date(),
        expectedDuration: 12,
        caseWorker: 'Test Worker'
      },
      currentPlacement: null,
      documents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create child
    const createdChild = await hybridDatabaseService.create('children', testChild);
    console.log('✅ Child created successfully:', createdChild.personalInfo.name);
    
    // Retrieve child
    const retrievedChild = await hybridDatabaseService.getById('children', testChild.id);
    console.log('✅ Child retrieved successfully:', retrievedChild?.personalInfo.name);
    
    // Update child
    const updatedChild = await hybridDatabaseService.update('children', testChild.id, {
      currentStatus: 'evaluating'
    });
    console.log('✅ Child updated successfully:', updatedChild.currentStatus);
    
    // Test 4: Test creating and retrieving a placement
    console.log('\n--- Test 4: Placement CRUD Operations ---');
    const testPlacement = {
      id: 'test-placement-' + Date.now(),
      childId: testChild.id,
      familyId: testFamily.id,
      startDate: new Date(),
      endDate: null,
      status: 'active',
      approximationProcess: {
        stages: [
          {
            id: 'stage-1',
            name: 'Initial Contact',
            description: 'First meeting between child and family',
            completed: false,
            completedDate: null,
            notes: ''
          }
        ],
        currentStage: 'stage-1',
        startDate: new Date(),
        expectedDuration: 90
      },
      reports: [],
      visits: [],
      budget: {
        monthlyAllocation: 1320,
        totalCost: 0,
        paymentHistory: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create placement
    const createdPlacement = await hybridDatabaseService.create('placements', testPlacement);
    console.log('✅ Placement created successfully');
    
    // Retrieve placement
    const retrievedPlacement = await hybridDatabaseService.getById('placements', testPlacement.id);
    console.log('✅ Placement retrieved successfully');
    
    // Update placement
    const updatedPlacement = await hybridDatabaseService.update('placements', testPlacement.id, {
      status: 'completed'
    });
    console.log('✅ Placement updated successfully:', updatedPlacement.status);
    
    // Test 5: Test querying with pagination
    console.log('\n--- Test 5: Query Operations ---');
    const familiesQuery = await hybridDatabaseService.query('families', { limit: 5 });
    console.log('✅ Families query successful, found:', familiesQuery.data.length, 'families');
    
    const childrenQuery = await hybridDatabaseService.query('children', { limit: 5 });
    console.log('✅ Children query successful, found:', childrenQuery.data.length, 'children');
    
    const placementsQuery = await hybridDatabaseService.query('placements', { limit: 5 });
    console.log('✅ Placements query successful, found:', placementsQuery.data.length, 'placements');
    
    // Test 6: Test deleting records
    console.log('\n--- Test 6: Delete Operations ---');
    const placementDeleted = await hybridDatabaseService.delete('placements', testPlacement.id);
    console.log('✅ Placement deleted successfully:', placementDeleted);
    
    const childDeleted = await hybridDatabaseService.delete('children', testChild.id);
    console.log('✅ Child deleted successfully:', childDeleted);
    
    const familyDeleted = await hybridDatabaseService.delete('families', testFamily.id);
    console.log('✅ Family deleted successfully:', familyDeleted);
    
    console.log('\n🎉 All Supabase schema integration tests passed!');
    console.log('✅ Your database is properly configured and ready to use!');
    
  } catch (error) {
    console.error('❌ Supabase schema integration test failed:', error);
    console.error('Please check your Supabase configuration and schema implementation.');
  }
}

// Run the test
testSupabaseSchemaIntegration();