import { db } from '../../core/database/couchbase';
import { IProxyNode } from './node.entity';
import { logger } from '../../core/logger';

export class NodeService {
  private collectionName = 'nodes';

  private get collection() {
    return db.getCollection(this.collectionName);
  }

  async registerNode(node: IProxyNode): Promise<void> {
    try {
      await this.collection.upsert(node.id, node);
      logger.info(`Node registered: ${node.id}`);
    } catch (error) {
      logger.error(`Failed to register node ${node.id}:`, error);
      throw error;
    }
  }

  async getNode(id: string): Promise<IProxyNode | null> {
    try {
      const result = await this.collection.get(id);
      return result.content as IProxyNode;
    } catch (error: any) {
        if (error.code === 13) return null; // Key not found
        logger.error(`Failed to get node ${id}:`, error);
        throw error;
    }
  }

  async updateNodeStatus(id: string, status: IProxyNode['status'], latency: number): Promise<void> {
    try {
        // Sub-document update for performance
        await this.collection.mutateIn(id, [
            { op: 'replace', path: 'status', value: status } as any, // casting to any due to SDK type quirks sometimes
            { op: 'replace', path: 'latency', value: latency } as any,
            { op: 'replace', path: 'lastChecked', value: Date.now() } as any
        ]);
        logger.debug(`Node ${id} updated: status=${status}, latency=${latency}`);
    } catch (error) {
         logger.error(`Failed to update node ${id}:`, error);
    }
  }
  
  async getBestNode(country?: string): Promise<IProxyNode | null> {
      // In a real scenario, this would use a N1QL query to find:
      // SELECT * FROM `edge_gateway`.`proxy_manager`.`nodes` 
      // WHERE status = 'active' AND latency < 200 
      // ORDER BY latency ASC LIMIT 1
      
      // For this implementation, we will mock a simple fetch or assume we have a way to query.
      // Since we don't have the full N1QL setup in the mock, I'll simulate retrieving a known node or list.
      // *Wait, I am instructed to build robust.*
      // I will implement a basic N1QL query execution.
      
      const query = `
        SELECT t.* FROM \`edge_gateway\`.\`proxy_manager\`.\`nodes\` as t
        WHERE t.status = 'active'
        ${country ? `AND t.country = $country` : ''}
        ORDER BY t.latency ASC
        LIMIT 1
      `;
      
      try {
          const scope = db.getScope();
          const options: any = { parameters: {} };
          if(country) options.parameters.country = country;

          const result = await scope.query(query, options);
          if (result.rows.length > 0) {
              return result.rows[0] as IProxyNode;
          }
          return null;
      } catch (error) {
          logger.error('Failed to query best node:', error);
          return null;
      }
  }
}

export const nodeService = new NodeService();
