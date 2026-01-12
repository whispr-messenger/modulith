# Auth Service - Production Deployment Guide

This guide covers the production deployment of the Auth Service using Docker and Docker Compose.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- SSL certificates for HTTPS
- Domain name configured
- Minimum 2GB RAM, 2 CPU cores
- 20GB disk space

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd auth-service
   cp .env.example .env
   ```

2. **Configure environment**:
   Edit `.env` file with your production values:
   ```bash
   nano .env
   ```

3. **Setup SSL certificates**:
   ```bash
   mkdir -p ssl
   # Copy your SSL certificates
   cp /path/to/your/cert.pem ssl/
   cp /path/to/your/key.pem ssl/
   ```

4. **Deploy**:
   ```bash
   ./deploy.sh
   ```

## Environment Configuration

### Required Environment Variables

```bash
# Database
DB_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password

# JWT Keys (Generate with OpenSSL)
JWT_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# SMS Service
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret
```

### Generating JWT Keys

```bash
# Generate private key
openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem

# Generate public key
openssl ec -in private-key.pem -pubout -out public-key.pem

# Convert to environment variable format
echo "JWT_PRIVATE_KEY=\"$(awk '{printf "%s\\n", $0}' private-key.pem)\""
echo "JWT_PUBLIC_KEY=\"$(awk '{printf "%s\\n", $0}' public-key.pem)\""
```

## SSL Certificate Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown $USER:$USER ssl/*.pem
```

### Option 2: Self-signed (Development only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Deployment Commands

```bash
# Deploy application
./deploy.sh deploy

# Check health
./deploy.sh health

# Create backup
./deploy.sh backup

# Rollback deployment
./deploy.sh rollback

# Cleanup old resources
./deploy.sh cleanup
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f auth-service

# Application logs
tail -f logs/app.log
```

### Health Checks

- Application: `https://yourdomain.com/health`
- Database: `docker-compose -f docker-compose.prod.yml exec postgres pg_isready`
- Redis: `docker-compose -f docker-compose.prod.yml exec redis redis-cli ping`

## Database Management

### Backup

```bash
# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U auth_user auth_service > backup.sql

# Automated backup (via deploy script)
./deploy.sh backup
```

### Restore

```bash
# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U auth_user -d auth_service < backup.sql
```

### Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec auth-service npm run migration:run

# Revert migration
docker-compose -f docker-compose.prod.yml exec auth-service npm run migration:revert
```

## Security Considerations

### Firewall Configuration

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP (redirects to HTTPS)
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
./deploy.sh
```

### Secrets Management

- Never commit `.env` file to version control
- Use Docker secrets or external secret management
- Rotate JWT keys regularly
- Monitor for security vulnerabilities

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_user_auth_phone ON user_auth(phone_number);
CREATE INDEX CONCURRENTLY idx_device_user_id ON device(user_id);
CREATE INDEX CONCURRENTLY idx_login_history_user ON login_history(user_id, created_at);
```

### Redis Configuration

```bash
# Optimize Redis memory usage
echo "maxmemory 512mb" >> redis.conf
echo "maxmemory-policy allkeys-lru" >> redis.conf
```

## Troubleshooting

### Common Issues

1. **Container won't start**:
   ```bash
   docker-compose -f docker-compose.prod.yml logs auth-service
   ```

2. **Database connection issues**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec postgres psql -U auth_user -d auth_service -c "SELECT 1;"
   ```

3. **SSL certificate issues**:
   ```bash
   openssl x509 -in ssl/cert.pem -text -noout
   ```

4. **High memory usage**:
   ```bash
   docker stats
   ```

### Emergency Procedures

1. **Service Down**:
   ```bash
   ./deploy.sh rollback
   ```

2. **Database Corruption**:
   ```bash
   # Stop services
   docker-compose -f docker-compose.prod.yml down
   
   # Restore from backup
   ./deploy.sh backup  # This will restore latest backup
   ```

3. **Memory Issues**:
   ```bash
   # Restart services
   docker-compose -f docker-compose.prod.yml restart
   
   # Clean up
   docker system prune -f
   ```

## Maintenance Schedule

- **Daily**: Check logs and health status
- **Weekly**: Create database backup
- **Monthly**: Update system packages and Docker images
- **Quarterly**: Rotate JWT keys and review security

## Support

For production issues:
1. Check application logs: `tail -f logs/app.log`
2. Check container status: `docker-compose -f docker-compose.prod.yml ps`
3. Run health checks: `./deploy.sh health`
4. Review monitoring dashboards

## Architecture Overview

```
[Internet] → [Nginx] → [Auth Service] → [PostgreSQL]
                    ↘ [Redis Cache]
```

- **Nginx**: Reverse proxy, SSL termination, rate limiting
- **Auth Service**: NestJS application
- **PostgreSQL**: Primary database
- **Redis**: Session cache and rate limiting

All services run in Docker containers with health checks and automatic restarts.