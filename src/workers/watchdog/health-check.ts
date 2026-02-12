import axios from 'axios';
import { nodeService } from '../../domain/nodes/node.service';
import { logger } from '../../core/logger';
import { db } from '../../core/database/couchbase';
import { IProxyNode } from '../../domain/nodes/node.entity';

export class Watchdog {
    
    async checkAllNodes() {
        logger.info('Watchdog: Starting health check cycle...');
        
        // 1. Fetch all nodes (In prod, use pagination or stream)
        const query = 'SELECT t.* FROM `edge_gateway`.`proxy_manager`.`nodes` as t';
        
        try {
            const scope = db.getScope();
            const result = await scope.query(query);
            
            const nodes: IProxyNode[] = result.rows;
            logger.info(`Watchdog: Checking ${nodes.length} nodes.`);
            
            for (const node of nodes) {
                await this.checkNode(node);
            }
            
        } catch (error) {
            logger.error('Watchdog: Failed to fetch nodes for check:', error);
        }
    }
    
    private async checkNode(node: IProxyNode) {
        const start = Date.now();
        try {
            // Real Logic: Probe the node. 
            // We expect the node to respond on its port.
            // Timeout set to 1000ms for fast feedback.
            await axios.get(`http://${node.ip}:${node.port}`, { timeout: 1000 });
            
            const latency = Date.now() - start;
            await nodeService.updateNodeStatus(node.id, 'active', latency);
            
        } catch (error) {
            // If connection fails, mark as dead.
            logger.warn(`Watchdog: Node ${node.id} failed check: ${(error as any).message}`);
            await nodeService.updateNodeStatus(node.id, 'dead', 0);
        }
    }
}

export const watchdog = new Watchdog();
