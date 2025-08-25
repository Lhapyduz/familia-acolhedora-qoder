import { database } from '../lib/database.js';
import { supabaseDatabaseService } from './SupabaseService.js';
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
  PaginatedResponse
} from '../types/index.js';

/**
 * Hybrid Database Service
 * Combines local database with Supabase for data persistence
 */
class HybridDatabaseService {
  private static instance: HybridDatabaseService;
  private useSupabase: boolean = false;

  private constructor() {
    // Check if Supabase is configured
    this.useSupabase = supabaseDatabaseService.isConfigured();
    
    // If Supabase is configured, sync local data
    if (this.useSupabase) {
      this.syncLocalDataToSupabase();
    }
  }

  public static getInstance(): HybridDatabaseService {
    if (!HybridDatabaseService.instance) {
      HybridDatabaseService.instance = new HybridDatabaseService();
    }
    return HybridDatabaseService.instance;
  }

  // Set whether to use Supabase
  public setUseSupabase(use: boolean): void {
    this.useSupabase = use && supabaseDatabaseService.isConfigured();
  }

  // Get current mode
  public isUsingSupabase(): boolean {
    return this.useSupabase && supabaseDatabaseService.isConfigured();
  }

  // Sync local data to Supabase
  private async syncLocalDataToSupabase(): Promise<void> {
    if (!this.useSupabase) return;

    try {
      const localData = {
        users: database.getAllUsers(),
        families: database.getAllFamilies(),
        children: database.getAllChildren(),
        placements: database.getAllPlacements(),
        budget: database.getAllBudgets(),
        notifications: database.getAllNotifications(),
        documents: database.getAllDocuments(),
        matchings: database.getAllMatchings(),
        technicalVisits: database.getAllTechnicalVisits(),
        reportTemplates: database.getReportTemplates(),
        generatedReports: database.getGeneratedReports(),
        scheduledReports: database.getScheduledReports(),
        auditLogs: database.getAllAuditLogs()
      };

      await supabaseDatabaseService.syncLocalDataToSupabase(localData);
      console.log('Local data synced to Supabase successfully');
    } catch (error) {
      console.error('Error syncing local data to Supabase:', error);
    }
  }

  // Generic CRUD operations
  public async create<T extends { id: string }>(table: string, entity: T): Promise<T> {
    if (this.useSupabase) {
      // Use Supabase for persistence
      switch (table) {
        case 'users':
          await supabaseDatabaseService.upsertUser(entity);
          break;
        case 'families':
          await supabaseDatabaseService.upsertFamily(entity);
          break;
        case 'children':
          await supabaseDatabaseService.upsertChild(entity);
          break;
        case 'placements':
          await supabaseDatabaseService.upsertPlacement(entity);
          break;
        default:
          // For other tables, use local database
          return database.create(table as any, entity);
      }
    }
    
    // Always update local database for immediate access
    return database.create(table as any, entity);
  }

  public async getById<T extends { id: string }>(table: string, id: string): Promise<T | null> {
    if (this.useSupabase) {
      // Try to get from Supabase first
      let data: T | null = null;
      
      switch (table) {
        case 'users':
          data = await supabaseDatabaseService.getUserById(id) as T;
          break;
        case 'families':
          data = await supabaseDatabaseService.getFamilyById(id) as T;
          break;
        case 'children':
          data = await supabaseDatabaseService.getChildById(id) as T;
          break;
        case 'placements':
          data = await supabaseDatabaseService.getPlacementById(id) as T;
          break;
      }
      
      if (data) {
        return data;
      }
    }
    
    // Fall back to local database
    return database.getById(table as any, id);
  }

