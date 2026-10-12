# Deployment Guide

This guide covers deploying the Real-Time Collaborative Code Editor to production.

## Prerequisites

### Required Infrastructure
- **Docker** and **Docker Compose** (v3.8+)
- **MongoDB Atlas** account or self-hosted MongoDB 7+
- **Domain name** with SSL certificate (Let's Encrypt recommended)
- **Reverse proxy** (Nginx, Caddy, or cloud load balancer)
- **Minimum 4GB RAM** for all services
- **Docker socket access** for execution service

### Required Credentials
- MongoDB Atlas connection string
- JWT secret (minimum 32 characters, high entropy)
- Domain name and SSL certificate

## Architecture Overview

```
┌─────────────────┐
│   Client        │  Port 3000
│   (React SPA)   │  Static files
└────────┬────────┘
         │
┌────────▼────────┐
│   Reverse Proxy │  Port 443 (HTTPS)
│   (Nginx/Caddy) │  SSL termination
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    │         │            │
┌───▼───┐ ┌──▼────┐ ┌─────▼──────┐
│ Server│ │Execution│ │  MongoDB   │
│ :5000 │ │:4000   │ │  :27017    │
└───────┘ └────────┘ └────────────┘
```

## Deployment Options

### Option 1: Docker Compose (Recommended for Small Deployments)

#### Step 1: Prepare Environment

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd collaborative-code-editor
   ```

2. **Create production environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   ```bash
   # Generate a strong JWT secret
   openssl rand -base64 48
   
   # Edit .env file
   nano .env
   ```

   Required variables:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/collab-editor
   CLIENT_URL=https://your-domain.com
   NODE_ENV=production
   ```

#### Step 2: Configure Docker Compose

The `docker-compose.yml` is already configured for production. Verify:

```bash
docker-compose config
```

#### Step 3: Build and Start Services

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Step 4: Verify Deployment

```bash
# Check health endpoints
curl http://localhost:5000/api/v1/health
curl http://localhost:4000/health

# Check client
curl http://localhost:3000
```

### Option 2: Kubernetes (For Large Deployments)

#### Kubernetes Manifests

Create the following Kubernetes resources:

**1. Namespace**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: collab-editor
```

**2. Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: collab-editor-secrets
  namespace: collab-editor
type: Opaque
stringData:
  jwt-secret: your-jwt-secret
  mongodb-uri: mongodb+srv://...
```

**3. Deployments**

Create deployments for:
- Client (static files with Nginx)
- Server (Node.js API)
- Execution Service (with Docker-in-Docker or DinD sidecar)

**4. Services**

Create ClusterIP services for internal communication and LoadBalancer/Ingress for external access.

**5. Ingress**

Configure Ingress with TLS termination.

### Option 3: Cloud Platform Deployment

#### AWS

1. **ECS Fargate** for server and execution service
2. **S3 + CloudFront** for client static files
3. **MongoDB Atlas** for database
4. **ALB** for load balancing

#### Google Cloud

1. **Cloud Run** for server and execution service
2. **Cloud Storage + CDN** for client
3. **MongoDB Atlas** for database
4. **Cloud Load Balancing** for traffic

#### Azure

1. **Container Instances** or **AKS** for services
2. **Blob Storage + CDN** for client
3. **MongoDB Atlas** for database
4. **Application Gateway** for load balancing

## Reverse Proxy Configuration

### Nginx Configuration

```nginx
upstream client {
    server client:3000;
}

upstream server {
    server server:5000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client (React SPA)
    location / {
        proxy_pass http://client;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Server
    location /api {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://server;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
        
        # WebSocket timeout
        proxy_read_timeout 86400;
    }
}
```

### Caddy Configuration

```caddyfile
your-domain.com {
    # Client
    handle /* {
        reverse_proxy client:3000
    }

    # API
    handle /api/* {
        reverse_proxy server:5000
    }

    # Socket.IO
    handle /socket.io/* {
        reverse_proxy server:5000
    }
}
```

## MongoDB Atlas Setup

### Step 1: Create Cluster

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a new cluster (M10 or higher recommended)
3. Choose your cloud provider and region

### Step 2: Configure Network Access

1. Go to Network Access
2. Add IP address (0.0.0.0/0 for development, specific IPs for production)
3. Or use VPC peering for private connection

### Step 3: Create Database User

1. Go to Database Access
2. Create a new user with read/write permissions
3. Save credentials securely

### Step 4: Get Connection String

1. Go to Database → Connect
2. Choose "Connect your application"
3. Copy connection string
4. Replace `<password>` with actual password
5. Add to `.env` file as `MONGODB_URI`

## SSL/TLS Configuration

### Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

### Cloud Provider SSL

- **AWS**: ACM (AWS Certificate Manager)
- **Google Cloud**: Certificate Manager
- **Azure**: App Service Certificates

## Environment Variables Reference

### Server Environment

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Server port (default: 5000) | `5000` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://...` |
| `CLIENT_URL` | Yes | Frontend URL for CORS | `https://your-domain.com` |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) | `your-secret-key` |
| `JWT_EXPIRES_IN` | No | JWT expiration (default: 15m) | `15m` |
| `COOKIE_NAME` | No | Auth cookie name (default: auth_token) | `auth_token` |
| `COOKIE_SAME_SITE` | No | Cookie SameSite (default: lax) | `lax` |
| `EXECUTION_SERVICE_URL` | Yes | Execution service URL | `http://execution-service:4000` |

