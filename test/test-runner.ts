import { db } from '../src/core/database/couchbase';
import { nodeService } from '../src/domain/nodes/node.service';
import { vendorService } from '../src/domain/vendors/vendor.service';
import { watchdog } from '../src/workers/watchdog/health-check';
import { app } from '../src/api/server';
import { config } from '../src/config/env';
import { logger } from '../src/core/logger';
import axios from 'axios';

// Force MOCK_MODE for testing
config.MOCK_MODE = true;

async function runTests() {
  logger.info('--- Starting Robust Test Suite ---');

  // 1. Initialize Mock Database
  await db.connect();
  logger.info('✅ Database Initialized (Mock Mode)');

  // 2. Setup Test Data
  const testVendor = {
    vendor_id: 'vendor_test_001',
    name: 'Test Vendor Inc.',
    allowed_countries: ['US', 'DE'],
    blocked_countries: [],
    api_key: 'secret_api_key_123'
  };
  
  const testNode1: any = {
    id: 'node_test_001',
    ip: '192.168.1.10',
    port: 8080,
    protocol: 'http',
    status: 'active',
    latency: 50,
    lastChecked: Date.now(),
    country: 'DE'
  };

  const testNode2: any = {
    id: 'node_test_002',
    ip: '192.168.1.11',
    port: 8080,
    protocol: 'http',
    status: 'active',
    latency: 200, // Slower
    lastChecked: Date.now(),
    country: 'US'
  };
  
  await vendorService.registerVendor(testVendor);
  await nodeService.registerNode(testNode1);
  await nodeService.registerNode(testNode2);
  logger.info('✅ Test Data Registered');

  // 3. Start API Server
  try {
      await app.listen({ port: 3001, host: '0.0.0.0' });
      logger.info('✅ API Server Started on 3001');
  } catch (e) {
      logger.error('Failed to start server:', e);
      process.exit(1);
  }

  // 4. Test Case: Select Best Node
  logger.info('--- Test Case 1: Select Best Node ---');
  try {
      const response = await axios.post('http://localhost:3001/launcher/select-node', {
          vendor_id: 'vendor_test_001',
          api_key: 'secret_api_key_123'
      });
      
      if (response.status === 200 && response.data.node_ip === '192.168.1.10') {
          logger.info('✅ SUCCESS: Best node selected (Lowest Latency)');
      } else {
          logger.error('❌ FAILURE: Wrong node selected', response.data);
          process.exit(1);
      }
  } catch (e) {
      logger.error('❌ FAILURE: API Request Failed', e);
      process.exit(1);
  }

  // 5. Test Case: Watchdog Health Check (Simulate Node Failure)
  logger.info('--- Test Case 2: Watchdog Failure Simulation ---');
  
  // Directly simulate a check failure scenario by running watchdog logic
  // Since watchdog pings real IPs (which fail in mock env), it should mark nodes as DEAD
  // But wait, the watchdog implementation currently pings IPs.
  // We need to verify that a failed ping updates the DB status to 'dead'
  
  // Let's modify the node service to confirm the status change after watchdog runs.
  // In our Mock environment, axios calls to 192.168.1.10 will fail (timeout or unreachable).
  // So running watchdog.checkAllNodes() should mark them dead.
  
  await watchdog.checkAllNodes();
  
  const nodeCheck = await nodeService.getNode('node_test_001');
  if (nodeCheck && nodeCheck.status === 'dead') {
      logger.info('✅ SUCCESS: Watchdog marked unreachable node as DEAD');
  } else {
      logger.error('❌ FAILURE: Watchdog did not update node status correctly', nodeCheck);
      process.exit(1);
  }

  // 6. Test Case: Select Node (Should Fail now)
  logger.info('--- Test Case 3: Failover / No Nodes Available ---');
  try {
      await axios.post('http://localhost:3001/launcher/select-node', {
          vendor_id: 'vendor_test_001',
          api_key: 'secret_api_key_123'
      });
      logger.error('❌ FAILURE: API should have returned 503');
      process.exit(1);
  } catch (e: any) {
      if (e.response && e.response.status === 503) {
          logger.info('✅ SUCCESS: API returned 503 Service Unavailable correctly');
      } else {
          logger.error('❌ FAILURE: Unexpected error code', e.response?.status);
          process.exit(1);
      }
  }

  logger.info('--- All Tests Passed Successfully ---');
  
  await app.close();
  process.exit(0);
}

runTests().catch(e => {
    logger.error('Unhandled error:', e);
    process.exit(1);
});
