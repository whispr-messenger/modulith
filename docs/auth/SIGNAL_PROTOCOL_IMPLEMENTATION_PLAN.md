# Plan d'implémentation du protocole Signal

## 📋 Vue d'ensemble

Ce document décrit le plan d'implémentation complet du protocole Signal dans le module d'authentification de Whispr Messenger. Le protocole Signal (anciennement TextSecure) fournit un chiffrement de bout en bout (E2EE) avec des garanties de forward secrecy et future secrecy.

## 🎯 Objectifs

1. Implémenter la gestion complète des clés cryptographiques Signal
2. Supporter l'échange de clés X3DH (Extended Triple Diffie-Hellman)
3. Permettre la rotation automatique des clés
4. Fournir des APIs pour récupérer les bundles de clés publiques
5. Gérer le cycle de vie des PreKeys (génération, consommation, renouvellement)

## 📊 Architecture actuelle

### Entités existantes

- ✅ `IdentityKey` - Clé d'identité longue durée par utilisateur
- ✅ `SignedPreKey` - Clés pré-partagées signées avec expiration
- ✅ `PreKey` - Clés pré-partagées à usage unique
- ✅ `Device` - Appareil avec sa clé publique

### DTOs créés

- ✅ `SignalKeyBundleDto` - Bundle complet de clés
- ✅ `SignedPreKeyDto` - Clé pré-signée
- ✅ `PreKeyDto` - Clé pré-partagée
- ✅ `RegisterDto` - Modifié pour accepter signalKeyBundle
- ✅ `LoginDto` - Modifié pour accepter signalKeyBundle

## 🔧 Modules à créer

### 1. Module Signal (`src/modules/auth/signal/`)

```
src/modules/auth/signal/
├── signal.module.ts
├── controllers/
│   ├── signal-keys.controller.ts           # API publique pour récupérer les clés
│   └── signal-keys-management.controller.ts # API pour gérer ses propres clés
├── services/
│   ├── signal-key-storage.service.ts       # Stockage et récupération des clés
│   ├── signal-key-rotation.service.ts      # Rotation automatique des clés
│   ├── signal-prekey-bundle.service.ts     # Création de bundles pour X3DH
│   └── signal-key-validation.service.ts    # Validation des clés et signatures
├── repositories/
│   ├── identity-key.repository.ts
│   ├── signed-prekey.repository.ts
│   └── prekey.repository.ts
├── entities/
│   └── (déjà existantes, à déplacer ici)
├── dto/
│   ├── create-key-bundle.dto.ts
│   ├── key-bundle-response.dto.ts
│   ├── prekey-status.dto.ts
│   └── rotate-keys.dto.ts
└── types/
    ├── signal-key-bundle.interface.ts
    └── prekey-status.interface.ts
```

## 📝 Étapes d'implémentation

### Phase 1 : Infrastructure de base (2-3 jours)

#### 1.1 Créer le module Signal
- [ ] Créer `signal.module.ts` avec imports nécessaires
- [ ] Déplacer les entités Signal existantes dans le module
- [ ] Créer les repositories pour chaque type de clé
- [ ] Configurer TypeORM pour les nouvelles entités

#### 1.2 Service de stockage des clés
- [ ] Implémenter `SignalKeyStorageService`
  - [ ] `storeIdentityKey(userId: string, identityKey: string): Promise<IdentityKey>`
  - [ ] `storeSignedPreKey(userId: string, signedPreKey: SignedPreKeyDto): Promise<SignedPreKey>`
  - [ ] `storePreKeys(userId: string, preKeys: PreKeyDto[]): Promise<PreKey[]>`
  - [ ] `getIdentityKey(userId: string): Promise<IdentityKey | null>`
  - [ ] `getActiveSignedPreKey(userId: string): Promise<SignedPreKey | null>`
  - [ ] `getUnusedPreKey(userId: string): Promise<PreKey | null>`

#### 1.3 Modifier les services d'authentification
- [ ] Mettre à jour `PhoneAuthenticationService.handleDeviceRegistration()`
  - [ ] Extraire et stocker les clés du `signalKeyBundle`
  - [ ] Migrer de `publicKey` vers `signalKeyBundle.identityKey`
