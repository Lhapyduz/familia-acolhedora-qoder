import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/index.js';

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Database Service
class SupabaseDatabaseService {
  private static instance: SupabaseDatabaseService;

  private constructor() {
    // Initialize Supabase client
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('Supabase credentials not found. Using local database only.');
    }
  }

  public static getInstance(): SupabaseDatabaseService {
    if (!SupabaseDatabaseService.instance) {
      SupabaseDatabaseService.instance = new SupabaseDatabaseService();
    }
    return SupabaseDatabaseService.instance;
  }

  // Check if Supabase is configured
  public isConfigured(): boolean {
    return SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';
  }

  // Sync local data to Supabase
  public async syncLocalDataToSupabase(localData: any): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Supabase not configured. Skipping sync.');
      return false;
    }

    try {
      // Sync users
      if (localData.users && localData.users.length > 0) {
        for (const user of localData.users) {
          await this.upsertUser(user);
        }
      }

      // Sync families
      if (localData.families && localData.families.length > 0) {
        for (const family of localData.families) {
          await this.upsertFamily(family);
        }
      }

      // Sync children
      if (localData.children && localData.children.length > 0) {
        for (const child of localData.children) {
          await this.upsertChild(child);
        }
      }

      // Sync placements
      if (localData.placements && localData.placements.length > 0) {
        for (const placement of localData.placements) {
          await this.upsertPlacement(placement);
        }
      }

      console.log('Local data synced to Supabase successfully');
      return true;
    } catch (error) {
      console.error('Error syncing local data to Supabase:', error);
      return false;
    }
  }

  // User operations
  public async upsertUser(user: any): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting user:', error);
      return null;
    }

    return data;
  }

  public async getUserById(id: string): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;
  }

  public async getAllUsers(): Promise<any[]> {
    if (!this.isConfigured()) return [];

    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  }

  // Family operations
  public async upsertFamily(family: any): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('families')
      .upsert(family, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting family:', error);
      return null;
    }

    return data;
  }

  public async getFamilyById(id: string): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('families')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching family:', error);
      return null;
    }

    return data;
  }

  public async getAllFamilies(): Promise<any[]> {
    if (!this.isConfigured()) return [];

    const { data, error } = await supabase
      .from('families')
      .select('*');

    if (error) {
      console.error('Error fetching families:', error);
      return [];
    }

    return data || [];
  }

  // Child operations
  public async upsertChild(child: any): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('children')
      .upsert(child, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting child:', error);
      return null;
    }

    return data;
  }

  public async getChildById(id: string): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching child:', error);
      return null;
    }

    return data;
  }

  public async getAllChildren(): Promise<any[]> {
    if (!this.isConfigured()) return [];

    const { data, error } = await supabase
      .from('children')
      .select('*');

    if (error) {
      console.error('Error fetching children:', error);
      return [];
    }

    return data || [];
  }

  // Placement operations
  public async upsertPlacement(placement: any): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('placements')
      .upsert(placement, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting placement:', error);
      return null;
    }

    return data;
  }

  public async getPlacementById(id: string): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data, error } = await supabase
      .from('placements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching placement:', error);
      return null;
    }

    return data;
  }

  public async getAllPlacements(): Promise<any[]> {
    if (!this.isConfigured()) return [];

    const { data, error } = await supabase
      .from('placements')
      .select('*');

    if (error) {
      console.error('Error fetching placements:', error);
      return [];
    }

    return data || [];
  }

  // Authentication methods
  public async signIn(email: string, password: string): Promise<any> {
    if (!this.isConfigured()) return { error: 'Supabase not configured' };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      return { error };
    }

    return { data };
  }

  public async signUp(email: string, password: string, name: string): Promise<any> {
    if (!this.isConfigured()) return { error: 'Supabase not configured' };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        }
      }
    });

    if (error) {
      console.error('Sign up error:', error);
      return { error };
    }

    return { data };
  }

  public async signOut(): Promise<any> {
    if (!this.isConfigured()) return { error: 'Supabase not configured' };

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      return { error };
    }

    return { success: true };
  }

  public async getCurrentUser(): Promise<any> {
    if (!this.isConfigured()) return null;

    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Listen for auth changes
  public onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!this.isConfigured()) return null;

    return supabase.auth.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const supabaseDatabaseService = SupabaseDatabaseService.getInstance();
export default supabaseDatabaseService;