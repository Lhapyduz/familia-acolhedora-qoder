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
  EntityId,
  PaginatedResponse
} from '../types/index.js';

// Database schema versioning
const DB_VERSION = 1;
const DB_NAME = 'familia_acolhedora_db';

// Storage keys
const STORAGE_KEYS = {
  USERS: 'users',
  FAMILIES: 'families',
  CHILDREN: 'children',
  PLACEMENTS: 'placements',
  BUDGET: 'budget',
  NOTIFICATIONS: 'notifications',
  DOCUMENTS: 'documents',
  MATCHINGS: 'matchings',
  TECHNICAL_VISITS: 'technical_visits',
  REPORT_TEMPLATES: 'report_templates',
  GENERATED_REPORTS: 'generated_reports',
  SCHEDULED_REPORTS: 'scheduled_reports',
  AUDIT_LOGS: 'audit_logs',
  STATUS_HISTORY: 'status_history',
  PENDING_STATUS_CHANGES: 'pending_status_changes',
  SETTINGS: 'settings',
  DB_VERSION: 'db_version',
  CURRENT_USER: 'current_user',
  AUTH_TOKEN: 'auth_token'
} as const;

// Database interface
export interface Database {
  users: User[];
  families: Family[];
  children: Child[];
  placements: Placement[];
  budget: Budget[];
  notifications: Notification[];
  documents: Document[];
  matchings: Matching[];
  technicalVisits: TechnicalVisit[];
  reportTemplates: ReportTemplate[];
  generatedReports: GeneratedReport[];
  scheduledReports: ScheduledReport[];
  auditLogs: AuditLog[];
  settings: Record<string, any>;
}

// Query options
export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Transaction interface
export interface Transaction {
  id: string;
  timestamp: Date;
  operations: Operation[];
  status: 'pending' | 'committed' | 'rolled_back';
}

export interface Operation {
  type: 'create' | 'update' | 'delete';
  table: keyof Database;
  id: string;
  data?: any;
  previousData?: any;
}

// Local Database class
class LocalDatabase {
  private static instance: LocalDatabase;
  private transactions: Map<string, Transaction> = new Map();
  private auditLog: Operation[] = [];

  private constructor() {
    this.initializeDatabase();
    this.setupEventListeners();
  }

  public static getInstance(): LocalDatabase {
    if (!LocalDatabase.instance) {
      LocalDatabase.instance = new LocalDatabase();
    }
    return LocalDatabase.instance;
  }

  private initializeDatabase(): void {
    try {
      const version = this.getStorageItem(STORAGE_KEYS.DB_VERSION);
      if (!version || parseInt(version) < DB_VERSION) {
        this.migrateDatabase();
      }
      this.validateDataIntegrity();
    } catch (error) {
      console.error('Database initialization failed:', error);
      this.resetDatabase();
    }
  }

