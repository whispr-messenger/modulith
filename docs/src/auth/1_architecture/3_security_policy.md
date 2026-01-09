# Politique de Sécurité - Service d'Authentification 

## 0. Sommaire

- [1. Introduction](#1-introduction)
  - [1.1 Objectif du Document](#11-objectif-du-document)
  - [1.2 Contexte et Importance](#12-contexte-et-importance)
  - [1.3 Principes Fondamentaux](#13-principes-fondamentaux)
- [2. Gestion des Identités et des Accès](#2-gestion-des-identités-et-des-accès)
  - [2.1 Authentification des Utilisateurs](#21-authentification-des-utilisateurs)
  - [2.2 Gestion des Sessions](#22-gestion-des-sessions)
- [3. Chiffrement et Protection des Données](#3-chiffrement-et-protection-des-données)
  - [3.1 Chiffrement au Repos](#31-chiffrement-au-repos)
  - [3.2 Chiffrement en Transit](#32-chiffrement-en-transit)
  - [3.3 Chiffrement de Bout en Bout (E2E)](#33-chiffrement-de-bout-en-bout-e2e)
- [4. Protection Contre les Menaces](#4-protection-contre-les-menaces)
  - [4.1 Contrôle des Accès et Rate Limiting](#41-contrôle-des-accès-et-rate-limiting)
  - [4.2 Protection Contre les Attaques Courantes](#42-protection-contre-les-attaques-courantes)
  - [4.3 Sécurité Mobile](#43-sécurité-mobile)
- [5. Gestion des Secrets](#5-gestion-des-secrets)
  - [5.1 Sécurisation des Secrets d'Application](#51-sécurisation-des-secrets-dapplication)
  - [5.2 Gestion des Clés de Chiffrement](#52-gestion-des-clés-de-chiffrement)
- [6. Détection et Réponse aux Incidents](#6-détection-et-réponse-aux-incidents)
  - [6.1 Journalisation et Surveillance](#61-journalisation-et-surveillance)
  - [6.2 Gestion des Incidents](#62-gestion-des-incidents)
- [7. Sécurité du Développement](#7-sécurité-du-développement)
  - [7.1 Pratiques de Développement Sécurisé](#71-pratiques-de-développement-sécurisé)
  - [7.2 Gestion des Dépendances](#72-gestion-des-dépendances)
- [8. Standards de Sécurité](#8-standards-de-sécurité)
  - [8.1 Normes et Bonnes Pratiques](#81-normes-et-bonnes-pratiques)
  - [8.2 Tests de Sécurité](#82-tests-de-sécurité)
- [9. Sauvegarde et Récupération](#9-sauvegarde-et-récupération)
  - [9.1 Sauvegarde et Récupération](#91-sauvegarde-et-récupération)
  - [9.2 Déploiement Sécurisé](#92-déploiement-sécurisé)
- [10. Communication Inter-Services](#10-communication-inter-services)
  - [10.1 Sécurité des Communications](#101-sécurité-des-communications)
  - [10.2 Gestion des Appareils](#102-gestion-des-appareils)
- [11. Documentation](#11-documentation)
  - [11.1 Documentation de Sécurité](#111-documentation-de-sécurité)
  - [11.2 Documentation Utilisateur](#112-documentation-utilisateur)
- [Annexes](#annexes)
  - [A. Matrice des Risques et Contrôles](#a-matrice-des-risques-et-contrôles)
  - [B. Références](#b-références)

## 1. Introduction

### 1.1 Objectif du Document
Cette politique de sécurité définit les mesures techniques et pratiques à implémenter pour protéger le service d'authentification (Identity Service) de l'application Whispr dans le cadre de notre projet de fin d'études.

### 1.2 Contexte et Importance
Le service d'authentification constitue la première ligne de défense de notre application. Il gère les informations d'identification des utilisateurs, les sessions, et les clés cryptographiques pour le chiffrement de bout en bout.

### 1.3 Principes Fondamentaux
- **Défense en profondeur**: Multiples couches de sécurité
- **Moindre privilège**: Accès limité au minimum nécessaire
- **Sécurité par conception**: Considérations de sécurité intégrées dès la conception
- **Transparence**: Documentation claire des mesures de sécurité
- **Mise en œuvre réaliste**: Implémentation adaptée à nos contraintes de projet

## 2. Gestion des Identités et des Accès

### 2.1 Authentification des Utilisateurs

#### 2.1.1 Vérification du Numéro de Téléphone
- Codes de vérification à 6 chiffres générés aléatoirement
- Validité limitée à 15 minutes
- Maximum de 5 tentatives avant blocage temporaire
- Envoi via un service SMS externe (Twilio ou équivalent)

#### 2.1.2 Authentification à Deux Facteurs (2FA)
- Implémentation du standard TOTP (RFC 6238)
- Utilisation de l'algorithme HMAC-SHA1 avec une longueur de 6 chiffres
- Intervalle de 30 secondes avec tolérance de ±1 intervalle
- Possibilité de générer jusqu'à 10 codes de secours

#### 2.1.3 Authentification Multi-Appareils
- Mécanisme de scan QR pour appairer les appareils
- Vérification croisée nécessitant un appareil déjà authentifié
- Challenge cryptographique à courte durée de vie (5 minutes)
- Coordination avec le notification-service pour la validation des appareils

### 2.2 Gestion des Sessions

#### 2.2.1 Tokens d'Authentification
- Architecture basée sur JWT (JSON Web Tokens)
- Tokens d'accès de courte durée (1 heure)
- Tokens de rafraîchissement de longue durée (30 jours)
- Signature avec algorithme ES256 (ECDSA avec P-256 et SHA-256)
- Inclusion du fingerprint de l'appareil dans les claims du token

#### 2.2.2 Révocation et Invalidation
- Stockage des tokens révoqués dans une liste noire Redis
- Révocation en cascade des tokens enfants
- Invalidation automatique en cas de changement de mot de passe
- Possibilité de mettre fin à toutes les sessions à distance
- Coordination avec le notification-service pour la révocation des tokens push

## 3. Chiffrement et Protection des Données

### 3.1 Chiffrement au Repos

#### 3.1.1 Données Sensibles dans PostgreSQL
- Chiffrement des colonnes sensibles avec AES-256-GCM:
  - Secrets TOTP (twoFactorSecret)
  - Clés privées chiffrées (privateKeyEncrypted) 
- Utilisation d'un module de chiffrement Node.js standard (crypto)
- Stockage des clés de chiffrement dans des variables d'environnement

#### 3.1.2 Données Temporaires dans Redis
- Hachage des codes de vérification avec bcrypt (facteur de coût 10)
- TTL strict sur toutes les données temporaires sensibles
- Aucun stockage en clair des codes de sécurité

### 3.2 Chiffrement en Transit

#### 3.2.1 Communications Externes
- TLS 1.3 configuré pour toutes les communications API
- Certificats auto-signés pour le développement, certificats Let's Encrypt pour production
- Configuration des suites de chiffrement sécurisées
- HSTS pour forcer HTTPS

#### 3.2.2 Communications Inter-Services avec Istio
- **Service Mesh Istio** : Déploiement d'Istio pour la gestion du trafic et de la sécurité
- **mTLS automatique** : Chiffrement et authentification mutuelle automatique entre tous les services
- **Gestion automatique des certificats** : Istio gère la rotation et la distribution des certificats
- **Politiques de sécurité** : Configuration des NetworkPolicies et AuthorizationPolicies Istio
- **Zero Trust Network** : Aucune communication non chiffrée autorisée dans le cluster

### 3.3 Chiffrement de Bout en Bout (E2E)

#### 3.3.1 Implémentation du Protocole Signal
- Double Ratchet Algorithm pour la confidentialité persistante
- Courbes elliptiques X25519 pour l'échange de clés Diffie-Hellman
- Triple DHE pour l'établissement des sessions
- HMAC-SHA256 pour l'authentification des messages

#### 3.3.2 Gestion des Clés Cryptographiques
- Génération de 100 prekeys par utilisateur
- Rotation obligatoire des clés d'identité tous les 6 mois
- Destruction sécurisée des clés expirées
- Vérification des empreintes cryptographiques entre appareils

## 4. Protection Contre les Menaces

### 4.1 Contrôle des Accès et Rate Limiting

#### 4.1.1 Limitation de Débit (Rate Limiting)
- Implémentation du module @nestjs/throttler pour le rate limiting
- Limitation par IP: maximum 30 requêtes/minute sur les endpoints d'authentification
- Limitation par utilisateur: maximum 10 tentatives de vérification/heure
- Limitation par téléphone: maximum 5 envois de SMS/heure
- Délai progressif après échecs d'authentification répétés

#### 4.1.2 Détection des Comportements Anormaux
- Journalisation des tentatives d'authentification
- Alerte simple pour les tentatives répétées échouées
- Vérification basique de l'origine des connexions

### 4.2 Protection Contre les Attaques Courantes

#### 4.2.1 Injection et XSS
- Validation des entrées avec class-validator dans NestJS
- Utilisation de TypeORM avec requêtes paramétrées
- Configuration des headers de sécurité:
  - Content-Security-Policy
  - X-XSS-Protection
  - X-Content-Type-Options
- Échappement des données dans les réponses API

#### 4.2.2 CSRF et Clickjacking
- Implémentation de protection CSRF pour les opérations sensibles
- Configuration du header X-Frame-Options
- Validation de l'origine des requêtes

#### 4.2.3 Attaques par Déni de Service
- Configuration des timeouts appropriés
- Gestion des erreurs pour éviter les crashs
- Documentation des stratégies de scaling

### 4.3 Sécurité Mobile

#### 4.3.1 Stockage Sécurisé sur Appareil
- Recommandations d'utilisation du Keystore/Keychain pour le stockage des tokens
- Chiffrement des données sensibles stockées localement
- Nettoyage des données sensibles lors de la déconnexion

#### 4.3.2 Communication Sécurisée
- Implémentation du certificate pinning basique
- Vérification des signatures TLS
- Prévention des captures d'écran sur les écrans sensibles dans l'application mobile

## 5. Gestion des Secrets

### 5.1 Sécurisation des Secrets d'Application

#### 5.1.1 Stockage des Secrets
- Utilisation des variables d'environnement pour les secrets
- Configuration via dotenv (.env) avec différents fichiers par environnement
- Exclusion stricte des fichiers .env du versionnement Git
- Pas de secrets en dur dans le code (vérification via revues de code)

#### 5.1.2 Rotation des Secrets
- Procédure documentée pour la rotation des clés JWT
- Procédure documentée pour la rotation des API keys des services tiers
- Conservation des clés précédentes pendant une période de transition

### 5.2 Gestion des Clés de Chiffrement

#### 5.2.1 Hiérarchie des Clés
- Architecture à deux niveaux:
  - Clés maîtres (Key Encryption Keys, KEK)
  - Clés de chiffrement des données (Data Encryption Keys, DEK)
- Dérivation de clés avec HKDF pour les usages spécifiques

#### 5.2.2 Protection des Clés Maîtres
- Clés maîtres stockées de manière sécurisée dans des variables d'environnement
- Séparation des clés pour différents environnements (dev, test, prod)
- Accès limité aux clés maîtres
- Documentation du processus de gestion des clés

## 6. Détection et Réponse aux Incidents

### 6.1 Journalisation et Surveillance

#### 6.1.1 Journalisation Sécurisée
- Journalisation structurée des événements de sécurité:
  - Tentatives d'authentification (réussies et échouées)
  - Génération et utilisation de codes de vérification
  - Activation/désactivation de l'authentification 2FA
  - Modification des paramètres de sécurité
  - Événements de synchronisation avec les autres services
- Format de journalisation JSON via NestJS Logger
- Horodatage précis en UTC
- Masquage des données sensibles dans les logs

#### 6.1.2 Surveillance et Alertes
- Logs consolidés dans une solution simple (par exemple ELK Stack basique)
- Alertes configurées pour les modèles suspects:
  - Hausse des échecs d'authentification
  - Tentatives d'authentification depuis des localisations inhabituelles
  - Activités inhabituelles sur les comptes
- Dashboard basique pour visualiser les activités de sécurité

### 6.2 Gestion des Incidents

#### 6.2.1 Classification des Incidents
- Niveaux de gravité définis:
  - Critique: Compromission potentielle des données utilisateur
  - Élevé: Violation de contrôle d'accès
  - Moyen: Tentatives répétées d'accès non autorisé
  - Faible: Anomalies mineures

#### 6.2.2 Procédures de Réponse
- Documentation des étapes à suivre en cas d'incident
- Liste des personnes à contacter (membres du projet)
- Instructions pour la collecte de preuves
- Procédure pour limiter l'impact (ex: désactivation temporaire de fonctionnalités)

## 7. Sécurité du Développement

### 7.1 Pratiques de Développement Sécurisé

#### 7.1.1 Recommandations de Sécurité
- Application des principes OWASP Top 10 dans le développement
- Utilisation des fonctionnalités de sécurité de NestJS
- Documentation des décisions de sécurité dans le code
- Revues de code avec attention particulière aux questions de sécurité

#### 7.1.2 Revue de Code et Tests
- Revue de sécurité pour les composants critiques
- Tests unitaires pour les fonctionnalités de sécurité
- Analyse statique de code avec ESLint et les règles de sécurité
- Tests manuels des fonctionnalités sensibles

### 7.2 Gestion des Dépendances

#### 7.2.1 Contrôle des Dépendances
- Évaluation des dépendances avant intégration
- Analyse des vulnérabilités avec npm audit
- Utilisation de versions spécifiques des dépendances
- Documentation des dépendances utilisées et de leur objectif

#### 7.2.2 Mise à Jour des Dépendances
- Vérification régulière des mises à jour de sécurité
- Tests de régression après les mises à jour
- Documentation du processus de mise à jour

## 8. Standards de Sécurité

### 8.1 Normes et Bonnes Pratiques

#### 8.1.1 Conformité aux Standards
- Alignement sur les standards pertinents:
  - OWASP Top 10
  - Bonnes pratiques NestJS
  - Recommandations de sécurité pour Node.js
- Documentation des choix de sécurité et de leur justification

#### 8.1.2 Protection des Données Personnelles
- Principes RGPD appliqués comme bonne pratique
- Minimisation des données collectées
- Processus documenté de suppression des données

### 8.2 Tests de Sécurité

#### 8.2.1 Tests Manuels
- Tests d'application des contrôles de sécurité
- Vérification des erreurs et failles évidentes
- Tests des limites et des cas d'erreur
- Test des fonctionnalités d'authentification et d'autorisation

#### 8.2.2 Outils d'Analyse
- Utilisation d'outils open-source pour l'analyse de sécurité
- Vérification des vulnérabilités connues dans les dépendances
- Analyse statique de code avec les règles de sécurité configurées

## 9. Sauvegarde et Récupération

### 9.1 Sauvegarde et Récupération

#### 9.1.1 Stratégie de Sauvegarde
- Sauvegardes régulières de la base de données PostgreSQL
- Utilisation de pg_dump avec chiffrement des fichiers de sauvegarde
- Conservation des sauvegardes pendant au moins 7 jours
- Documentation du processus de sauvegarde

#### 9.1.2 Plan de Récupération
- Procédure documentée de restauration de la base de données
- Tests de restauration effectués pendant la phase de développement
- Documentation des dépendances entre services pour la récupération

### 9.2 Déploiement Sécurisé

#### 9.2.1 Procédure de Déploiement
- Environnements séparés (développement, test, production)
- Validation des configurations avant déploiement
- Scripts automatisés pour éviter les erreurs manuelles
- Capacité de revenir à la version précédente

## 10. Communication Inter-Services avec Istio

### 10.1 Architecture Service Mesh

#### 10.1.1 Configuration Istio
- **Service Mesh Istio** : Déploiement d'Istio dans le cluster GKE pour gérer toutes les communications inter-services
- **Sidecar Envoy** : Injection automatique des proxies Envoy dans tous les pods de microservices
- **mTLS strict** : Configuration en mode STRICT pour forcer l'authentification mutuelle
- **Certificats automatiques** : Istio génère et rotate automatiquement les certificats X.509

#### 10.1.2 Politiques de Sécurité Istio
- **PeerAuthentication** : Configuration mTLS strict pour tous les services
- **AuthorizationPolicy** : Règles d'autorisation granulaires entre services
- **NetworkPolicy** : Isolation réseau au niveau Kubernetes complétée par Istio
- **SecurityPolicy** : Politiques de sécurité spécifiques par service

```yaml
# Exemple de PeerAuthentication strict
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: whispr
spec:
  mtls:
    mode: STRICT
```

### 10.2 Sécurité des Communications

#### 10.2.1 mTLS Automatique
- **Chiffrement automatique** : Toutes les communications inter-services chiffrées par défaut
- **Authentification mutuelle** : Vérification bidirectionnelle de l'identité des services
- **Rotation automatique des certificats** : Gestion transparente du cycle de vie des certificats
- **Identité basée sur SPIFFE** : Identités cryptographiques standardisées pour chaque service

#### 10.2.2 Contrôle d'Accès Granulaire
- **Service-to-Service Authorization** : Règles d'autorisation par service et par opération
- **JWT Validation** : Validation des tokens JWT pour les requêtes utilisateur
- **Rate Limiting distribué** : Limitation de débit au niveau du service mesh
- **Circuit Breakers** : Protection contre les cascades de pannes

### 10.3 Gestion des Appareils avec Istio

#### 10.3.1 Coordination Sécurisée auth-service ↔ notification-service
- **gRPC over mTLS** : Communications sécurisées automatiquement par Istio
- **Service Discovery** : Résolution automatique des services via Istio
- **Load Balancing** : Répartition de charge intelligente entre les instances
- **Observabilité** : Traces distribuées pour le debugging et l'audit

#### 10.3.2 Politiques d'Autorisation Spécifiques
```yaml
# AuthorizationPolicy pour auth-service → notification-service
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: auth-to-notification
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
        methods: ["POST", "GET", "PUT", "DELETE"]
```

### 10.4 Monitoring et Observabilité

#### 10.4.1 Métriques de Sécurité
- **mTLS Success Rate** : Taux de succès des connexions mTLS
- **Certificate Rotation Events** : Événements de rotation des certificats
- **Authorization Denials** : Tentatives d'accès refusées
- **Service-to-Service Latency** : Latence des communications sécurisées

#### 10.4.2 Logging et Audit
- **Access Logs Envoy** : Logs détaillés de tous les accès inter-services
- **Audit des Politiques** : Journalisation des applications de politiques de sécurité
- **Distributed Tracing** : Traçage des requêtes à travers tous les services
- **Security Events** : Alertes sur les événements de sécurité suspects

### 10.2 Gestion des Appareils

#### 10.2.1 Coordination avec le Notification-Service
- **Enregistrement d'appareils**: Le auth-service valide l'identité, le notification-service gère les métadonnées d'appareil
- **Révocation d'appareils**: Coordination entre les services pour invalider les sessions et les tokens push
- **Synchronisation des états**: Maintien de la cohérence entre les sessions actives et les appareils enregistrés

#### 10.2.2 Sécurité des Références d'Appareils
- Utilisation d'identifiants UUID pour les appareils (pas d'informations sensibles)
- Validation croisée des références d'appareils entre services
- Journalisation des événements de synchronisation pour audit
- Gestion des cas où le notification-service est indisponible

## 11. Documentation

### 11.1 Documentation de Sécurité

#### 11.1.1 Documentation Technique
- Architecture de sécurité documentée
- Guide d'implémentation des fonctionnalités de sécurité
- Documentation du modèle de menaces
- Diagrammes de flux de données avec contrôles de sécurité

#### 11.1.2 Documentation Inter-Services
- Interfaces de sécurité entre auth-service et notification-service
- Procédures de synchronisation des données sécurisées
- Documentation des dépendances de sécurité entre services
- Guides de déploiement coordonné des services

### 11.2 Documentation Utilisateur

#### 11.2.1 Guides Utilisateur
- Guide d'utilisation des fonctionnalités de sécurité
- Bonnes pratiques pour les utilisateurs
- Procédure pour signaler des problèmes de sécurité

---

## Annexes

### A. Matrice des Risques et Contrôles

| Risque | Probabilité | Impact | Mesures de Contrôle |
|--------|-------------|--------|---------------------|
| Compromission des clés Signal | Faible | Critique | Rotation des clés, stockage sécurisé |
| Attaque par force brute | Moyenne | Élevé | Rate limiting, détection des anomalies |
| Vol de token d'authentification | Moyenne | Élevé | Courte durée de vie, révocation |
| Injection SQL | Faible | Critique | ORM, requêtes paramétrées |
| Fuite de données sensibles | Faible | Critique | Chiffrement, masquage des logs |
| Compromission communication inter-services | Faible | Critique | mTLS automatique Istio, AuthorizationPolicies |
| Déni de service sur service mesh | Moyenne | Élevé | Circuit breakers, rate limiting Istio |
| Misconfiguration Istio | Moyenne | Élevé | Validation des policies, tests automatisés |
| Certificat mTLS compromis | Faible | Élevé | Rotation automatique, monitoring Istio |
| Désynchronisation inter-services | Faible | Moyen | Service discovery Istio, retry policies |

### B. Références

- OWASP Authentication Cheat Sheet
- NIST Special Publication 800-63B: Digital Identity Guidelines
- Signal Protocol Specification
- NestJS Security Best Practices
- Istio Security Best Practices
- SPIFFE/SPIRE Documentation
- Kubernetes Security Best Practices
- Envoy Proxy Security Guide