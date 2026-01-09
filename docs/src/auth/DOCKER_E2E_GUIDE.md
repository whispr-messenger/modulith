# Guide des Tests E2E avec Docker

## 📋 Vue d'ensemble

Le projet supporte maintenant deux stratégies de tests e2e :

| Type | Commande | Services | Vitesse | Fiabilité |
|------|----------|----------|---------|-----------|
| **Tests Mockés** | `npm run test:e2e` | Mocks | ⚡ Rapide | ⭐⭐⭐ Bonne |
| **Tests Docker** | `npm run test:e2e:docker` | Réels (PostgreSQL, Redis) | 🐢 Lent | ⭐⭐⭐⭐⭐ Excellente |

## 🚀 Démarrage Rapide

### 1. Prérequis

- Docker et Docker Compose installés
- Node.js 22+
- Fichier `.env` configuré dans `docker/dev/`

### 2. Créer le fichier .env

```bash
./scripts/create-dev-env.sh
```

### 3. Lancer les tests

```bash
# Tests avec Docker (recommandé pour validation finale)
npm run test:e2e:docker

# Tests mockés (recommandé pour développement rapide)
npm run test:e2e
```

## 📖 Commandes Disponibles

```bash
# Tests E2E avec mocks (ancienne méthode, rapide)
npm run test:e2e

# Tests E2E avec Docker (nouvelle méthode, réaliste)
npm run test:e2e:docker

# Tests Docker + cleanup automatique de la stack
npm run test:e2e:docker:cleanup

# Juste exécuter les tests (stack déjà lancée)
npm run test:e2e:docker:run
```

## 🔧 Fonctionnement du Runner Docker

Le script `test/docker-e2e-runner.ts` automatise tout :

```
┌─────────────────────────────────────────┐
│ 1. Vérifications préliminaires          │
│    ✓ Docker disponible                  │
│    ✓ Docker Compose disponible          │
│    ✓ Fichier .env existe                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 2. Démarrage de la stack (si nécessaire)│
│    → docker compose up -d                │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 3. Attente de la santé des services     │
│    → Vérifie les healthchecks            │
│    → Timeout : 2 minutes                 │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 4. Exécution des tests                   │
│    → jest --config jest-docker-e2e.json  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ 5. Cleanup (optionnel avec --cleanup)    │
│    → docker compose down                  │
└─────────────────────────────────────────┘
```

## 🐳 Architecture Docker

Les tests se connectent aux services Docker :

```
┌──────────────────────┐
│   Tests E2E (Node)   │
│    localhost:*       │
└──────────┬───────────┘
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
┌─────┐ ┌────┐ ┌────┐
│ PG  │ │Redis│ │ API│
│:5432│ │:6379│ │:3001│
└─────┘ └────┘ └────┘
  whispr-network
```

## 📝 Configuration

### Variables d'environnement importantes

Dans `docker/dev/.env` :

```env
# PostgreSQL
POSTGRES_USER=whispr_auth
POSTGRES_PASSWORD=whispr_auth_password
POSTGRES_DB=whispr_auth_db
POSTGRES_PORT=5432

# Redis
REDIS_PORT=6379

# Application
HTTP_PORT=3001
```

### Ports exposés

- **PostgreSQL** : `localhost:5432`
- **Redis** : `localhost:6379`
- **API** : `localhost:3001`

⚠️ **Important** : Assurez-vous qu'aucun autre service n'utilise ces ports.

## 🔍 Debugging

### Vérifier l'état de la stack

```bash
docker compose -f docker/dev/compose.yml ps
```

### Voir les logs

```bash
# Tous les services
docker compose -f docker/dev/compose.yml logs

# Service spécifique
docker compose -f docker/dev/compose.yml logs postgres
docker compose -f docker/dev/compose.yml logs redis
docker compose -f docker/dev/compose.yml logs auth-service
```

### Arrêter la stack manuellement

```bash
docker compose -f docker/dev/compose.yml down

# Avec suppression des volumes
docker compose -f docker/dev/compose.yml down -v
```

### Redémarrer un service

```bash
docker compose -f docker/dev/compose.yml restart postgres
```

### Se connecter à PostgreSQL

```bash
docker exec -it whispr-auth-postgres psql -U whispr_auth -d whispr_auth_db
```

### Se connecter à Redis

```bash
docker exec -it whispr-auth-redis redis-cli
```

## ⚙️ Intégration CI/CD

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run Docker E2E tests
        run: npm run test:e2e:docker:cleanup
```

## 🎯 Bonnes Pratiques

### Quand utiliser tests mockés vs Docker ?

**Tests mockés** (`npm run test:e2e`) :
- ✅ Développement rapide
- ✅ CI/CD rapide
- ✅ Pas de dépendances externes
- ❌ Moins réaliste

**Tests Docker** (`npm run test:e2e:docker`) :
- ✅ Tests d'intégration réels
- ✅ Validation finale avant merge
- ✅ Détection de bugs subtils
- ❌ Plus lent

### Workflow recommandé

```bash
# Pendant le développement
npm run test:e2e

# Avant de commit/push
npm run test:e2e:docker

# En CI/CD
npm run test:e2e:docker:cleanup
```

## 🛠️ Troubleshooting

### Erreur : "Docker is not available"

```bash
# Vérifier Docker
docker --version

# Démarrer Docker Desktop (macOS/Windows)
# ou démarrer le daemon Docker (Linux)
sudo systemctl start docker
```

### Erreur : ".env file not found"

```bash
# Créer le fichier .env
./scripts/create-dev-env.sh
```

### Erreur : "Port already in use"

```bash
# Identifier le processus utilisant le port
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3001  # API

# Arrêter le processus ou changer le port dans .env
```

### Tests timeout

```bash
# Augmenter le timeout dans jest-docker-e2e.json
{
  "testTimeout": 60000  // 60 secondes
}
```

### Base de données dans un état invalide

```bash
# Réinitialiser complètement
docker compose -f docker/dev/compose.yml down -v
docker compose -f docker/dev/compose.yml up -d
```

## 📚 Ressources

- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation Jest](https://jestjs.io/)
- [Documentation NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
