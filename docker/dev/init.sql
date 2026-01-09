-- Script d'initialisation PostgreSQL pour dev container

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Créer la base de données de test
CREATE DATABASE testing OWNER dev_user;

-- Permissions
GRANT ALL PRIVILEGES ON DATABASE development TO dev_user;
GRANT ALL PRIVILEGES ON DATABASE testing TO dev_user;

-- Se connecter à la DB dev
\c development;

-- Créer le schéma auth pour le développement et les tests e2e
CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL PRIVILEGES ON SCHEMA auth TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO dev_user;

-- Permissions sur le schéma public
GRANT CREATE ON SCHEMA public TO dev_user;
GRANT USAGE ON SCHEMA public TO dev_user;

-- Se connecter à la DB test et créer le schéma auth
\c testing;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT ALL PRIVILEGES ON SCHEMA auth TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO dev_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO dev_user;

GRANT CREATE ON SCHEMA public TO dev_user;
GRANT USAGE ON SCHEMA public TO dev_user;
