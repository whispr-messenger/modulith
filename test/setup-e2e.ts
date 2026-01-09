/**
 * E2E Test Setup
 * Sets environment variables for tests to connect to localhost database
 */

import { webcrypto } from 'crypto';

// Polyfill for crypto in Jest environment (required by TypeORM)
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USERNAME = 'dev_user';
process.env.DB_PASSWORD = 'dev_password';
process.env.DB_NAME = 'development';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_LOGGING = 'false';
process.env.DB_MIGRATIONS_RUN = 'false';

// JWT Configuration (test values)
process.env.JWT_ACCESS_SECRET = 'test-ecdsa-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_VERIFICATION_SECRET = 'test-verification-secret';

// Demo mode for tests (bypasses SMS verification)
process.env.DEMO_MODE = 'true';

// Redis configuration
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Node environment
process.env.NODE_ENV = 'test';
