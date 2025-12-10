# Production Deployment Guide

This guide covers deploying Lecture to Slides to production environments.

## 🎯 Deployment Options

### Option 1: Docker Compose (Recommended)
- **Best for**: Small to medium deployments
- **Complexity**: Low
- **Scalability**: Limited
- **Maintenance**: Easy

### Option 2: Kubernetes
- **Best for**: Large scale deployments
- **Complexity**: High
- **Scalability**: Excellent
- **Maintenance**: Complex

### Option 3: Cloud Platforms
- **Best for**: Managed deployments
- **Complexity**: Medium
- **Scalability**: Good
- **Maintenance**: Managed

## 🐳 Docker Compose Deployment

### Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Server Setup
```bash
# Create application user
sudo useradd -m -s /bin/bash lecture-app
sudo usermod -aG docker lecture-app

# Create application directory
sudo mkdir -p /opt/lecture-to-slides
sudo chown lecture-app:lecture-app /opt/lecture-to-slides
```

### Application Deployment
```bash
# Switch to application user
sudo su - lecture-app

# Clone repository
cd /opt/lecture-to-slides
git clone <repository-url> .

# Configure environment
cp backend/production.env.example backend/.env
cp frontend/.env.production.example frontend/.env.production

# Edit configuration files
nano backend/.env
nano frontend/.env.production
```

### Environment Configuration

**Backend (.env):**
```bash
# Database
DATABASE_URL=postgresql://lecture_user:secure_password@postgres:5432/lecture_to_slides

# Security
SECRET_KEY=your_cryptographically_secure_random_key_here_minimum_32_chars
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI Services
GOOGLE_API_KEY=your_actual_gemini_api_key_here
WHISPER_MODEL_SIZE=base

# File Storage
TEMP_FILE_DIR=/app/temp_uploads
MAX_FILE_SIZE_MB=500
MAX_DURATION_MINUTES=120

# Production Settings
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Optional Services
REDIS_URL=redis://redis:6379/0
SENTRY_DSN=your_sentry_dsn_for_error_tracking

# Database Password (for Docker Compose)
POSTGRES_PASSWORD=secure_database_password_here
```

**Frontend (.env.production):**
```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### SSL Certificate Setup
```bash
# Create SSL directory
mkdir -p ssl