### Client Environment

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | Yes | API server URL | `https://your-domain.com` |
| `VITE_SOCKET_URL` | Yes | Socket.IO server URL | `https://your-domain.com` |

### Execution Service Environment

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | No | Service port (default: 4000) | `4000` |
| `NODE_ENV` | Yes | Environment mode | `production` |
| `API_SERVER_URL` | Yes | Main server URL for CORS | `http://server:5000` |

## Monitoring & Logging

### Health Checks

All services expose health endpoints:

```bash
# Server health
curl http://localhost:5000/api/v1/health

# Execution service health
curl http://localhost:4000/health
```

### Logging

Logs are output to stdout/stderr. Use Docker logging drivers or cloud logging:

```bash
# View logs
docker-compose logs -f server
docker-compose logs -f execution-service

# With Docker logging driver
docker-compose up -d --log-driver awslogs --log-opt awslogs-group=collab-editor
```

### Monitoring Tools

- **Prometheus + Grafana**: Metrics collection and visualization
- **ELK Stack**: Centralized logging
- **Datadog**: All-in-one monitoring
- **New Relic**: Application performance monitoring

## Backup & Recovery

### MongoDB Backups

#### MongoDB Atlas (Automatic)

1. Go to Clusters → Backup
2. Enable continuous backups
3. Configure backup schedule
4. Set retention period

#### Self-Hosted MongoDB

```bash
# Manual backup
mongodump --uri="mongodb+srv://..." --out=backup-$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb+srv://..." backup-20240115/
```

### Application Data

- User data: Stored in MongoDB
- Project files: Stored in MongoDB
- Execution results: Not persisted (ephemeral)

### Recovery Procedure

1. **Database Recovery**
   ```bash
   # Restore from backup
   mongorestore --uri="$MONGODB_URI" backup-directory/
   ```

2. **Application Recovery**
   ```bash
   # Restart services
   docker-compose restart
   
   # Or rebuild and restart
   docker-compose down
   docker-compose up -d --build
   ```

## Scaling

### Horizontal Scaling

#### Server

- Run multiple server instances behind load balancer
- Use sticky sessions for Socket.IO (or Redis adapter)
- Configure load balancer health checks

#### Execution Service

- Run multiple execution service instances
- Each instance needs Docker socket access
- Load balance execution requests

#### Client

- Static files can be served from CDN
- No scaling concerns for static assets

### Vertical Scaling

- Increase container resources in docker-compose.yml
- Allocate more CPU/RAM to execution service
- Use larger MongoDB Atlas tier

### Database Scaling