  private setupEventListeners(): void {
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key && Object.values(STORAGE_KEYS).includes(e.key as any)) {
        // Trigger data refresh event
        window.dispatchEvent(new CustomEvent('data-changed', {
          detail: { key: e.key, newValue: e.newValue }
        }));
      }
    });

    // Setup periodic backup
    setInterval(() => {
      this.backupData();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private migrateDatabase(): void {
    console.log('Migrating database to version', DB_VERSION);
    
    // Backup current data
    this.backupData();
    
    // Initialize default data if needed
    this.initializeDefaultData();
    
    // Update version
    this.setStorageItem(STORAGE_KEYS.DB_VERSION, DB_VERSION.toString());
  }

  private initializeDefaultData(): void {
    // Initialize empty arrays if not exist
    const defaultData: Partial<Database> = {
      users: [],
      families: [],
      children: [],
      placements: [],
      budget: [],
      notifications: [],
      documents: [],
      matchings: [],
      technicalVisits: [],
      reportTemplates: [],
      generatedReports: [],
      scheduledReports: [],
      auditLogs: [],
      settings: {
        minimumWage: 1320, // 2024 Brazilian minimum wage
        siblingMultiplier: 0.30,
        specialNeedsMultiplier: 0.50,
        fiscalYear: new Date().getFullYear()
      }
    };

    Object.entries(defaultData).forEach(([key, value]) => {
      if (!this.getStorageItem(key as keyof typeof STORAGE_KEYS)) {
        this.setStorageItem(key as keyof typeof STORAGE_KEYS, JSON.stringify(value));
      }
    });

    // Create default coordinator user if no users exist
    const users = this.getAllUsers();
    if (users.length === 0) {
      const defaultUser: User = {
        id: this.generateId(),
        email: 'admin@familiacolhedora.gov.br',
        name: 'Administrador',
        role: 'coordinator',
        permissions: [
          'families:read', 'families:write', 'families:delete',
          'children:read', 'children:write', 'children:delete',
          'matching:read', 'matching:write',
          'budget:read', 'budget:write',
          'reports:read', 'reports:write',
          'settings:read', 'settings:write',
          'users:read', 'users:write'
        ],
        isActive: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.create('users', defaultUser);
    }
  }

  private validateDataIntegrity(): void {
    try {
      // Validate each storage item
      Object.values(STORAGE_KEYS).forEach(key => {
        if (key === STORAGE_KEYS.DB_VERSION || key === STORAGE_KEYS.CURRENT_USER || key === STORAGE_KEYS.AUTH_TOKEN) {
          return;
        }
        
        const data = this.getStorageItem(key);
        if (data) {
          JSON.parse(data);
        }
      });
    } catch (error) {
      console.error('Data integrity validation failed:', error);
      throw new Error('Database corruption detected');
    }
  }

  private resetDatabase(): void {
    console.warn('Resetting database due to corruption');
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    this.initializeDatabase();
  }

  private backupData(): void {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: DB_VERSION,
        data: this.exportAllData()
      };
      localStorage.setItem(`backup_${Date.now()}`, JSON.stringify(backup));
      
      // Keep only last 5 backups
      this.cleanupOldBackups();
    } catch (error) {
      console.error('Backup failed:', error);
    }
  }

  private cleanupOldBackups(): void {
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('backup_'))
      .sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]));

    if (backupKeys.length > 5) {
      backupKeys.slice(5).forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  private exportAllData(): Database {
    return {
      users: this.getAllUsers(),
      families: this.getAllFamilies(),
      children: this.getAllChildren(),
      placements: this.getAllPlacements(),
      budget: this.getAllBudgets(),
      notifications: this.getAllNotifications(),
      documents: this.getAllDocuments(),
      matchings: this.getAllMatchings(),
      technicalVisits: this.getAllTechnicalVisits(),
      reportTemplates: this.getReportTemplates(),
      generatedReports: this.getGeneratedReports(),
      scheduledReports: this.getScheduledReports(),
      settings: this.getSettings()
    };
  }

  private getStorageItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get storage item ${key}:`, error);
      return null;
    }
  }

  private setStorageItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set storage item ${key}:`, error);
      throw error;
    }
  }

  public generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generic CRUD operations
  public create<T extends { id: string }>(table: keyof Database, entity: T): T {
    const data = this.getTableData<T>(table);
    entity.id = entity.id || this.generateId();
    
    if (data.some(item => item.id === entity.id)) {
      throw new Error(`Entity with id ${entity.id} already exists in ${table}`);
    }
    
    data.push(entity);
    this.setTableData(table, data);
    this.logOperation('create', table, entity.id, entity);
    
    return entity;
  }

  public getById<T extends { id: string }>(table: keyof Database, id: string): T | null {
    const data = this.getTableData<T>(table);
    return data.find(item => item.id === id) || null;
  }

  public update<T extends { id: string }>(table: keyof Database, id: string, updates: Partial<T>): T {
    const data = this.getTableData<T>(table);
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Entity with id ${id} not found in ${table}`);
    }
    
    const previousData = { ...data[index] };
    data[index] = { ...data[index], ...updates, updatedAt: new Date() } as T;
    
    this.setTableData(table, data);
    this.logOperation('update', table, id, data[index], previousData);
    
    return data[index];
  }

  public delete(table: keyof Database, id: string): boolean {
    const data = this.getTableData(table);
    const index = data.findIndex((item: any) => item.id === id);
    
    if (index === -1) {
      return false;
    }
    
    const deletedEntity = data[index];
    data.splice(index, 1);
    this.setTableData(table, data);
    this.logOperation('delete', table, id, undefined, deletedEntity);
    
    return true;
  }

  public query<T extends { id: string }>(
    table: keyof Database, 
    options: QueryOptions = {}
  ): PaginatedResponse<T> {
    let data = this.getTableData<T>(table);
    
    // Apply filters
    if (options.filters) {
      data = this.applyFilters(data, options.filters);
    }
    
    // Apply sorting
    if (options.sortBy) {
      data = this.applySorting(data, options.sortBy, options.sortOrder || 'asc');
    }
    
    // Apply pagination
    const page = options.page || 1;
    const limit = options.limit || 10;
    const total = data.length;
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

  private getTableData<T>(table: keyof Database): T[] {
    const key = this.getStorageKey(table);
    const data = this.getStorageItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setTableData<T>(table: keyof Database, data: T[]): void {
    const key = this.getStorageKey(table);
    this.setStorageItem(key, JSON.stringify(data));
  }

  private getStorageKey(table: keyof Database): string {
    const keyMap: Record<keyof Database, string> = {
      users: STORAGE_KEYS.USERS,
      families: STORAGE_KEYS.FAMILIES,
      children: STORAGE_KEYS.CHILDREN,
      placements: STORAGE_KEYS.PLACEMENTS,
      budget: STORAGE_KEYS.BUDGET,
      notifications: STORAGE_KEYS.NOTIFICATIONS,
      documents: STORAGE_KEYS.DOCUMENTS,
      matchings: STORAGE_KEYS.MATCHINGS,
      technicalVisits: STORAGE_KEYS.TECHNICAL_VISITS,
      reportTemplates: STORAGE_KEYS.REPORT_TEMPLATES,
      generatedReports: STORAGE_KEYS.GENERATED_REPORTS,
      scheduledReports: STORAGE_KEYS.SCHEDULED_REPORTS,
      settings: STORAGE_KEYS.SETTINGS
    };
    return keyMap[table];
  }

  private applyFilters<T>(data: T[], filters: Record<string, any>): T[] {
    return data.filter(item => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        
        const itemValue = (item as any)[key];
        
        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }
        
        if (typeof value === 'object' && value !== null) {
          // Handle range filters
          if ('min' in value && 'max' in value) {
            const numValue = typeof itemValue === 'string' ? parseFloat(itemValue) : itemValue;
            return numValue >= value.min && numValue <= value.max;
          }
        }
        
        if (typeof value === 'string' && typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }
        
        return itemValue === value;
      });
    });
  }

  private applySorting<T>(data: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
    return [...data].sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private logOperation(
    type: Operation['type'],
    table: keyof Database,
    id: string,
    data?: any,
    previousData?: any
  ): void {
    const operation: Operation = {
      type,
      table,
      id,
      data,
      previousData
    };
    
    this.auditLog.push(operation);
    
    // Keep audit log to reasonable size
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-500);
    }
  }

  // Specific getter methods
  public getAllUsers(): User[] {
    return this.getTableData<User>('users');
  }

  public getAllFamilies(): Family[] {
    return this.getTableData<Family>('families');
  }

  public getAllChildren(): Child[] {
    return this.getTableData<Child>('children');
  }

  public getAllPlacements(): Placement[] {
    return this.getTableData<Placement>('placements');
  }

  public getAllBudgets(): Budget[] {
    return this.getTableData<Budget>('budget');
  }

  public getAllNotifications(): Notification[] {
    return this.getTableData<Notification>('notifications');
  }

  public getAllDocuments(): Document[] {
    return this.getTableData<Document>('documents');
  }

  public getAllMatchings(): Matching[] {
    return this.getTableData<Matching>('matchings');
  }

  public getAllTechnicalVisits(): TechnicalVisit[] {
    return this.getTableData<TechnicalVisit>('technicalVisits');
  }

  public getReportTemplates(): ReportTemplate[] {
    return this.getTableData<ReportTemplate>('reportTemplates');
  }

  public saveReportTemplates(templates: ReportTemplate[]): void {
    this.setTableData('reportTemplates', templates);
  }

  public getGeneratedReports(): GeneratedReport[] {
    return this.getTableData<GeneratedReport>('generatedReports');
  }

  public saveGeneratedReports(reports: GeneratedReport[]): void {
    this.setTableData('generatedReports', reports);
  }

  public getScheduledReports(): ScheduledReport[] {
    return this.getTableData<ScheduledReport>('scheduledReports');
  }

  public saveScheduledReports(scheduledReports: ScheduledReport[]): void {
    this.setTableData('scheduledReports', scheduledReports);
  }

  public getAllAuditLogs(): AuditLog[] {
    return this.getTableData<AuditLog>('auditLogs');
  }

  public saveAuditLogs(auditLogs: AuditLog[]): void {
    this.setTableData('auditLogs', auditLogs);
  }

  public getSettings(): Record<string, any> {
    const data = this.getStorageItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {};
  }

  public updateSettings(settings: Record<string, any>): void {
    this.setStorageItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Authentication helpers
  public getCurrentUser(): User | null {
    try {
      const userData = this.getStorageItem(STORAGE_KEYS.CURRENT_USER);
      if (!userData) return null;
      
      const user = JSON.parse(userData);
      // Validate user structure
      if (user && user.id && user.email && user.role && Array.isArray(user.permissions)) {
        return user;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  public setCurrentUser(user: User | null): void {
    if (user) {
      this.setStorageItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  public getAuthToken(): string | null {
    return this.getStorageItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  public setAuthToken(token: string | null): void {
    if (token) {
      this.setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  }

  // Clear all data (for logout)
  public clearUserSession(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  public getAuditLog(): Operation[] {
    return [...this.auditLog];
  }

  // Status management methods
  public getStatusHistory(): any[] {
    try {
      const data = this.getStorageItem(STORAGE_KEYS.STATUS_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get status history:', error);
      return [];
    }
  }

  public setStatusHistory(history: any[]): void {
    this.setStorageItem(STORAGE_KEYS.STATUS_HISTORY, JSON.stringify(history));
  }

  public getPendingStatusChanges(): any[] {
    try {
      const data = this.getStorageItem(STORAGE_KEYS.PENDING_STATUS_CHANGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get pending status changes:', error);
      return [];
    }
  }

  public setPendingStatusChanges(changes: any[]): void {
    this.setStorageItem(STORAGE_KEYS.PENDING_STATUS_CHANGES, JSON.stringify(changes));
  }
}

// Export singleton instance
export const database = LocalDatabase.getInstance();
export default database;