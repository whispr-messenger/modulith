# ⚡️ Guide de Déploiement en Production - Auth Service

##  Prérequis

### Système
- Node.js 18+
- npm 8+
- PostgreSQL 14+
- Redis 6+
- PM2 (recommandé pour la gestion des processus)

### Sécurité
- Certificats SSL/TLS
- Clés JWT EC256 générées de manière sécurisée
- Variables d'environnement sécurisées

##  Configuration de Production

### 1. Variables d'Environnement

Copiez `.env.production` et configurez les variables suivantes :

```bash
# Variables critiques à configurer
DB_HOST=your-postgres-host
DB_USERNAME=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=auth_service_prod

REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

JWT_PRIVATE_KEY=your-ec256-private-key
JWT_PUBLIC_KEY=your-ec256-public-key

SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-secret
SMS_FROM_NUMBER=your-phone-number

CORS_ORIGIN=https://your-frontend-domain.com
```

### 2. Génération des Clés JWT

```bash
# Générer une clé privée EC256
openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem

# Générer la clé publique correspondante
openssl ec -in private-key.pem -pubout -out public-key.pem

# Convertir en format environnement (une ligne)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private-key.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public-key.pem
```

### 3. Configuration de la Base de Données

```sql
-- Créer la base de données
CREATE DATABASE auth_service_prod;

-- Créer un utilisateur dédié
CREATE USER auth_service_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE auth_service_prod TO auth_service_user;
```

### 4. Configuration Redis

```bash
# Configuration Redis recommandée
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

##  Déploiement

### 1. Installation

```bash
# Cloner le repository
git clone <repository-url>
cd auth-service

# Installer les dépendances
npm ci --only=production

# Build de l'application
npm run build
```

### 2. Migrations de Base de Données

```bash
# Exécuter les migrations
npm run migration:run

# Vérifier le statut
npm run migration:show
```

### 3. Tests de Production

```bash
# Exécuter tous les tests
npm test

# Tests d'intégration
npm run test:e2e
```

### 4. Démarrage avec PM2

```bash
# Installer PM2 globalement
npm install -g pm2

# Créer le fichier ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'auth-service',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save
pm2 startup
```

##  Monitoring et Maintenance

### Health Checks

```bash
# Vérifier la santé de l'application
curl http://localhost:3000/health

# Vérifier les métriques
curl http://localhost:9090/metrics
```

### Logs

```bash
# Voir les logs en temps réel
pm2 logs auth-service

# Logs d'erreur uniquement
pm2 logs auth-service --err

# Logs avec filtre
pm2 logs auth-service | grep ERROR
```

### Commandes PM2 Utiles

```bash
# Status des applications
pm2 status

# Redémarrer l'application
pm2 restart auth-service

# Recharger sans downtime
pm2 reload auth-service

# Arrêter l'application
pm2 stop auth-service

# Supprimer l'application
pm2 delete auth-service

# Monitoring en temps réel
pm2 monit
```

##  Sécurité en Production

### 1. Firewall

```bash
# Autoriser seulement les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Application (si pas de reverse proxy)
sudo ufw enable
```

### 2. Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req zone=api burst=20 nodelay;
}
```

### 3. Sauvegarde Automatique

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/auth-service"
DATE=$(date +%Y%m%d_%H%M%S)

# Sauvegarde de la base de données
pg_dump -h $DB_HOST -U $DB_USERNAME $DB_NAME > "$BACKUP_DIR/db_backup_$DATE.sql"

# Sauvegarde Redis
redis-cli --rdb "$BACKUP_DIR/redis_backup_$DATE.rdb"

# Nettoyer les anciennes sauvegardes (garder 7 jours)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.rdb" -mtime +7 -delete
```

##  Dépannage

### Problèmes Courants

1. **Application ne démarre pas**
   ```bash
   # Vérifier les logs
   pm2 logs auth-service --err

   # Vérifier la configuration
   node -e "console.log(process.env.NODE_ENV)"
   ```

2. **Erreurs de base de données**
   ```bash
   # Tester la connexion
   psql -h $DB_HOST -U $DB_USERNAME -d $DB_NAME -c "SELECT 1;"

   # Vérifier les migrations
   npm run migration:show
   ```

3. **Erreurs Redis**
   ```bash
   # Tester la connexion
   redis-cli -h $REDIS_HOST ping

   # Vérifier la mémoire
   redis-cli info memory
   ```

### Métriques à Surveiller

- CPU et mémoire de l'application
- Temps de réponse des endpoints
- Taux d'erreur HTTP
- Connexions à la base de données
- Utilisation de Redis
- Taux de succès des SMS

##  Optimisations de Performance

### 1. Configuration Node.js

```bash
# Variables d'environnement pour les performances
export NODE_OPTIONS="--max-old-space-size=1024"
export UV_THREADPOOL_SIZE=16
```

### 2. Configuration PostgreSQL

```sql
-- Optimisations pour la production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### 3. Indexation

```sql
-- Index recommandés pour les performances
CREATE INDEX CONCURRENTLY idx_user_auth_email ON user_auth(email);
CREATE INDEX CONCURRENTLY idx_user_auth_phone ON user_auth(phone_number);
CREATE INDEX CONCURRENTLY idx_device_user_id ON device(user_id);
CREATE INDEX CONCURRENTLY idx_login_history_user_id ON login_history(user_id);
CREATE INDEX CONCURRENTLY idx_login_history_created_at ON login_history(created_at);
```

##  Mise à Jour

```bash
# Script de mise à jour
#!/bin/bash

# Sauvegarder avant la mise à jour
./backup.sh

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
npm ci --only=production

# Build de la nouvelle version
npm run build

# Exécuter les nouvelles migrations
npm run migration:run

# Redémarrer l'application sans downtime
pm2 reload auth-service

# Vérifier que tout fonctionne
curl http://localhost:3000/health
```

---

**⚠️ Important :** Testez toujours les déploiements sur un environnement de staging avant la production !
