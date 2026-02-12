import { FastifyInstance } from 'fastify';
import { nodeService } from '../../domain/nodes/node.service';
import { vendorService } from '../../domain/vendors/vendor.service';
import { z } from 'zod';

const selectNodeSchema = z.object({
    vendor_id: z.string(),
    api_key: z.string()
});

export async function apiRoutes(server: FastifyInstance) {
    
    server.post('/launcher/select-node', async (request, reply) => {
        try {
            // 1. Validate Input
            const body = selectNodeSchema.parse(request.body);
            
            // 2. Authenticate Vendor
            const vendor = await vendorService.getVendor(body.vendor_id);
            if (!vendor || vendor.api_key !== body.api_key) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }
            
            // 3. Select Node
            // Logic: Filter by vendor allowed/blocked countries if implemented
            const bestNode = await nodeService.getBestNode();
            
            if (!bestNode) {
                return reply.code(503).send({ error: 'No active nodes available' });
            }
            
            // 4. Return Node
            return {
                node_ip: bestNode.ip,
                node_port: bestNode.port,
                protocol: bestNode.protocol,
                session_token: 'generated_token_here' // Placeholder for session management
            };
            
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: error.errors });
            }
            request.log.error(error);
            return reply.code(500).send({ error: 'Internal Server Error' });
        }
    });

    server.get('/health', async () => {
        return { status: 'ok' };
    });
}
