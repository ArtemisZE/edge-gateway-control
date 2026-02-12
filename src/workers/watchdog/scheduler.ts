import { db } from '../../core/database/couchbase';
import { watchdog } from './health-check';
import { logger } from '../../core/logger';

const INTERVAL_MS = 10000; // 10 seconds

async function startScheduler() {
    await db.connect();
    
    logger.info('Watchdog Scheduler started.');
    
    setInterval(async () => {
        await watchdog.checkAllNodes();
    }, INTERVAL_MS);
}

// Allow standalone execution
if (require.main === module) {
    startScheduler();
}
