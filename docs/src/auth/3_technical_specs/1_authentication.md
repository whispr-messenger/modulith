## 6. Spécifications techniques

### 6.1 Formats des codes et tokens
- **Code SMS**: 6 chiffres numériques
- **Challenge QR**: JWT avec payload spécifique
- **Token d'accès**: JWT signé avec ES256, validité 1 heure
- **Token de rafraîchissement**: JWT signé avec ES256, validité 30 jours
- **Structure du token d'accès**:
  ```json
  {
    "sub": "7c9e6679-7425-40de-944b-e07fc1f90ae7",  // User ID
    "iat": 1680264000,                            // Issued at
    "exp": 1680267600,                            // Expiration
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "scope": "user",                              // Authorization scope
    "fingerprint": "a1b2c3d4e5f6"                 // Device fingerprint
  }
  ```

### 6.2 Gestion des codes SMS
- **Génération**: Codes entièrement aléatoires
- **Stockage**: Hashés avec bcrypt (facteur de coût 10) dans Redis
- **Validité**: 15 minutes
- **Tentatives**: Maximum 5 par code avant blocage
- **Rate limiting**: Maximum 5 demandes/heure par numéro pour éviter l'abus

### 6.3 Structure des données

#### Table users_auth (PostgreSQL dans auth-service)
```sql
CREATE TABLE users_auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_authenticated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Table devices (PostgreSQL dans user-service)
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    fcm_token VARCHAR(255),
    public_key TEXT NOT NULL,
    last_active TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Structures Redis
```
// Verification codes
Key: verification:{verificationId}
Value: {
  phoneNumber: string,
  hashedCode: string,
  purpose: "registration" | "login" | "recovery",
  attempts: number,
  expiresAt: timestamp
}
TTL: 15 minutes

// Revoked tokens
Key: revoked:{tokenId}
Value: { revokedAt: timestamp }
TTL: configurable based on token validity
```

### 6.4 Endpoints API

| Endpoint | Méthode | Description | Paramètres |
|----------|---------|-------------|------------|
| `/auth/register/verify/request` | POST | Demande vérification pour inscription | `{ phoneNumber: string }` |
| `/auth/register/verify/confirm` | POST | Confirme code pour inscription | `{ verificationId: string, code: string }` |
| `/auth/register` | POST | Finalise l'inscription | `{ verificationId: string, firstName: string, lastName: string, ... }` |
| `/auth/login/verify/request` | POST | Demande vérification pour connexion | `{ phoneNumber: string }` |
| `/auth/login/verify/confirm` | POST | Confirme code pour connexion | `{ verificationId: string, code: string }` |
| `/auth/login` | POST | Finalise la connexion | `{ verificationId: string }` |
| `/auth/scan-login` | POST | Authentifie via QR code | `{ challenge: string, authenticatedDeviceId: string, ... }` |
| `/auth/refresh` | POST | Rafraîchit le token d'accès | `{ refreshToken: string }` |
| `/auth/logout` | POST | Déconnexion | - |
| `/auth/devices` | GET | Liste appareils connectés | - |
| `/auth/devices/{deviceId}` | DELETE | Révoque un appareil | - |

## 7. Considérations de sécurité

### 7.1 Protections implantées
- **Rate limiting**: Protection contre les attaques par force brute
- **Hachage**: Aucun secret stocké en clair
- **TTL stricts**: Expiration automatique des données sensibles temporaires
- **Validation séquentielle**: Prévention des sauts d'étapes dans les processus d'authentification
- **TLS 1.3**: Communications chiffrées entre client et serveur
- **Signatures JWT**: Protection contre la falsification des tokens
- **Révocation**: Possibilité d'invalider des tokens compromis

### 7.2 Journalisation sécurisée
- Enregistrement de toutes les tentatives d'authentification (réussies ou échouées)
- Journalisation des ajouts/suppressions d'appareils
- Masquage des données sensibles dans les logs (numéros partiellement masqués)
- Horodatage précis pour analyse forensique si nécessaire

### 7.3 Considérations de confidentialité
- Minimisation des données collectées
- Utilisateur informé de l'ajout de nouveaux appareils
- Option de notification en cas de nouvelle connexion
- Expiration automatique des sessions inactives

## 8. Tests

### 8.1 Tests unitaires
- Validations des formats de numéros de téléphone (nationaux, internationaux)
- Génération et vérification des codes SMS
- Encodage et décodage des tokens JWT
- Calcul et validation des empreintes d'appareil
- Logique de hachage et de vérification des codes
- Gestion des expirations et des TTL

### 8.2 Tests d'intégration
- Flux complet d'inscription
- Flux complet d'authentification (avec et sans 2FA)
- Authentification par QR code
- Rafraîchissement des tokens
- Révocation d'appareil et de session
- Interaction entre le cache Redis et la base de données

### 8.3 Tests de sécurité
- Tentatives de réutilisation de codes de vérification expirés
- Contournement du processus de vérification
- Attaques par force brute sur les endpoints
- Tentatives d'utilisation de tokens révoqués
- Tentatives de manipulation des JWT
- Tests de dépassement des limites (rate limiting)
- Vérification des délais d'expiration

### 8.4 Tests de charge
- Simulation de nombreuses demandes d'authentification simultanées
- Performances lors de pics de connexion (ex: 100 connexions/seconde)
- Comportement du cache Redis sous charge
- Tests de résilience lors de latence du service SMS
- Comportement lors d'indisponibilité temporaire du service utilisateur

## 9. Livrables

### 9.1 Composants backend (NestJS)
- **AuthModule**: Module principal de gestion de l'authentification
- **VerificationService**: Service de gestion des codes de vérification SMS
- **TokenService**: Service de gestion des JWT (génération, validation, révocation)
- **DeviceService**: Service de gestion des appareils
- **QrAuthService**: Service d'authentification par QR code
- **Cache adaptateur**: Couche d'abstraction pour l'interaction avec Redis
- **gRPC client**: Client pour la communication avec le service utilisateur

### 9.2 Composants frontend
- **Écran d'inscription**: Formulaire et flux d'inscription
- **Écran de connexion**: Interface de saisie du numéro et du code
- **Écran de vérification SMS**: Saisie du code reçu par SMS
- **Générateur de QR code**: Pour l'authentification multi-appareils
- **Scanner de QR code**: Pour l'autorisation depuis un appareil existant
- **Gestionnaire de sessions**: Interface de gestion des appareils connectés
- **Gestionnaire de tokens**: Couche de gestion des tokens côté client

### 9.3 Documentation
- **Guide d'implémentation**: Instructions détaillées pour les développeurs
- **Documentation API**: Spécifications OpenAPI complètes
- **Guide de configuration**: Instructions de déploiement et configuration
- **Tests postman**: Collection de requêtes pour tester manuellement les endpoints
- **Guide de dépannage**: Solutions aux problèmes courants d'authentification

### 9.4 Scripts et utilitaires
- **Migration SQL**: Scripts de création et migration de la base de données
- **Scripts de test**: Automatisation des tests décrits précédemment
- **Script de benchmark**: Pour tester les performances des endpoints
- **Monitoring**: Configuration des alertes et métriques spécifiques à l'authentification
- **Utilitaire de génération de certificats**: Pour le chiffrement JWT