- [ ] Ajouter la validation du bundle de clés lors de l'inscription
- [ ] Gérer le cas où `signalKeyBundle` est absent (clients web)

### Phase 2 : Gestion des PreKey Bundles (2-3 jours)

#### 2.1 Service PreKey Bundle
- [ ] Implémenter `SignalPreKeyBundleService`
  - [ ] `getBundleForUser(userId: string, deviceId?: string): Promise<KeyBundleResponse>`
  - [ ] `consumePreKey(preKeyId: string): Promise<void>`
  - [ ] `getPreKeyStatus(userId: string): Promise<PreKeyStatus>`

#### 2.2 Endpoints publics
- [ ] `GET /api/v1/signal/keys/:userId` - Récupérer le bundle de clés d'un utilisateur
- [ ] `GET /api/v1/signal/keys/:userId/devices/:deviceId` - Bundle pour un appareil spécifique
- [ ] Implémenter la logique de sélection aléatoire de PreKey
- [ ] Marquer automatiquement les PreKeys comme utilisées

#### 2.3 DTOs de réponse
```typescript
interface KeyBundleResponse {
  userId: string;
  deviceId?: string;
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  preKey?: {  // Optionnel si toutes les PreKeys sont utilisées
    keyId: number;
    publicKey: string;
  };
}
```

### Phase 3 : Rotation et validation des clés (2-3 jours)

#### 3.1 Service de rotation
- [ ] Implémenter `SignalKeyRotationService`
  - [ ] `rotateSignedPreKey(userId: string, newSignedPreKey: SignedPreKeyDto): Promise<void>`
  - [ ] `replenishPreKeys(userId: string, newPreKeys: PreKeyDto[]): Promise<void>`
  - [ ] `checkLowPreKeys(userId: string): Promise<boolean>`

#### 3.2 Endpoints de gestion
- [ ] `POST /api/v1/signal/keys/signed-prekey` - Uploader une nouvelle SignedPreKey
- [ ] `POST /api/v1/signal/keys/prekeys` - Uploader de nouvelles PreKeys
- [ ] `GET /api/v1/signal/keys/status` - Vérifier le statut des clés
- [ ] `DELETE /api/v1/signal/keys/device/:deviceId` - Supprimer les clés d'un appareil

#### 3.3 Validation des clés
- [ ] Implémenter `SignalKeyValidationService`
  - [ ] Valider le format des clés publiques (Curve25519)
  - [ ] Vérifier les signatures des SignedPreKeys
  - [ ] Valider l'unicité des keyIds
  - [ ] Vérifier l'expiration des SignedPreKeys

### Phase 4 : Tâches automatiques et monitoring (1-2 jours)

#### 4.1 Cron jobs
- [ ] Créer un job pour nettoyer les SignedPreKeys expirées
- [ ] Job pour notifier les utilisateurs avec peu de PreKeys
- [ ] Job pour supprimer les PreKeys inutilisées anciennes (> 30 jours)

#### 4.2 Métriques et monitoring
- [ ] Ajouter des logs pour chaque opération sur les clés
- [ ] Créer des métriques Prometheus
  - [ ] Nombre de PreKeys disponibles par utilisateur
  - [ ] Nombre de SignedPreKeys expirées
  - [ ] Taux de consommation des PreKeys

### Phase 5 : Migration et tests (2-3 jours)

#### 5.1 Migration des données existantes
- [ ] Créer une migration pour les appareils existants
- [ ] Migrer `Device.publicKey` vers `IdentityKey.publicKey`
- [ ] Générer des PreKeys factices pour les appareils existants (optionnel)

#### 5.2 Tests unitaires
- [ ] Tests pour `SignalKeyStorageService`
- [ ] Tests pour `SignalPreKeyBundleService`
- [ ] Tests pour `SignalKeyRotationService`
- [ ] Tests pour `SignalKeyValidationService`

#### 5.3 Tests d'intégration
- [ ] Test du flow complet d'inscription avec clés
- [ ] Test de récupération d'un bundle de clés
- [ ] Test de consommation de PreKeys
- [ ] Test de rotation des clés

#### 5.4 Tests E2E
- [ ] Scénario complet : inscription → récupération bundle → établissement session
- [ ] Test avec plusieurs appareils
- [ ] Test de rotation automatique

