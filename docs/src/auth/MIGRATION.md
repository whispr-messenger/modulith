# Database Migrations

## Overview

This service uses TypeORM migrations to manage database schema changes in production. The migration system ensures that database tables are created and updated automatically without manual intervention.

## Configuration

### Environment Variables

- `DB_MIGRATIONS_RUN`: Set to `"true"` to automatically run migrations on application startup
- `DB_SYNCHRONIZE`: Set to `"false"` in production to disable automatic schema synchronization

### Production Setup

In `docker-compose.prod.yml`, the following environment variables are configured:

```yaml
DB_MIGRATIONS_RUN: "true"
DB_SYNCHRONIZE: "false"
```

## Migration Files

### Initial Migration

The initial migration `1700000000000-CreateInitialTables.ts` creates all necessary tables:

- `users_auth`: User authentication data
- `devices`: User devices and sessions
- `prekeys`: Signal protocol prekeys
- `signed_prekeys`: Signal protocol signed prekeys
- `identity_keys`: Signal protocol identity keys
- `backup_codes`: Two-factor authentication backup codes
- `login_history`: User login history

## Development Commands

```bash
# Generate a new migration
npm run migration:generate -- src/migrations/MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert
```

## Production Deployment

When deploying to production:

1. Migrations run automatically on application startup
2. No manual database setup is required
3. The application will create all necessary tables and indexes
4. Database schema changes are applied incrementally

## Database Initialization

The `init.sql` file provides:

- Database extensions (uuid-ossp, pgcrypto)
- Performance indexes
- Utility functions and triggers

Migrations handle table creation and schema management.