# Option 1: Let's Encrypt (Recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
sudo chown lecture-app:lecture-app ssl/*

# Option 2: Self-signed (Development only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

### Start Services
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Test health
curl http://localhost/health
```

## ☸️ Kubernetes Deployment

### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Create Kubernetes Manifests

**namespace.yaml:**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lecture-to-slides
```

**configmap.yaml:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: lecture-to-slides
data:
  ENVIRONMENT: "production"
  DEBUG: "false"
  LOG_LEVEL: "INFO"
  MAX_FILE_SIZE_MB: "500"
  MAX_DURATION_MINUTES: "120"
```

**secrets.yaml:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: lecture-to-slides
type: Opaque
stringData:
  SECRET_KEY: "your_secret_key_here"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/lecture_to_slides"
  GOOGLE_API_KEY: "your_gemini_api_key"
  REDIS_URL: "redis://redis:6379/0"
```

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: lecture-to-slides
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: lecture-to-slides/backend:latest
        ports:
        - containerPort: 8000
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Deploy to Kubernetes
```bash
# Apply manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n lecture-to-slides

# View logs
kubectl logs -f deployment/backend -n lecture-to-slides

# Port forward for testing
kubectl port-forward service/frontend 3000:3000 -n lecture-to-slides
```

## ☁️ Cloud Platform Deployment

### AWS Deployment

**Using AWS ECS:**
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS
aws configure

# Create ECS cluster
aws ecs create-cluster --cluster-name lecture-to-slides

# Build and push images
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

docker build -t lecture-to-slides/backend backend/
docker tag lecture-to-slides/backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/lecture-to-slides/backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/lecture-to-slides/backend:latest
```

**Using AWS App Runner:**
```yaml
# apprunner.yaml
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "Build started on `date`"
      - docker build -t lecture-to-slides .
run:
  runtime-version: latest
  command: uvicorn main:app --host 0.0.0.0 --port 8000
  network:
    port: 8000
    env: PORT
  env:
    - name: DATABASE_URL
      value: "postgresql://..."
    - name: SECRET_KEY
      value: "..."
```

### Google Cloud Platform

**Using Cloud Run:**
```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/lecture-to-slides-backend backend/
gcloud run deploy --image gcr.io/PROJECT-ID/lecture-to-slides-backend --platform managed
```

### Azure Deployment

**Using Container Instances:**
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and deploy
az login
az container create \
  --resource-group myResourceGroup \
  --name lecture-to-slides \
  --image lecture-to-slides/backend:latest \
  --dns-name-label lecture-to-slides \
  --ports 8000
```

## 🔧 Production Configuration

### Database Setup

**PostgreSQL Configuration:**
```sql
-- Create database and user
CREATE DATABASE lecture_to_slides;
CREATE USER lecture_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE lecture_to_slides TO lecture_user;

-- Performance tuning
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
SELECT pg_reload_conf();
```

### Redis Configuration
```bash
# /etc/redis/redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/lecture-to-slides
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # File uploads
    location /api/lectures/process {
        limit_req zone=upload burst=5 nodelay;
        
        client_max_body_size 500M;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        
        proxy_pass http://backend:8000/lectures/process;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# Application health
curl -f http://localhost/health || exit 1

# Database health
docker exec postgres pg_isready -U lecture_user

# Redis health
docker exec redis redis-cli ping
```

### Backup Strategy
```bash
#!/bin/bash
# backup.sh

# Database backup
docker exec postgres pg_dump -U lecture_user lecture_to_slides | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# File backup
tar -czf files_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/temp_uploads backend/exports

# Upload to cloud storage (example with AWS S3)
aws s3 cp backup_*.sql.gz s3://your-backup-bucket/database/
aws s3 cp files_backup_*.tar.gz s3://your-backup-bucket/files/

# Cleanup old backups (keep last 7 days)
find . -name "backup_*.sql.gz" -mtime +7 -delete
find . -name "files_backup_*.tar.gz" -mtime +7 -delete
```

### Log Management
```bash
# Configure log rotation
cat > /etc/logrotate.d/lecture-to-slides << EOF
/var/log/lecture-to-slides/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 lecture-app lecture-app
    postrotate
        docker-compose restart
    endscript
}
EOF
```

### Update Process
```bash
#!/bin/bash
# update.sh

# Backup before update
./backup.sh

# Pull latest changes
git pull origin main

# Update dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install

# Rebuild and restart services
docker-compose build
docker-compose up -d

# Run health checks
sleep 30
curl -f http://localhost/health || (echo "Health check failed" && exit 1)

echo "Update completed successfully"
```

## 🔒 Security Checklist

### Pre-deployment Security
- [ ] Change all default passwords
- [ ] Generate secure random keys
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Enable fail2ban for SSH protection
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerting

### Runtime Security
- [ ] Regular security updates
- [ ] Dependency vulnerability scanning
- [ ] Log monitoring for suspicious activity
- [ ] Regular backup testing
- [ ] SSL certificate renewal
- [ ] Access log analysis

### Compliance
- [ ] FERPA compliance review (if applicable)
- [ ] Data retention policies
- [ ] Privacy policy updates
- [ ] Terms of service
- [ ] User consent mechanisms

## 🚨 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose logs service-name

# Check configuration
docker-compose config

# Restart specific service
docker-compose restart service-name
```

**Database connection issues:**
```bash
# Test database connection
docker exec backend python -c "from database import engine; print(engine.url)"

# Check database logs
docker-compose logs postgres
```

**SSL certificate issues:**
```bash
# Check certificate validity
openssl x509 -in ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect yourdomain.com:443
```

**Performance issues:**
```bash
# Check resource usage
docker stats

# Monitor database performance
docker exec postgres psql -U lecture_user -d lecture_to_slides -c "SELECT * FROM pg_stat_activity;"

# Check application metrics
curl http://localhost:8000/metrics
```

### Emergency Procedures

**Service outage:**
1. Check service status: `docker-compose ps`
2. Review logs: `docker-compose logs --tail=100`
3. Restart services: `docker-compose restart`
4. If persistent, rollback: `git checkout previous-tag && docker-compose up -d`

**Data corruption:**
1. Stop services: `docker-compose stop`
2. Restore from backup: `./restore.sh`
3. Verify data integrity
4. Restart services: `docker-compose start`

**Security incident:**
1. Isolate affected systems
2. Change all passwords and keys
3. Review access logs
4. Update security measures
5. Notify users if necessary

## 📞 Support

For deployment issues:
- Check the troubleshooting section above
- Review application logs
- Consult the main README.md
- Open a GitHub issue with deployment details