  public async update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): Promise<T> {
    if (this.useSupabase) {
      // Update in Supabase
      const existing = await this.getById<T>(table, id);
      if (existing) {
        const updated = { ...existing, ...updates, updatedAt: new Date() };
        
        switch (table) {
          case 'users':
            await supabaseDatabaseService.upsertUser(updated);
            break;
          case 'families':
            await supabaseDatabaseService.upsertFamily(updated);
            break;
          case 'children':
            await supabaseDatabaseService.upsertChild(updated);
            break;
          case 'placements':
            await supabaseDatabaseService.upsertPlacement(updated);
            break;
          default:
            // For other tables, use local database
            return database.update(table as any, id, updates);
        }
      }
    }
    
    // Always update local database for immediate access
    return database.update(table as any, id, updates);
  }

  public async delete(table: string, id: string): Promise<boolean> {
    if (this.useSupabase) {
      // In a real implementation, you might want to soft delete in Supabase
      // For now, we'll just use the local database
    }
    
    // Delete from local database
    return database.delete(table as any, id);
  }

  public async query<T extends { id: string }>(
    table: string, 
    options: any = {}
  ): Promise<PaginatedResponse<T>> {
    if (this.useSupabase) {
      // Query from Supabase
      let data: T[] = [];
      let total = 0;
      
      switch (table) {
        case 'users':
          data = await supabaseDatabaseService.getAllUsers() as T[];
          total = data.length;
          break;
        case 'families':
          data = await supabaseDatabaseService.getAllFamilies() as T[];
          total = data.length;
          break;
        case 'children':
          data = await supabaseDatabaseService.getAllChildren() as T[];
          total = data.length;
          break;
        case 'placements':
          data = await supabaseDatabaseService.getAllPlacements() as T[];
          total = data.length;
          break;
        default:
          // For other tables, use local database
          return database.query(table as any, options);
      }
      
      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 10;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      return {
        data: data.slice(startIndex, endIndex),
        total,
        page,
        limit,
        totalPages
      };
    }
    
    // Fall back to local database
    return database.query(table as any, options);
  }

  // Authentication methods
  public async signIn(email: string, password: string): Promise<any> {
    if (this.useSupabase) {
      return await supabaseDatabaseService.signIn(email, password);
    }
    
    // Local authentication fallback
    const users = database.getAllUsers();
    const user = users.find(u => u.email === email);
    
    if (user) {
      database.setCurrentUser(user);
      return { data: { user } };
    }
    
    return { error: 'Invalid credentials' };
  }

  public async signUp(email: string, password: string, name: string): Promise<any> {
    if (this.useSupabase) {
      return await supabaseDatabaseService.signUp(email, password, name);
    }
    
    // Local signup fallback
    const newUser: User = {
      id: database.generateId(),
      email,
      name,
      role: 'technician',
      permissions: [
        'families:read', 'families:write',
        'children:read', 'children:write',
        'matching:read',
        'budget:read'
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    database.create('users', newUser);
    database.setCurrentUser(newUser);
    
    return { data: { user: newUser } };
  }

  public async signOut(): Promise<any> {
    if (this.useSupabase) {
      return await supabaseDatabaseService.signOut();
    }
    
    // Local signout
    database.clearUserSession();
    return { success: true };
  }

  public async getCurrentUser(): Promise<User | null> {
    if (this.useSupabase) {
      const user = await supabaseDatabaseService.getCurrentUser();
      if (user) {
        // Convert Supabase user to our User type
        return {
          id: user.id,
          email: user.email || '',
          name: (user.user_metadata?.name as string) || 'Usuário',
          role: 'technician', // Default role, would be fetched from database
          permissions: [],
          isActive: true,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at || user.created_at)
        };
      }
    }
    
    // Fall back to local database
    return database.getCurrentUser();
  }

  // Listen for auth changes
  public onAuthStateChange(callback: (event: string, session: any) => void) {
    if (this.useSupabase) {
      return supabaseDatabaseService.onAuthStateChange(callback);
    }
    
    // For local database, we don't have real-time auth state changes
    return null;
  }

  // Specific getter methods for backward compatibility
  public getAllUsers(): User[] {
    return database.getAllUsers();
  }

  public getAllFamilies(): Family[] {
    return database.getAllFamilies();
  }

  public getAllChildren(): Child[] {
    return database.getAllChildren();
  }

  public getAllPlacements(): Placement[] {
    return database.getAllPlacements();
  }

  public getAllBudgets(): Budget[] {
    return database.getAllBudgets();
  }

  public getAllNotifications(): Notification[] {
    return database.getAllNotifications();
  }

  public getAllDocuments(): Document[] {
    return database.getAllDocuments();
  }

  public getAllMatchings(): Matching[] {
    return database.getAllMatchings();
  }

  public getAllTechnicalVisits(): TechnicalVisit[] {
    return database.getAllTechnicalVisits();
  }

  public getReportTemplates(): ReportTemplate[] {
    return database.getReportTemplates();
  }

  public getGeneratedReports(): GeneratedReport[] {
    return database.getGeneratedReports();
  }

  public getScheduledReports(): ScheduledReport[] {
    return database.getScheduledReports();
  }

  public getAllAuditLogs(): AuditLog[] {
    return database.getAllAuditLogs();
  }

  public getSettings(): Record<string, any> {
    return database.getSettings();
  }

  public updateSettings(settings: Record<string, any>): void {
    database.updateSettings(settings);
  }

  public getCurrentUserLocal(): User | null {
    return database.getCurrentUser();
  }

  public setCurrentUser(user: User | null): void {
    database.setCurrentUser(user);
  }

  public getAuthToken(): string | null {
    return database.getAuthToken();
  }

  public setAuthToken(token: string | null): void {
    database.setAuthToken(token);
  }

  public clearUserSession(): void {
    database.clearUserSession();
  }
}

// Export singleton instance
export const hybridDatabaseService = HybridDatabaseService.getInstance();
export default hybridDatabaseService;