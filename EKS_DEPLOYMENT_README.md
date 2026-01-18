# AWS EKS Deployment - Complete Documentation

This document provides a complete overview of the EKS deployment setup for the Voice You application.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Detailed Setup Guide](#detailed-setup-guide)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Kubernetes Resources](#kubernetes-resources)
7. [Security](#security)
8. [Monitoring](#monitoring)
9. [FAQ](#faq)

---

## 🚀 Quick Start

For a quick setup, follow these steps:

```bash
# 1. Install tools and configure AWS
aws configure

# 2. Create EKS cluster (15-20 min)
eksctl create cluster \
  --name voice-app-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed \
  --with-oidc

# 3. Set up kubeconfig
aws eks update-kubeconfig --region us-east-1 --name voice-app-cluster

# 4. Create ECR repositories
aws ecr create-repository --repository-name fastapi-s3-upload --region us-east-1
aws ecr create-repository --repository-name react-voice-you --region us-east-1

# 5. Update manifests with your AWS account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
sed -i '' "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" k8s/fastapi.yaml k8s/react.yaml

# 6. Deploy application
kubectl apply -f k8s/fastapi.yaml
kubectl apply -f k8s/react.yaml

# 7. Verify deployment
kubectl get pods -n voice-app
```

**For detailed instructions**, see [EKS_QUICK_START.md](EKS_QUICK_START.md)

---

## 🏗 Architecture

### Current Architecture (Docker Compose)
```
┌─────────────────────────────────────────┐
│         Docker Compose Network           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────┐                   │
│  │  React Frontend  │                   │
│  │  (Nginx)         │                   │
│  │  Port: 3001      │                   │
│  └────────┬─────────┘                   │
│           │                             │
│    ┌──────▼───────────┐                 │
│    │   API Gateway    │                 │
│    │ (Docker Network) │                 │
│    └──────┬───────────┘                 │
│           │                             │
│  ┌────────▼──────────┐                  │
│  │ FastAPI Backend   │                  │
│  │ Port: 3000        │                  │
│  │ ├─ /api/upload    │                  │
│  │ ├─ /api/voices    │                  │
│  │ └─ /health        │                  │
│  └─────┬──────────────┘                 │
│        │                                │
│  ┌─────▼──────────┐                     │
│  │  AWS S3        │                     │
│  │  Bucket        │                     │
│  └────────────────┘                     │
│                                         │
└─────────────────────────────────────────┘
```

### EKS Architecture (Target Deployment)
```
┌──────────────────────────────────────────────────┐
│           AWS EKS Cluster                        │
│  ┌────────────────────────────────────────────┐  │
│  │    voice-app Namespace                     │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  React Service (ClusterIP)           │  │  │
│  │  │  ├─ Pod 1 (Nginx)                    │  │  │
│  │  │  ├─ Pod 2 (Nginx)                    │  │  │
│  │  │  └─ HPA (min:2, max:10)              │  │  │
│  │  └────────────┬─────────────────────────┘  │  │
│  │               │                             │  │
│  │  ┌────────────▼─────────────────────────┐  │  │
│  │  │  ALB Ingress Controller              │  │  │
│  │  │  └─ Path /api → FastAPI             │  │  │
│  │  │  └─ Path /    → React               │  │  │
│  │  └────────┬────────────────────────────┘  │  │
│  │           │                                │  │
│  │  ┌────────▼─────────────────────────────┐  │  │
│  │  │  FastAPI Service (ClusterIP)        │  │  │
│  │  │  ├─ Pod 1 (FastAPI)                 │  │  │
│  │  │  ├─ Pod 2 (FastAPI)                 │  │  │
│  │  │  └─ HPA (min:2, max:10)             │  │  │
│  │  └────────┬──────────────────────────┘  │  │
│  │           │                             │  │
│  │  ┌────────▼────────┐                    │  │
│  │  │  AWS S3 Bucket  │                    │  │
│  │  │  (Via IAM Role) │                    │  │
│  │  └─────────────────┘                    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌────────────────────────────────────────────┐  │
│  │  kube-system Namespace                     │  │
│  │  ├─ AWS Load Balancer Controller           │  │
│  │  ├─ Metrics Server                         │  │
│  │  └─ CoreDNS                                │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
         │
         │ (ALB - Application Load Balancer)
         │
    ┌────▼──────────┐
    │   Internet    │
    │   Users       │
    └───────────────┘
```

---

## 📁 Project Structure

```
vasanth-experiments/
├── .github/
│   └── workflows/
│       └── deploy-to-eks.yml          # CI/CD Pipeline Configuration
├── k8s/
│   ├── fastapi.yaml                   # FastAPI Deployment + Service + HPA
│   ├── react.yaml                     # React Deployment + Service + HPA
│   └── ingress.yaml                   # ALB Ingress + Network Policies
├── fastapi-s3-upload/                 # FastAPI Backend
│   ├── app/
│   │   ├── config/
│   │   │   └── settings.py           # Configuration Management
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic Models
│   │   ├── routes/
│   │   │   └── upload.py             # API Routes
│   │   ├── services/
│   │   │   └── s3_service.py         # S3 Operations
│   │   └── main.py                   # FastAPI App
│   ├── Dockerfile                     # Multi-stage Build
│   └── pyproject.toml                 # Dependencies
├── voice-you/                         # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navigation.js         # Menu Navigation
│   │   │   └── VoiceRecorder.js      # Voice Recording
│   │   ├── pages/
│   │   │   ├── Home.js               # Home Page
│   │   │   ├── YourVoice.js          # Recording Page
│   │   │   └── Voices.js             # Voices List Page
│   │   ├── services/
│   │   │   └── s3Service.js          # API Client
│   │   └── App.js                    # Root Component
│   ├── Dockerfile                     # Multi-stage Build
│   ├── nginx.conf                     # Nginx Configuration
│   └── package.json                   # NPM Dependencies
├── scripts/
│   └── eks-helper.sh                  # Helper Script for EKS Management
├── AWS_EKS_DEPLOYMENT_GUIDE.md        # Comprehensive Setup Guide
├── EKS_QUICK_START.md                 # Quick Start Guide
├── K8S_SECRETS_SETUP.md               # Secrets Management
├── docker-compose.yml                 # Local Development
└── README.md                          # Main Documentation
```

---

## 🔧 Detailed Setup Guide

### Phase 1: AWS Account Setup (30 min)

1. **Create AWS Account** - Go to aws.amazon.com/free
2. **Configure CLI Credentials** - `aws configure`
3. **Create IAM User** for programmatic access
4. **Enable OIDC Provider** for GitHub Actions

See [AWS_EKS_DEPLOYMENT_GUIDE.md](AWS_EKS_DEPLOYMENT_GUIDE.md) for detailed steps.

### Phase 2: EKS Cluster Creation (20 min)

```bash
eksctl create cluster \
  --name voice-app-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed \
  --with-oidc \
  --enable-ssm
```

### Phase 3: Docker Registries (10 min)

```bash
# Create ECR repositories
aws ecr create-repository --repository-name fastapi-s3-upload --region us-east-1
aws ecr create-repository --repository-name react-voice-you --region us-east-1
```

### Phase 4: GitHub Actions Setup (15 min)

1. Add GitHub Secrets: `AWS_ACCOUNT_ID`, `AWS_REGION`
2. Update OIDC trust policy with your GitHub org/repo
3. Merge changes to main branch to trigger deployment

### Phase 5: Deploy Application (5 min)

```bash
# Push to main branch - automatic deployment via CI/CD
git add .
git commit -m "Deploy to EKS"
git push origin main

# Or manual deployment
kubectl apply -f k8s/fastapi.yaml
kubectl apply -f k8s/react.yaml
```

---

## 🔄 CI/CD Pipeline

### Workflow Diagram

```
Push to main
    │
    ▼
┌─────────────────────┐
│ Build & Push Images │
│ - Build FastAPI     │
│ - Push to ECR       │
│ - Build React       │
│ - Push to ECR       │
└────────┬────────────┘
         │
         ▼
┌──────────────────────────┐
│ Deploy to EKS            │
│ - Update kubeconfig      │
│ - Apply Manifests        │
│ - Update Image Refs      │
│ - Monitor Rollout        │
└────────┬─────────────────┘
         │
    ┌────▼─────┐
    │ Success? │
    └────┬─────┘
         │
    Yes  │  No
        │  │
        ▼  ▼
      ✓    Rollback
```

### Workflow Features

- ✅ **Automatic triggering** on push to main
- ✅ **Docker layer caching** for faster builds
- ✅ **ECR image tagging** with Git SHA
- ✅ **Rolling deployments** with 0 downtime
- ✅ **Automated rollback** on failure
- ✅ **Smoke tests** to verify deployment
- ✅ **OIDC authentication** (no secret keys needed)

See [`.github/workflows/deploy-to-eks.yml`](.github/workflows/deploy-to-eks.yml) for details.

---

## 🎯 Kubernetes Resources

### Deployments

| Service | Replicas | CPU | Memory | HPA Min | HPA Max |
|---------|----------|-----|--------|---------|---------|
| FastAPI | 2 | 100m | 256Mi | 2 | 10 |
| React   | 2 | 50m  | 128Mi | 2 | 10 |

### Services

| Service | Type | Port | Target Port |
|---------|------|------|-------------|
| fastapi-service | ClusterIP | 3000 | 3000 |
| react-service | ClusterIP | 3001 | 3001 |

### Ingress

- **Controller**: AWS ALB (Application Load Balancer)
- **Type**: internet-facing
- **Routes**:
  - `/api/*` → FastAPI Service (3000)
  - `/*` → React Service (3001)

### ConfigMaps

- `fastapi-config` - Environment variables and settings

### Secrets

- `aws-credentials` - AWS Access Key ID and Secret Access Key

See [K8S_SECRETS_SETUP.md](K8S_SECRETS_SETUP.md) for security options.

---

## 🔐 Security

### Implementation

- ✅ **RBAC** - Role-based access control
- ✅ **Network Policies** - Pod-to-pod communication rules
- ✅ **Pod Security Standards** - Container restrictions
- ✅ **IRSA** - IAM Roles for Service Accounts
- ✅ **Secrets Management** - AWS Secrets Manager integration
- ✅ **Image Scanning** - ECR image vulnerability scanning
- ✅ **Non-root User** - Containers run as non-root
- ✅ **Resource Limits** - CPU and memory quotas

### Best Practices

1. **Never commit secrets** to Git
2. **Use IRSA** for AWS authentication (most secure)
3. **Rotate credentials** regularly
4. **Enable audit logging** for compliance
5. **Use network policies** to restrict traffic
6. **Scan images** for vulnerabilities
7. **Monitor and alert** on security events

---

## 📊 Monitoring

### Built-in Monitoring

- **Kubernetes Dashboard** - `kubectl proxy` then http://localhost:8001
- **Metrics Server** - Pod resource usage
- **CloudWatch** - AWS native monitoring
- **Application Logs** - `kubectl logs` command

### Setting up Monitoring

```bash
# Install Metrics Server for HPA
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# View pod metrics
kubectl top pods -n voice-app

# View node metrics
kubectl top nodes
```

### View Logs

```bash
# Real-time FastAPI logs
kubectl logs -f -n voice-app deployment/fastapi-deployment

# Last 100 lines of React logs
kubectl logs -n voice-app deployment/react-deployment --tail 100

# Logs from crashed pods
kubectl logs -n voice-app POD_NAME --previous
```

---

## ❓ FAQ

### Q: How much will this cost?

A: Approximately $30-50/month for:
- 2 t3.medium EC2 instances (~$30)
- EKS cluster (~$10)
- S3 storage and data transfer (varies)
- ALB (~$16 + data processing)

### Q: How do I update my application?

A: Push to main branch:
```bash
git add .
git commit -m "Update application"
git push origin main
```
CI/CD pipeline will automatically build, push, and deploy.

### Q: How do I scale my application?

A: Two options:
```bash
# Manual scaling
kubectl scale deployment/fastapi-deployment -n voice-app --replicas=5

# Or let HPA scale automatically based on CPU/memory
```

### Q: How do I view logs?

A:
```bash
# Real-time logs
kubectl logs -f -n voice-app deployment/fastapi-deployment

# Or use CloudWatch
aws logs tail /aws/eks/voice-app-cluster --follow
```

### Q: How do I troubleshoot issues?

A:
```bash
# Check pod status
kubectl describe pod POD_NAME -n voice-app

# View logs
kubectl logs POD_NAME -n voice-app

# Check events
kubectl get events -n voice-app --sort-by='.lastTimestamp'

# Debug in pod
kubectl exec -it POD_NAME -n voice-app -- /bin/sh
```

### Q: How do I rollback a deployment?

A:
```bash
# Automatic rollback (handled by CI/CD on failure)
# Or manual rollback
kubectl rollout undo deployment/fastapi-deployment -n voice-app
```

### Q: Can I use custom domain?

A: Yes! Update the Ingress:
```yaml
spec:
  rules:
  - host: "yourdomain.com"
    http:
      paths:
        - path: /
          backend:
            service:
              name: react-service
              port:
                number: 3001
```

Then configure Route53 to point to ALB DNS.

### Q: How do I delete everything?

A:
```bash
# Delete namespace
kubectl delete namespace voice-app

# Delete cluster
eksctl delete cluster --name voice-app-cluster --region us-east-1
```

---

## 🔗 Useful Commands

### Cluster Management

```bash
# View cluster info
kubectl cluster-info

# View nodes
kubectl get nodes -o wide

# View all resources
kubectl get all -n voice-app
```

### Deployment Management

```bash
# Check deployment status
kubectl rollout status deployment/fastapi-deployment -n voice-app

# View deployment history
kubectl rollout history deployment/fastapi-deployment -n voice-app

# Rollback
kubectl rollout undo deployment/fastapi-deployment -n voice-app
```

### Debugging

```bash
# Get pod details
kubectl describe pod POD_NAME -n voice-app

# View logs
kubectl logs POD_NAME -n voice-app

# Execute command in pod
kubectl exec -it POD_NAME -n voice-app -- /bin/sh

# Port forward
kubectl port-forward -n voice-app svc/fastapi-service 3000:3000
```

---

## 📚 Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Official Docs](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Helm Documentation](https://helm.sh/docs/)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)

---

## 📝 Support

For issues and troubleshooting:

1. Check [AWS_EKS_DEPLOYMENT_GUIDE.md](AWS_EKS_DEPLOYMENT_GUIDE.md) - Troubleshooting section
2. Review pod logs: `kubectl logs POD_NAME -n voice-app`
3. Describe resources: `kubectl describe pod POD_NAME -n voice-app`
4. Check GitHub Actions: Repository → Actions tab

---

**Last Updated**: January 18, 2026
**Version**: 1.0.0
