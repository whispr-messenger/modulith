# Guide de Déploiement - Microservice d'Authentification

## Prérequis

- Node.js 18+
- Docker et Docker Compose
- PostgreSQL 15+
- Redis 7+

## Configuration Initiale

### 1. Variables d'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer les variables selon votre environnement
nano .env
```

### 2. Génération des Clés JWT

```bash
# Générer la clé privée
openssl genpkey -algorithm RSA -out jwt-private.key -pkcs8 -pkeyopt rsa_keygen_bits:2048

# Générer la clé publique
openssl rsa -pubout -in jwt-private.key -out jwt-public.key

# Encoder en base64 pour les variables d'environnement
echo "JWT_PRIVATE_KEY=$(base64 -i jwt-private.key)"
echo "JWT_PUBLIC_KEY=$(base64 -i jwt-public.key)"
```

## Déploiement Local

### Option 1: Script Automatique

```bash
./scripts/start.sh
```

### Option 2: Manuel

```bash
# 1. Installer les dépendances
npm install

# 2. Construire l'application
npm run build

# 3. Démarrer les services de base de données
docker-compose up -d postgres redis

# 4. Attendre que les services soient prêts
sleep 10

# 5. Démarrer l'application
npm run start:dev
```

## Déploiement avec Docker

### Construction de l'Image

```bash
# Construire l'image
docker build -t auth-service:latest .

# Ou utiliser Docker Compose
docker-compose build auth-service
```

### Démarrage Complet

```bash
# Démarrer tous les services
docker-compose up -d

# Vérifier les logs
docker-compose logs -f auth-service
```

## Déploiement en Production

### 1. Configuration de Production

```bash
# Variables d'environnement de production
export NODE_ENV=production
export APP_PORT=3000
export DB_HOST=your-postgres-host
export REDIS_HOST=your-redis-host
```

### 2. Base de Données

```bash
# Initialiser la base de données
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/init.sql
```

### 3. Démarrage de Production

```bash
# Construire pour la production
npm run build

# Démarrer en mode production
npm run start:prod
```

## Vérification du Déploiement

### Health Check

```bash
curl http://localhost:3000/health
```

Réponse attendue:
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Test des Endpoints

```bash
# Test d'inscription
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Test de connexion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

## Monitoring et Logs

### Logs Docker

```bash
# Voir les logs en temps réel
docker-compose logs -f auth-service

# Logs des services de base de données
docker-compose logs postgres redis
```

### Métriques de Performance

- CPU et mémoire via Docker stats
- Connexions base de données
- Temps de réponse des endpoints
- Taux d'erreur

## Sécurité

### Checklist de Sécurité

- [ ] Clés JWT générées de manière sécurisée
- [ ] Variables d'environnement protégées
- [ ] HTTPS activé en production
- [ ] Rate limiting configuré
- [ ] Logs de sécurité activés
- [ ] Base de données sécurisée
- [ ] Firewall configuré

### Rotation des Clés

```bash
# Générer de nouvelles clés JWT
./scripts/rotate-jwt-keys.sh

# Redémarrer le service
docker-compose restart auth-service
```

## Dépannage

### Problèmes Courants

1. **Erreur de connexion à PostgreSQL**
   ```bash
   docker-compose logs postgres
   ```

2. **Erreur de connexion à Redis**
   ```bash
   docker-compose logs redis
   ```

3. **Erreurs de compilation TypeScript**
   ```bash
   npm run build
   ```

4. **Problèmes de permissions**
   ```bash
   chmod +x scripts/*.sh
   ```

### Commandes Utiles

```bash
# Nettoyer les containers
docker-compose down -v

# Reconstruire complètement
docker-compose build --no-cache

# Réinitialiser la base de données
docker-compose down -v && docker-compose up -d postgres
```

## Support

Pour toute question ou problème:
1. Vérifiez les logs
2. Consultez la documentation API
3. Vérifiez la configuration des variables d'environnement
4. Testez la connectivité réseau