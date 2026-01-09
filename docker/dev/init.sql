-- PostgreSQL initialization script for dev container
-- Required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create test database
CREATE DATABASE testing OWNER dev_user;

-- Permissions
GRANT ALL PRIVILEGES ON DATABASE development TO dev_user;

GRANT ALL PRIVILEGES ON DATABASE testing TO dev_user;

-- Connect to development database
\c development;

-- Create auth schema for development and e2e tests
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL PRIVILEGES ON SCHEMA auth TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO dev_user;

-- Create messaging schema
CREATE SCHEMA IF NOT EXISTS messaging;
GRANT ALL PRIVILEGES ON SCHEMA messaging TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA messaging GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA messaging GRANT ALL ON SEQUENCES TO dev_user;

-- Create scheduling schema
CREATE SCHEMA IF NOT EXISTS scheduling;
GRANT ALL PRIVILEGES ON SCHEMA scheduling TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA scheduling GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA scheduling GRANT ALL ON SEQUENCES TO dev_user;

-- Permissions on public schema
GRANT CREATE ON SCHEMA public TO dev_user;

GRANT USAGE ON SCHEMA public TO dev_user;

-- Connect to testing database and create schemas
\c testing;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL PRIVILEGES ON SCHEMA auth TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO dev_user;

CREATE SCHEMA IF NOT EXISTS messaging;
GRANT ALL PRIVILEGES ON SCHEMA messaging TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA messaging GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA messaging GRANT ALL ON SEQUENCES TO dev_user;

CREATE SCHEMA IF NOT EXISTS scheduling;
GRANT ALL PRIVILEGES ON SCHEMA scheduling TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA scheduling GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA scheduling GRANT ALL ON SEQUENCES TO dev_user;

GRANT CREATE ON SCHEMA public TO dev_user;
GRANT USAGE ON SCHEMA public TO dev_user;
