# Conception de la Base de Données - Service d'Authentification

## Sommaire

- [1. Introduction et Principes de Conception](#1-introduction-et-principes-de-conception)
  - [1.1 Objectif](#11-objectif)
  - [1.2 Principes Architecturaux](#12-principes-architecturaux)
  - [1.3 Technologie](#13-technologie)
- [2. Schéma PostgreSQL du Service d'Authentification](#2-schéma-postgresql-du-service-dauthentification)
  - [2.1 Vue d'Ensemble](#21-vue-densemble)
  - [2.2 Description des Tables](#22-description-des-tables)
- [3. Données Temporaires dans Redis](#3-données-temporaires-dans-redis)
  - [3.1 Vue d'Ensemble](#31-vue-densemble)
  - [3.2 Description des Structures Redis](#32-description-des-structures-redis)
- [4. Relations avec les Autres Services](#4-relations-avec-les-autres-services)
  - [4.1 Démarcation des Responsabilités](#41-démarcation-des-responsabilités)
  - [4.2 Synchronisation des Données](#42-synchronisation-des-données)
- [5. Considérations de Sécurité](#5-considérations-de-sécurité)
  - [5.1 Chiffrement des Données Sensibles](#51-chiffrement-des-données-sensibles)
  - [5.2 Hachage des Secrets](#52-hachage-des-secrets)
  - [5.3 Audit et Logging](#53-audit-et-logging)
- [6. Considérations de Performance](#6-considérations-de-performance)
  - [6.1 Indexation](#61-indexation)
  - [6.2 Partitionnement](#62-partitionnement)
  - [6.3 Optimisations Redis](#63-optimisations-redis)
- [7. Migrations et Évolution du Schéma](#7-migrations-et-évolution-du-schéma)
  - [7.1 Stratégie de Migration](#71-stratégie-de-migration)
- [8. Scripts SQL d'Initialisation](#8-scripts-sql-dinitialisation)
  - [8.1 Création du Schéma PostgreSQL](#81-création-du-schéma-postgresql)
- [9. Communication Inter-Services](#9-communication-inter-services)
  - [9.1 Événements et Synchronisation](#91-événements-et-synchronisation)
  - [9.2 Gestion des Références Externes](#92-gestion-des-références-externes)

## 1. Introduction et Principes de Conception

### 1.1 Objectif
Ce document décrit la structure de la base de données du service d'authentification (auth-service) de l'application Whispr, en détaillant les modèles de données, les relations, et les considérations de performance.

### 1.2 Principes Architecturaux
- **Séparation des domaines**: Chaque service gère ses propres données dans sa propre base de données
- **Dénormalisation contrôlée**: Duplication minimale des données nécessaires à l'autonomie du service
- **Haute performance**: Optimisation pour les opérations d'authentification fréquentes
- **Sécurité par conception**: Attention particulière au stockage sécurisé des données sensibles

### 1.3 Technologie
- **PostgreSQL**: Pour les données persistantes d'authentification
- **Redis**: Pour les données temporaires (codes de vérification, sessions, challenges)

## 2. Schéma PostgreSQL du Service d'Authentification

### 2.1 Vue d'Ensemble

```mermaid
erDiagram
    USERS_AUTH ||--o{ DEVICES : "possède"
    USERS_AUTH ||--o{ PREKEYS : "possède"
    USERS_AUTH ||--o{ SIGNED_PREKEYS : "possède"
    USERS_AUTH ||--o{ IDENTITY_KEYS : "possède"
    USERS_AUTH ||--o{ BACKUP_CODES : "possède"
    USERS_AUTH ||--o{ LOGIN_HISTORY : "possède"
    DEVICES ||--o{ LOGIN_HISTORY : "utilisé lors de"
    
    USERS_AUTH {
        uuid id PK
        string phoneNumber UK
        string twoFactorSecret
        boolean twoFactorEnabled
        timestamp lastAuthenticatedAt
        timestamp createdAt
        timestamp updatedAt
    }
    
    DEVICES {
        uuid id PK
        uuid userId FK
        string deviceName
        string deviceType
        string deviceFingerprint UK
        string model
        string osVersion
        string appVersion
        string fcmToken
        string apnsToken
        text publicKey
        timestamp lastActive
        string ipAddress
        boolean isVerified
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }
    
    PREKEYS {
        uuid id PK
        uuid userId FK
        int keyId
        string publicKey
        boolean isOneTime
        boolean isUsed
        timestamp createdAt
    }
    
    SIGNED_PREKEYS {
        uuid id PK
        uuid userId FK
        int keyId
        string publicKey
        string signature
        timestamp createdAt
        timestamp expiresAt
    }
    
    IDENTITY_KEYS {
        uuid id PK
        uuid userId FK
        string publicKey
        string privateKeyEncrypted
        timestamp createdAt
        timestamp updatedAt
    }
    
    BACKUP_CODES {
        uuid id PK
        uuid userId FK
        string codeHash
        boolean used
        timestamp createdAt
        timestamp usedAt
    }
    
    LOGIN_HISTORY {
        uuid id PK
        uuid userId FK
        uuid deviceId FK
        string ipAddress
        string userAgent
        timestamp createdAt
        string status
    }
```

### 2.2 Description des Tables

#### 2.2.1 USERS_AUTH
Stocke les informations minimales nécessaires pour l'authentification des utilisateurs.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique de l'utilisateur | PK, NOT NULL |
| phoneNumber | VARCHAR(20) | Numéro de téléphone au format E.164 | UNIQUE, NOT NULL |
| twoFactorSecret | VARCHAR(255) | Secret TOTP pour l'authentification à deux facteurs | ENCRYPTED, NULL |
| twoFactorEnabled | BOOLEAN | Indique si l'authentification à deux facteurs est activée | NOT NULL, DEFAULT FALSE |
| lastAuthenticatedAt | TIMESTAMP | Date/heure de la dernière authentification réussie | NULL |
| createdAt | TIMESTAMP | Date/heure de création du compte | NOT NULL |
| updatedAt | TIMESTAMP | Date/heure de la dernière mise à jour | NOT NULL |

**Indices**:
- PRIMARY KEY sur `id`
- UNIQUE sur `phoneNumber`
- INDEX sur `phoneNumber` pour les recherches fréquentes

#### 2.2.2 DEVICES
Stocke les informations sur les appareils associés à un compte utilisateur.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique de l'appareil | PK, NOT NULL |
| userId | UUID | Référence à l'utilisateur propriétaire | FK (USERS_AUTH.id), NOT NULL |
| deviceName | VARCHAR(100) | Nom de l'appareil | NOT NULL |
| deviceType | VARCHAR(20) | Type d'appareil (iOS, Android, Web) | NOT NULL |
| deviceFingerprint | VARCHAR(255) | Empreinte unique de l'appareil | UNIQUE, NOT NULL |
| model | VARCHAR(100) | Modèle de l'appareil | NULL |
| osVersion | VARCHAR(50) | Version du système d'exploitation | NULL |
| appVersion | VARCHAR(20) | Version de l'application | NULL |
| fcmToken | VARCHAR(255) | Token pour les notifications push Android | NULL |
| apnsToken | VARCHAR(255) | Token pour les notifications push iOS | NULL |
| publicKey | TEXT | Clé publique de l'appareil pour le chiffrement | NOT NULL |
| lastActive | TIMESTAMP | Dernière activité de l'appareil | NOT NULL |
| ipAddress | VARCHAR(45) | Dernière adresse IP connue | NULL |
| isVerified | BOOLEAN | Indique si l'appareil a été vérifié | NOT NULL, DEFAULT FALSE |
| isActive | BOOLEAN | Indique si l'appareil est actif | NOT NULL, DEFAULT TRUE |
| createdAt | TIMESTAMP | Date/heure d'ajout de l'appareil | NOT NULL |
| updatedAt | TIMESTAMP | Date/heure de la dernière mise à jour | NOT NULL |

**Indices**:
- PRIMARY KEY sur `id`
- FOREIGN KEY sur `userId` → `users_auth(id)`
- UNIQUE sur `deviceFingerprint`
- INDEX sur `userId` pour les jointures fréquentes
- INDEX sur `lastActive` pour faciliter le nettoyage des appareils inactifs
- INDEX sur `isActive` pour filtrer les appareils actifs

#### 2.2.3 PREKEYS
Stocke les clés préalables (pre-keys) pour le protocole Signal.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique de la clé | PK, NOT NULL |
| userId | UUID | Référence à l'utilisateur propriétaire | FK (USERS_AUTH.id), NOT NULL |
| keyId | INTEGER | Identifiant de la clé dans le protocole | NOT NULL |
| publicKey | TEXT | Clé publique encodée | NOT NULL |
| isOneTime | BOOLEAN | Indique s'il s'agit d'une clé à usage unique | NOT NULL, DEFAULT TRUE |
| isUsed | BOOLEAN | Indique si la clé a déjà été utilisée | NOT NULL, DEFAULT FALSE |
| createdAt | TIMESTAMP | Date/heure de création | NOT NULL |

**Indices**:
- PRIMARY KEY sur `id`
- UNIQUE sur `(userId, keyId)` pour éviter les doublons
- INDEX sur `userId` pour les recherches

#### 2.2.4 SIGNED_PREKEYS
Stocke les clés préalables signées pour le protocole Signal.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique de la clé | PK, NOT NULL |
| userId | UUID | Référence à l'utilisateur propriétaire | FK (USERS_AUTH.id), NOT NULL |
| keyId | INTEGER | Identifiant de la clé dans le protocole | NOT NULL |
| publicKey | TEXT | Clé publique encodée | NOT NULL |
| signature | TEXT | Signature cryptographique | NOT NULL |
| createdAt | TIMESTAMP | Date/heure de création | NOT NULL |
| expiresAt | TIMESTAMP | Date/heure d'expiration | NOT NULL |

**Indices**:
- PRIMARY KEY sur `id`
- UNIQUE sur `(userId, keyId)` pour éviter les doublons
- INDEX sur `userId` pour les recherches

#### 2.2.5 IDENTITY_KEYS
Stocke les clés d'identité pour le protocole Signal.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique de la clé | PK, NOT NULL |
| userId | UUID | Référence à l'utilisateur propriétaire | FK (USERS_AUTH.id), NOT NULL |
| publicKey | TEXT | Clé publique encodée | NOT NULL |
| privateKeyEncrypted | TEXT | Clé privée chiffrée (si nécessaire) | ENCRYPTED, NULL |
| createdAt | TIMESTAMP | Date/heure de création | NOT NULL |
| updatedAt | TIMESTAMP | Date/heure de la dernière mise à jour | NOT NULL |

**Indices**:
- PRIMARY KEY sur `id`
- UNIQUE sur `userId` (un utilisateur a une seule clé d'identité active)

#### 2.2.6 BACKUP_CODES
Stocke les codes de secours pour l'authentification 2FA.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique du code | PK, NOT NULL |
| userId | UUID | Référence à l'utilisateur propriétaire | FK (USERS_AUTH.id), NOT NULL |
| codeHash | VARCHAR(255) | Hachage du code de secours | NOT NULL |
| used | BOOLEAN | Indique si le code a été utilisé | NOT NULL, DEFAULT FALSE |
| createdAt | TIMESTAMP | Date/heure de création | NOT NULL |
| usedAt | TIMESTAMP | Date/heure d'utilisation | NULL |

**Indices**:
- PRIMARY KEY sur `id`
- INDEX sur `userId` pour les recherches

#### 2.2.7 LOGIN_HISTORY
Enregistre l'historique des connexions.

| Colonne | Type | Description | Contraintes |
|---------|------|-------------|-------------|
| id | UUID | Identifiant unique de l'entrée | PK, NOT NULL |
| userId | UUID | Référence à l'utilisateur | FK (USERS_AUTH.id), NOT NULL |
| deviceId | UUID | Référence à l'appareil utilisé | FK (DEVICES.id), NULL |
| ipAddress | VARCHAR(45) | Adresse IP de la connexion | NOT NULL |
| userAgent | TEXT | User-agent du client | NULL |
| createdAt | TIMESTAMP | Date/heure de la tentative | NOT NULL |
| status | VARCHAR(20) | Statut (success, failed, etc.) | NOT NULL |

**Indices**:
- PRIMARY KEY sur `id`
- INDEX sur `userId` pour les recherches
- INDEX sur `deviceId` pour les recherches par appareil
- INDEX sur `createdAt` pour les requêtes temporelles

## 3. Données Temporaires dans Redis

### 3.1 Vue d'Ensemble

Redis est utilisé pour stocker des données temporaires et à haute disponibilité:

```mermaid
erDiagram
    VERIFICATION_CODES {
        string verificationId PK
        string phoneNumber
        string hashedCode
        string purpose
        int attempts
        timestamp expiresAt
    }
    SESSIONS {
        string sessionId PK
        uuid userId
        uuid deviceId
        timestamp lastActive
        timestamp expiresAt
    }
    QR_LOGIN_CHALLENGES {
        string qrChallengeId PK
        string challenge
        timestamp expiresAt
    }
    RATE_LIMIT_COUNTERS {
        string key PK
        int counter
        timestamp expiresAt
    }
```

### 3.2 Description des Structures Redis

#### 3.2.1 VERIFICATION_CODES
Stocke les codes de vérification temporaires envoyés par SMS.

**Clé**: `verification:{verificationId}`  
**Type**: Hash  
**TTL**: 15 minutes  
**Champs**:
- `phoneNumber`: Numéro de téléphone cible
- `hashedCode`: Code de vérification haché
- `purpose`: Objectif (registration, login, recovery, phone_change)
- `attempts`: Nombre de tentatives effectuées
- `expiresAt`: Horodatage d'expiration

#### 3.2.2 SESSIONS
Stocke les informations de session active.

**Clé**: `session:{sessionId}`  
**Type**: Hash  
**TTL**: Variable (selon la durée de validité du token)  
**Champs**:
- `userId`: ID de l'utilisateur
- `deviceId`: ID de l'appareil
- `tokenFamily`: Famille de tokens pour le refresh
- `lastActive`: Dernière activité
- `expiresAt`: Horodatage d'expiration

#### 3.2.3 QR_LOGIN_CHALLENGES
Stocke les challenges pour l'authentification par QR code.

**Clé**: `qr_challenge:{qrChallengeId}`  
**Type**: Hash  
**TTL**: 5 minutes  
**Champs**:
- `challenge`: Challenge cryptographique
- `expiresAt`: Horodatage d'expiration

#### 3.2.4 RATE_LIMIT_COUNTERS
Compteurs pour la limitation de débit.

**Clé**: `rate_limit:{type}:{identifier}`  
**Type**: String (counter)  
**TTL**: Variable selon le type de limite  
**Valeur**: Nombre de tentatives

## 4. Relations avec les Autres Services

### 4.1 Démarcation des Responsabilités

```mermaid
graph LR
    subgraph "auth-service (PostgreSQL)"
        A[USERS_AUTH] --> B[DEVICES]
        A --> C[Clés E2E]
        A --> D[2FA & Sécurité]
        A --> E[LOGIN_HISTORY]
    end
    
    subgraph "user-service (PostgreSQL)"
        F[USERS] --> G[Profil]
        F --> H[Préférences]
        F --> I[Relations sociales]
    end
    
    subgraph "notification-service (PostgreSQL)"
        J[NOTIFICATION_TOKENS] --> K[Références appareils]
        J --> L[Notification Preferences]
    end
    
    A -.->|Même ID| F
    B -.->|device_id référencé| J
    J -.->|gRPC GetDeviceTokens| B
```

### 4.2 Synchronisation des Données

- **ID Utilisateur**: Même UUID utilisé dans les deux services (auth et user)
- **Création**: Création atomique dans auth-service suivi d'un événement pour user-service
- **Gestion des appareils**: auth-service est la source de vérité pour tous les appareils
- **Tokens de notification**: notification-service maintient une table légère avec les tokens FCM/APNS
- **Synchronisation**: notification-service fait des appels gRPC vers auth-service pour obtenir les informations d'appareils

## 5. Considérations de Sécurité

### 5.1 Chiffrement des Données Sensibles

- **Niveau Colonne**: Les colonnes contenant des informations sensibles (twoFactorSecret, privateKeyEncrypted) sont chiffrées au repos
- **Méthode**: Chiffrement AES-256-GCM avec rotation des clés

### 5.2 Hachage des Secrets

- Les codes de vérification sont stockés sous forme hachée (bcrypt ou PBKDF2)
- Les codes de secours sont également hachés avec sel unique

### 5.3 Audit et Logging

- Toutes les opérations sensibles sont enregistrées dans la table LOGIN_HISTORY
- Timestamps d'audit sur toutes les tables (createdAt, updatedAt)

## 6. Considérations de Performance

### 6.1 Indexation

- Index sur les colonnes fréquemment recherchées (phoneNumber, userId, etc.)
- Index composites pour les requêtes courantes

### 6.2 Partitionnement

- La table LOGIN_HISTORY peut être partitionnée par plage de dates pour les performances à long terme

### 6.3 Optimisations Redis

- TTL appropriés pour éviter la croissance excessive
- Utilisation de Redis Cluster pour la haute disponibilité (optionnel)

## 7. Migrations et Évolution du Schéma

### 7.1 Stratégie de Migration

- Migrations progressives avec versionnement
- Support pour la compatibilité descendante
- Tests automatisés des migrations

## 8. Scripts SQL d'Initialisation

### 8.1 Création du Schéma PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs pour l'authentification
CREATE TABLE users_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_authenticated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des appareils (source de vérité)
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    device_fingerprint VARCHAR(255) UNIQUE NOT NULL,
    model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    fcm_token VARCHAR(255),
    apns_token VARCHAR(255),
    public_key TEXT NOT NULL,
    last_active TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des prekeys
CREATE TABLE prekeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    is_one_time BOOLEAN NOT NULL DEFAULT TRUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, key_id)
);

-- Table des prekeys signées
CREATE TABLE signed_prekeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, key_id)
);

-- Table des clés d'identité
CREATE TABLE identity_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users_auth(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table des codes de secours
CREATE TABLE backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    used_at TIMESTAMP
);

-- Table de l'historique des connexions
CREATE TABLE login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_auth(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL
);

-- Création des index
CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_fingerprint ON devices(device_fingerprint);
CREATE INDEX idx_devices_last_active ON devices(last_active);
CREATE INDEX idx_devices_is_active ON devices(is_active);
CREATE INDEX idx_prekeys_user_id ON prekeys(user_id);
CREATE INDEX idx_signed_prekeys_user_id ON signed_prekeys(user_id);
CREATE INDEX idx_backup_codes_user_id ON backup_codes(user_id);
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_device_id ON login_history(device_id);
CREATE INDEX idx_login_history_created_at ON login_history(created_at);
```

## 9. Communication Inter-Services avec Istio

### 9.1 Architecture de Gestion des Appareils

L'auth-service est la source de vérité pour la gestion des appareils, avec une coordination simplifiée via Istio Service Mesh :

```mermaid
graph LR
    subgraph "auth-service"
        A[PostgreSQL Auth] --> B[devices table COMPLÈTE]
        B --> C[Auth Logic]
        C --> D[Envoy Sidecar]
    end
    
    subgraph "notification-service"
        E[Envoy Sidecar] --> F[Notification Logic]
        F --> G[PostgreSQL Notifications]
        G --> H[notification_tokens table]
    end
    
    subgraph "user-service"
        I[Envoy Sidecar] --> J[User Logic]
        J --> K[PostgreSQL Users]
    end
    
    E -.->|"GetDeviceTokens<br/>mTLS gRPC"| D
    E -.->|"GetUserDevices<br/>mTLS gRPC"| D
    D -.->|"NotifyDeviceEvent<br/>mTLS gRPC"| E
    D -.->|"CreateUser<br/>mTLS gRPC"| I
    
    subgraph "Istio Control Plane"
        L[Certificate Authority]
        M[Service Discovery]
    end
    
    L -.->|Auto Certs| D
    L -.->|Auto Certs| E
    L -.->|Auto Certs| I
```

### 9.2 Flux de Données Principal

**auth-service** comme source de vérité :
- Gère la table `devices` complète avec toutes les métadonnées
- Expose les API CRUD pour la gestion des appareils
- Coordonne l'authentification et les sessions par appareil
- Notifie les autres services des événements d'appareils

**notification-service** en consommateur :
- Maintient une table `notification_tokens` légère
- Fait des appels gRPC vers auth-service pour obtenir les informations d'appareils
- Se synchronise via des événements envoyés par auth-service

### 9.3 Communications Sécurisées avec mTLS

#### 9.3.1 notification-service → auth-service (lecture)

```yaml
# AuthorizationPolicy pour notification-service vers auth-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: notification-to-auth-devices
  namespace: whispr
spec:
  selector:
    matchLabels:
      app: auth-service
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/whispr/sa/notification-service"]
  - to:
    - operation:
        methods: ["GET"]
        paths: ["/auth.AuthService/GetDeviceTokens", "/auth.AuthService/GetUserDevices"]
```

**Patterns de communication** :
```yaml
# notification-service appelle auth-service pour récupérer les tokens
service: auth.AuthService
method: GetDeviceTokens
request: { userId: "uuid", deviceTypes: ["iOS", "Android"] }
response: { devices: [{ deviceId: "uuid", fcmToken: "...", apnsToken: "..." }] }
```

#### 9.3.2 auth-service → notification-service (événements)

```yaml
# AuthorizationPolicy pour auth-service vers notification-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: auth-to-notification-events
  namespace: whispr
spec:
  selector:
    matchLabels:
      app: notification-service
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/whispr/sa/auth-service"]
  - to:
    - operation:
        methods: ["POST"]
        paths: ["/notification.NotificationService/NotifyDeviceEvent"]
```

**Événements notifiés** :
- `DeviceRegistered` : Nouvel appareil enregistré
- `DeviceRevoked` : Appareil déconnecté/révoqué
- `DeviceUpdated` : Métadonnées d'appareil mises à jour
- `UserAuthenticated` : Connexion réussie sur un appareil

### 9.4 Structure de données notification-service

Pour optimiser les performances, notification-service maintient une table légère :

```sql
-- notification-service: table optimisée pour les notifications
CREATE TABLE notification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL, -- Référence vers auth-service.devices
    user_id UUID NOT NULL,   -- Référence vers user-service.users
    fcm_token VARCHAR(255),
    apns_token VARCHAR(255),
    notification_preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_tokens_device_id ON notification_tokens(device_id);
CREATE INDEX idx_notification_tokens_user_id ON notification_tokens(user_id);
CREATE INDEX idx_notification_tokens_is_active ON notification_tokens(is_active);
```

### 9.5 Synchronisation et Cohérence

#### 9.5.1 Stratégies de Synchronisation
- **Pull** : notification-service fait des appels gRPC périodiques pour récupérer les tokens
- **Push** : auth-service notifie les événements importants via gRPC
- **Cache** : notification-service peut mettre en cache les tokens avec TTL
- **Lazy Loading** : Récupération des tokens à la demande lors d'envoi de notifications

#### 9.5.2 Gestion des Incohérences
- **Eventual Consistency** : Accepter un léger délai de synchronisation
- **Retry Logic** : Mécanismes de retry avec backoff exponentiel
- **Health Checks** : Vérifications régulières de la cohérence des données
- **Reconciliation** : Processus de réconciliation en cas de désynchronisation

### 9.6 Performance et Résilience

#### 9.6.1 Optimisations
- **Batch Requests** : Récupération de tokens par lots pour plusieurs utilisateurs
- **Connection Pooling** : Pool de connexions gRPC réutilisables
- **Circuit Breaker** : Protection contre les pannes d'auth-service
- **Cache Local** : Cache TTL dans notification-service pour réduire les appels

#### 9.6.2 Résilience
- **Graceful Degradation** : Mode dégradé si auth-service indisponible
- **Fallback Cache** : Utilisation du cache local en cas de panne
- **Health Monitoring** : Surveillance de la santé des communications inter-services
- **Alert System** : Alertes en cas de problèmes de synchronisation

### 9.7 Monitoring des Communications

#### 9.7.1 Métriques Istio Spécifiques
- **auth-service → notification-service** : Latence des notifications d'événements
- **notification-service → auth-service** : Fréquence et performance des appels GetDeviceTokens
- **mTLS Success Rate** : Taux de succès des connexions sécurisées
- **Circuit Breaker Status** : État des circuit breakers inter-services

#### 9.7.2 Métriques Business
- **Token Sync Latency** : Délai de synchronisation des tokens FCM/APNS
- **Event Delivery Rate** : Taux de livraison des événements d'appareils
- **Cache Hit Rate** : Efficacité du cache de tokens dans notification-service
- **API Response Time** : Performance des APIs de gestion d'appareils