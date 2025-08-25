import { hybridDatabaseService as database } from '../services/index.js';
import type { 
  EntityId, 
  PaginatedResponse, 
  QueryOptions,
  Database
} from '../types/index.js';

// Base repository interface
export interface Repository<T extends { id: string }, TCreate, TUpdate> {
  findAll(options?: QueryOptions): Promise<PaginatedResponse<T>>;
  findById(id: EntityId): Promise<T | null>;
  create(entity: TCreate): Promise<T>;
  update(id: EntityId, updates: TUpdate): Promise<T>;
  delete(id: EntityId): Promise<boolean>;
  count(filters?: Record<string, any>): Promise<number>;
}

// Base repository implementation
export abstract class BaseRepository<T extends { id: string }, TCreate, TUpdate> 
  implements Repository<T, TCreate, TUpdate> {
  
  protected abstract tableName: keyof Database;

  async findAll(options: QueryOptions = {}): Promise<PaginatedResponse<T>> {
    try {
      return database.query<T>(this.tableName, options);
    } catch (error) {
      console.error(`Error finding all ${this.tableName}:`, error);
      throw new Error(`Failed to retrieve ${this.tableName}`);
    }
  }

  async findById(id: EntityId): Promise<T | null> {
    try {
      return database.getById<T>(this.tableName, id);
    } catch (error) {
      console.error(`Error finding ${this.tableName} by id ${id}:`, error);
      throw new Error(`Failed to retrieve ${this.tableName} with id ${id}`);
    }
  }

  async create(entityData: TCreate): Promise<T> {
    try {
      const entity = {
        id: database.generateId(),
        ...entityData,
        createdAt: new Date(),
        updatedAt: new Date()
      } as T;

      return database.create<T>(this.tableName, entity);
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}`);
    }
  }

  async update(id: EntityId, updates: TUpdate): Promise<T> {
    try {
      const updatedEntity = database.update<T>(this.tableName, id, {
        ...updates,
        updatedAt: new Date()
      } as Partial<T>);
      
      return updatedEntity;
    } catch (error) {
      console.error(`Error updating ${this.tableName} with id ${id}:`, error);
      throw new Error(`Failed to update ${this.tableName} with id ${id}`);
    }
  }

  async delete(id: EntityId): Promise<boolean> {
    try {
      return database.delete(this.tableName, id);
    } catch (error) {
      console.error(`Error deleting ${this.tableName} with id ${id}:`, error);
      throw new Error(`Failed to delete ${this.tableName} with id ${id}`);
    }
  }

  async count(filters: Record<string, any> = {}): Promise<number> {
    try {
      const result = await this.findAll({ filters, limit: 1 });
      return result.total;
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw new Error(`Failed to count ${this.tableName}`);
    }
  }

  protected async findWhere(filters: Record<string, any>): Promise<T[]> {
    try {
      const result = await this.findAll({ filters, limit: 1000 });
      return result.data;
    } catch (error) {
      console.error(`Error finding ${this.tableName} with filters:`, error);
      throw new Error(`Failed to find ${this.tableName} with filters`);
    }
  }
}

// Error classes
export class RepositoryError extends Error {
  constructor(message: string, public readonly repository: string, public readonly operation: string) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export class NotFoundError extends RepositoryError {
  constructor(repository: string, id: string) {
    super(`${repository} with id ${id} not found`, repository, 'find');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends RepositoryError {
  constructor(repository: string, message: string) {
    super(message, repository, 'validation');
    this.name = 'ValidationError';
  }
}