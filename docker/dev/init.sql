-- Script d'initialisation PostgreSQL pour dev container

-- Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Créer la base de données de test
CREATE DATABASE testing OWNER whispr_scheduling;

-- Permissions
GRANT ALL PRIVILEGES ON DATABASE whispr_scheduling TO whispr_scheduling;

GRANT ALL PRIVILEGES ON DATABASE testing TO whispr_scheduling;

-- Se connecter à la DB dev
\c whispr_scheduling;

-- Créer le schéma et les permissions
GRANT CREATE ON SCHEMA public TO whispr_scheduling;

GRANT USAGE ON SCHEMA public TO whispr_scheduling;

---