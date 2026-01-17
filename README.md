# Voice You - Full Stack Docker Setup

A complete voice recording and S3 upload application with React frontend and FastAPI backend, all containerized with Docker.

## 📦 Architecture

- **Frontend**: React + Material UI running on port 3001 (Nginx)
- **Backend**: FastAPI + Uvicorn running on port 3000
- **Storage**: AWS S3 (configured via environment variables)
- **Network**: Shared Docker network for inter-service communication

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- AWS S3 bucket created
- AWS credentials (Access Key ID and Secret Access Key)

### Step 1: Configure Environment

Create a `.env` file in the project root:

```bash
cp fastapi-s3-upload/.env.example fastapi-s3-upload/.env
```

Edit `fastapi-s3-upload/.env`:
```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
DEBUG=False
```

### Step 2: Start All Services

**From the root directory** (`/Users/vasantharajanpandian/my-development/2026/vasanth-experiments/`):

```bash
docker-compose up --build
```

Or in detached mode:
```bash
docker-compose up -d --build
```

### Step 3: Access the Application

- **Frontend**: http://localhost:3001
- **FastAPI Docs**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health

## 📚 Services

### FastAPI Backend (Port 3000)
- Handles S3 uploads
- Provides file upload API endpoint
- Manages AWS authentication

**Start individually**:
```bash
cd fastapi-s3-upload
docker-compose up --build
```

### React Frontend (Port 3001)
- Voice recording interface
- Material UI components
- S3 integration

**Start individually**:
```bash
cd voice-you
docker-compose up --build
```

## 🎤 How to Use

1. **Open Frontend**: Navigate to http://localhost:3001
2. **Record Voice**: Go to "Your Voice" section
3. **Start Recording**: Click the record button
4. **Stop Recording**: Stop when done
5. **Upload**: Click "Upload to S3"
6. **Get URL**: Copy your S3 URL from the response

## 📝 Docker Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f fastapi-s3-upload
docker-compose logs -f voice-you
```

### Stop services
```bash
docker-compose down
```

### Remove everything (including volumes)
```bash
docker-compose down -v
```

### Rebuild images
```bash
docker-compose build --no-cache
```

### View running containers
```bash
docker ps
```

## 🔧 Environment Variables

### FastAPI Backend (.env)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)
- `S3_BUCKET_NAME` - S3 bucket name
- `DEBUG` - Debug mode (default: False)

### React Frontend (Built-in)
- `REACT_APP_API_URL` - Backend API URL (default: http://fastapi-s3-upload:3000)

## 📂 Project Structure

```
.
├── fastapi-s3-upload/          # FastAPI backend
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── app/
│   ├── pyproject.toml
│   └── .env (create this)
├── voice-you/                  # React frontend
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── nginx.conf
│   ├── src/
│   ├── public/
│   └── package.json
└── docker-compose.yml          # Root compose file (runs both)
```

## 🌐 Networking

All services communicate through a shared Docker network (`voice-network`). This allows:
- Frontend to access backend at `http://fastapi-s3-upload:3000`
- Services can reach each other by container name

## ✅ Health Checks

Both services have health checks:
- **FastAPI**: Checks `/health` endpoint every 30s
- **React**: Checks root `/` endpoint every 30s

View health status:
```bash
docker ps
```

## 🚨 Troubleshooting

### Frontend can't connect to backend
- Ensure both services are running: `docker ps`
- Check logs: `docker-compose logs voice-you`
- Verify network: `docker network ls`

### S3 upload fails
- Check AWS credentials in `.env`
- Verify S3 bucket name
- Check FastAPI logs: `docker-compose logs fastapi-s3-upload`

### Port already in use
- Change ports in docker-compose.yml
- Or kill existing processes:
  ```bash
  # macOS/Linux
  lsof -i :3000  # or :3001
  kill -9 <PID>
  ```

### Permission denied errors
- Ensure Docker daemon is running
- Check Docker permissions

## 📚 Project Documentation

- **FastAPI Backend**: See `fastapi-s3-upload/README.md`
- **React Frontend**: See `voice-you/README.md`

## 🔐 Security Notes

1. **Never commit `.env`** - Add to `.gitignore`
2. **Use strong AWS credentials** - Rotate regularly
3. **Enable CORS carefully** - Currently allows all origins
4. **Use HTTPS in production** - Configure with reverse proxy

## 🚀 Production Deployment

For production:

1. **Remove debug mode**: `DEBUG=False`
2. **Use environment variables** from CI/CD pipeline
3. **Add reverse proxy** (Nginx/Apache) in front
4. **Enable HTTPS** with SSL certificates
5. **Use container orchestration** (Kubernetes, ECS)
6. **Set up logging** and monitoring
7. **Configure rate limiting** for API
8. **Set resource limits** for containers

Example production environment:
```bash
DEBUG=False
REACT_APP_API_URL=https://api.yourdomain.com
```

## 📄 License

MIT License - See individual project READMEs

## 🤝 Support

For issues:
1. Check logs: `docker-compose logs`
2. Verify configuration in `.env`
3. Review individual service READMEs
4. Check Docker daemon is running
