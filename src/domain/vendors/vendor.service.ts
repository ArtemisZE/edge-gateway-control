import { db } from '../../core/database/couchbase';
import { IVendorConfig } from './vendor.entity';
import { logger } from '../../core/logger';

export class VendorService {
  private collectionName = 'vendors';

  private get collection() {
    return db.getCollection(this.collectionName);
  }

  async getVendor(vendorId: string): Promise<IVendorConfig | null> {
    try {
      const result = await this.collection.get(vendorId);
      return result.content as IVendorConfig;
    } catch (error: any) {
        if (error.code === 13) return null;
        logger.error(`Failed to get vendor ${vendorId}:`, error);
        throw error;
    }
  }

  async registerVendor(vendor: IVendorConfig): Promise<void> {
      try {
          await this.collection.upsert(vendor.vendor_id, vendor);
          logger.info(`Vendor registered: ${vendor.vendor_id}`);
      } catch (error) {
          logger.error(`Failed to register vendor ${vendor.vendor_id}:`, error);
          throw error;
      }
  }
}

export const vendorService = new VendorService();
