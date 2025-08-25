import { hybridDatabaseService } from '../services/index.js';
import { supabaseDatabaseService } from '../services/SupabaseService.js';

// Test Supabase integration
async function testSupabaseIntegration() {
  console.log('Testing Supabase integration...');
  
  // Check if Supabase is configured
  const isConfigured = supabaseDatabaseService.isConfigured();
  console.log('Supabase configured:', isConfigured);
  
  if (isConfigured) {
    // Test creating a user
    const testUser = {
      id: 'test-user-' + Date.now(),
      email: 'test@example.com',
      name: 'Test User',
      role: 'technician',
      permissions: ['families:read', 'children:read'],
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // Test creating user in hybrid database
      const createdUser = await hybridDatabaseService.create('users', testUser);
      console.log('User created successfully:', createdUser);
      
      // Test retrieving user
      const retrievedUser = await hybridDatabaseService.getById('users', testUser.id);
      console.log('User retrieved successfully:', retrievedUser);
      
      // Test updating user
      const updatedUser = await hybridDatabaseService.update('users', testUser.id, {
        name: 'Updated Test User'
      });
      console.log('User updated successfully:', updatedUser);
      
      // Test deleting user
      const deleted = await hybridDatabaseService.delete('users', testUser.id);
      console.log('User deleted successfully:', deleted);
      
      console.log('All Supabase integration tests passed!');
    } catch (error) {
      console.error('Supabase integration test failed:', error);
    }
  } else {
    console.log('Supabase not configured. Skipping integration tests.');
    console.log('To enable Supabase integration:');
    console.log('1. Create a Supabase project at https://supabase.com');
    console.log('2. Update the .env file with your Supabase credentials');
    console.log('3. Create the required database tables using the SQL commands in SUPABASE_SETUP.md');
  }
}

// Run the test
testSupabaseIntegration();