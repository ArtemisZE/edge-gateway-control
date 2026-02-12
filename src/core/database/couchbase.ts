import * as couchbase from 'couchbase';
import { config } from '../../config/env';
import { logger } from '../logger';

// --- Mock Implementation ---
class MockCollection {
    private data = new Map<string, any>();
    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    async upsert(key: string, value: any): Promise<void> {
        this.data.set(key, { content: value });
    }

    async get(key: string): Promise<{ content: any }> {
        const item = this.data.get(key);
        if (!item) {
            const error: any = new Error('Document not found');
            error.code = 13; // KeyNotFound
            throw error;
        }
        return item;
    }

    async mutateIn(key: string, specs: any[]): Promise<void> {
        const item = await this.get(key);
        const content = item.content;
        
        for (const spec of specs) {
            // Very basic path handling (top-level only for mock)
            if (spec.op === 'replace') {
                content[spec.path] = spec.value;
            }
        }
        this.data.set(key, { content });
    }
    
    // Helper for query access
    _getAll(): any[] {
        return Array.from(this.data.values()).map(v => v.content);
    }
}

class MockScope {
    private collections = new Map<string, MockCollection>();

    collection(name: string): any {
        if (!this.collections.has(name)) {
            this.collections.set(name, new MockCollection(name));
        }
        return this.collections.get(name);
    }

    async query(statement: string, options?: any): Promise<{ rows: any[] }> {
        // Very basic mock query parser
        // Logic: Extract collection name, filter by status if present
        
        // This is a specialized mock for our specific queries
        let rows: any[] = [];
        
        if (statement.includes('`nodes`')) {
            const collection = this.collection('nodes');
            rows = collection._getAll();
            
            // Filter implementation
            if (statement.includes("status = 'active'")) {
                rows = rows.filter(r => r.status === 'active');
            }
            
            // Sort implementation (latency ASC)
            if (statement.includes("ORDER BY t.latency ASC")) {
                rows.sort((a, b) => (a.latency || 0) - (b.latency || 0));
            }
            
            // Limit
            if (statement.includes("LIMIT 1")) {
                rows = rows.slice(0, 1);
            }
        }
        
        return { rows };
    }
}
// ---------------------------

class Database {
  private static instance: Database;
  private cluster: couchbase.Cluster | null = null;
  private bucket: couchbase.Bucket | null = null;
  private scope: couchbase.Scope | null = null;
  
  // Mock Storage
  private mockScope: MockScope | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (config.MOCK_MODE) {
        logger.info('Initializing Mock Database (In-Memory)...');
        this.mockScope = new MockScope();
        return;
    }

    if (this.cluster) return;

    try {
      this.cluster = await couchbase.connect(config.CB_CONNECTION_STRING, {
        username: config.CB_USERNAME,
        password: config.CB_PASSWORD,
      });

      this.bucket = this.cluster.bucket(config.CB_BUCKET_NAME);
      this.scope = this.bucket.scope(config.CB_SCOPE_NAME);

      logger.info('Connected to Couchbase successfully.');
    } catch (error) {
      logger.error('Failed to connect to Couchbase:', error);
      process.exit(1);
    }
  }

  public getScope(): couchbase.Scope | any {
    if (config.MOCK_MODE) {
        return this.mockScope;
    }
    if (!this.scope) {
      throw new Error('Database not initialized. Call connect() first.');
    }
    return this.scope;
  }
  
  public getCollection(name: string): couchbase.Collection | any {
      if (config.MOCK_MODE) {
          return this.mockScope?.collection(name);
      }
      return this.getScope().collection(name);
  }

  public async close(): Promise<void> {
    if (this.cluster) {
      await this.cluster.close();
      this.cluster = null;
      logger.info('Couchbase connection closed.');
    }
  }
}

export const db = Database.getInstance();