## 🔐 Considérations de sécurité

### Stockage
- [ ] Les clés privées ne doivent JAMAIS être stockées sur le serveur
- [ ] Utiliser des index sur les tables pour les performances
- [ ] Implémenter rate limiting sur les endpoints de récupération de clés

### Validation
- [ ] Vérifier que les signatures sont valides
- [ ] S'assurer que les keyIds sont uniques par utilisateur
- [ ] Valider que les SignedPreKeys ne sont pas expirées lors de l'upload

### Best practices
- [ ] Rotation automatique des SignedPreKeys tous les 7 jours
- [ ] Maintenir un minimum de 20 PreKeys disponibles
- [ ] Maximum de 100 PreKeys par utilisateur
- [ ] Supprimer les PreKeys utilisées après 7 jours

## 📊 Schéma de base de données (existant)

```sql
-- Déjà créé
CREATE TABLE auth.identity_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key_encrypted TEXT,  -- Ne devrait pas être utilisé
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE auth.signed_prekeys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    signature TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(user_id, key_id)
);

CREATE TABLE auth.prekeys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_id INTEGER NOT NULL,
    public_key TEXT NOT NULL,
    is_one_time BOOLEAN DEFAULT TRUE,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key_id)
);

-- Index recommandés
CREATE INDEX idx_prekeys_unused ON auth.prekeys(user_id, is_used) WHERE is_used = FALSE;
CREATE INDEX idx_signed_prekeys_expiry ON auth.signed_prekeys(expires_at);
```

## 🔄 Flow d'échange de clés X3DH

### 1. Alice veut envoyer un message à Bob

```
1. Alice récupère le bundle de clés de Bob:
   GET /api/v1/signal/keys/bob-user-id

2. Serveur retourne:
   {
     "userId": "bob-user-id",
     "identityKey": "Bob_IK",
     "signedPreKey": { "keyId": 1, "publicKey": "Bob_SPK", "signature": "..." },
     "preKey": { "keyId": 42, "publicKey": "Bob_OPK_42" }  // Marquée comme utilisée
   }

3. Alice effectue X3DH localement:
   - Génère une ephemeral key (EK)
   - Calcule DH(Alice_IK, Bob_SPK)
   - Calcule DH(Alice_EK, Bob_IK)
   - Calcule DH(Alice_EK, Bob_SPK)
   - Calcule DH(Alice_EK, Bob_OPK_42)
   - Dérive la clé de session

4. Alice envoie le message initial avec:
   - Alice_IK (pour que Bob sache qui)
   - Alice_EK (pour que Bob puisse calculer)
   - keyId de Bob_OPK utilisée
   - Message chiffré
```

## 📈 Métriques de succès

- [ ] 100% des inscriptions mobiles incluent un signalKeyBundle
- [ ] Temps de réponse < 100ms pour récupérer un bundle
- [ ] Taux de disponibilité des PreKeys > 99%
- [ ] 0 clés privées stockées sur le serveur
- [ ] Rotation automatique des SignedPreKeys sans downtime

## 🚀 Déploiement

### Étape 1 : Déploiement en développement
- [ ] Déployer le nouveau code avec feature flag
- [ ] Tester avec des comptes de test
- [ ] Valider la migration des données

### Étape 2 : Déploiement progressif
- [ ] Activer pour 10% des utilisateurs
- [ ] Monitorer les erreurs et performances
- [ ] Augmenter progressivement à 100%

### Étape 3 : Nettoyage
- [ ] Supprimer l'ancien champ `Device.publicKey` (après période de grâce)
- [ ] Nettoyer le code legacy

## 📚 Ressources

- [Signal Protocol Specifications](https://signal.org/docs/)
- [X3DH Key Agreement Protocol](https://signal.org/docs/specifications/x3dh/)
- [Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [libsignal Documentation](https://github.com/signalapp/libsignal)

## ⏱️ Timeline estimée

- **Phase 1**: 2-3 jours
- **Phase 2**: 2-3 jours
- **Phase 3**: 2-3 jours
- **Phase 4**: 1-2 jours
- **Phase 5**: 2-3 jours

**Total: 9-14 jours** (2-3 semaines de développement)