- MongoDB Atlas auto-scaling
- Read replicas for read-heavy workloads
- Sharding for very large datasets

## Security Checklist

Before going live, verify:

- [ ] JWT_SECRET is strong (min 32 chars, high entropy)
- [ ] MongoDB credentials are secure
- [ ] HTTPS is enabled with valid SSL certificate
- [ ] CORS is configured for production domain only
- [ ] Rate limiting is enabled
- [ ] Docker socket is secured (not exposed publicly)
- [ ] Execution service has no network access
- [ ] All environment variables are set
- [ ] .env file is not committed to git
- [ ] Security headers are configured
- [ ] MongoDB network access is restricted
- [ ] Backup strategy is in place
- [ ] Monitoring is configured
- [ ] Error tracking is set up

## Troubleshooting

### Server Won't Start

**Symptom**: Server container exits immediately

**Check**:
```bash
docker-compose logs server
```

**Common Issues**:
- Missing JWT_SECRET
- Invalid MONGODB_URI
- MongoDB not reachable
- Port already in use

### Execution Service Can't Execute

**Symptom**: Code execution fails with Docker errors

**Check**:
```bash
docker-compose logs execution-service
```

**Common Issues**:
- Docker socket not mounted
- Docker daemon not running
- Insufficient permissions
- Missing runtime images

### Socket.IO Connection Fails

**Symptom**: Real-time features don't work

**Check**:
- Reverse proxy supports WebSocket
- CORS configured correctly
- JWT token is valid
- Network connectivity

### MongoDB Connection Issues

**Symptom**: Database operations fail

**Check**:
```bash
docker-compose logs server | grep -i mongo
```

**Common Issues**:
- Wrong connection string
- Network access not configured
- Authentication failed
- Cluster paused (Atlas free tier)

## Performance Optimization

### Client

- Enable gzip/brotli compression in reverse proxy
- Configure caching headers for static assets
- Use CDN for static files
- Implement code splitting (already done)

### Server

- Enable response compression
- Use connection pooling (already configured)
- Cache frequently accessed data
- Optimize database queries

### Database

- Use appropriate indexes
- Enable read preferences
- Configure connection pooling
- Monitor slow queries

## Rollback Procedure

If deployment fails:

1. **Stop new services**
   ```bash
   docker-compose down
   ```

2. **Restore previous version**
   ```bash
   git checkout <previous-tag>
   ```

3. **Rebuild and start**
   ```bash
   docker-compose up -d --build
   ```

4. **Restore database if needed**
   ```bash
   mongorestore --uri="$MONGODB_URI" backup-directory/
   ```

## Post-Deployment Verification

After deployment, verify:

1. **Health Checks**
   ```bash
   curl https://your-domain.com/api/v1/health
   curl https://your-domain.com/api/v1/health/live
   curl https://your-domain.com/api/v1/health/ready
   ```

2. **Authentication**
   - Register a new user
   - Login successfully
   - Access protected routes

3. **Core Features**
   - Create a project
   - Create files and folders
   - Edit code in Monaco Editor
   - Save changes

4. **Real-Time Features**
   - Open in two browser tabs
   - Verify real-time collaboration
   - Test chat functionality

5. **Code Execution**
   - Execute JavaScript code
   - Execute TypeScript code
   - Execute Python code
   - Verify output and errors

## Support & Maintenance

### Regular Maintenance

- **Weekly**: Review logs, check for errors
- **Monthly**: Update dependencies, review security
- **Quarterly**: Performance review, capacity planning

### Dependency Updates

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Test after updates
npm run build:all
npm test
```

### Security Updates

- Monitor security advisories
- Apply patches promptly
- Review dependencies quarterly
- Run `npm audit` regularly

## Contact & Support

For deployment issues:
- Check logs: `docker-compose logs`
- Review documentation in `docs/` folder
- Check FINAL_AUDIT.md for known issues
- Review SECURITY.md for security concerns

---

**Last Updated**: 2024  
**Version**: 1.0  
**Status**: Production Ready (with caveats - see FINAL_AUDIT.md)
