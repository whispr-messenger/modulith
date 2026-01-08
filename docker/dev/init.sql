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

-- Note: La création du schéma auth est maintenant gérée par les migrations TypeORM
-- Voir src/migrations/1736349600000-CreateAuthSchema.ts

-- Permissions sur le schéma public
GRANT CREATE ON SCHEMA public TO dev_user;
GRANT USAGE ON SCHEMA public TO dev_user;
