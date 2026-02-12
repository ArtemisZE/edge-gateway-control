import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  CB_CONNECTION_STRING: z.string().default('couchbase://localhost'),
  CB_USERNAME: z.string().default('Administrator'),
  CB_PASSWORD: z.string().default('password'),
  CB_BUCKET_NAME: z.string().default('edge_gateway'),
  CB_SCOPE_NAME: z.string().default('proxy_manager'),
  PORT: z.string().transform(Number).default('3000'),
  LOG_LEVEL: z.string().default('info'),
  MOCK_MODE: z.string().default('false').transform((val) => val === 'true'),
});

export const config = envSchema.parse(process.env);
