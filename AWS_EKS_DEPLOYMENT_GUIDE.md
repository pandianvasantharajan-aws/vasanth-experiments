# AWS EKS Deployment Guide

This guide walks you through deploying the Voice You application to AWS EKS with a complete CI/CD pipeline.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS Setup](#aws-setup)
3. [EKS Cluster Setup](#eks-cluster-setup)
4. [ECR Repository Setup](#ecr-repository-setup)
5. [GitHub Actions Setup](#github-actions-setup)
6. [Deployment](#deployment)
7. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## Prerequisites

### Required Tools
- `aws-cli` (v2.13+)
- `kubectl` (v1.28+)
- `eksctl` (v0.168+)
- GitHub account with repository access
- AWS account with appropriate permissions

### Install Tools

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install kubectl
curl -O https://s3.us-west-2.amazonaws.com/amazon-eks/1.28.0/2023-09-14/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

---

## AWS Setup

### 1. Create AWS Account & Configure Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

Store your AWS credentials securely. You'll need:
- AWS_ACCOUNT_ID
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

### 2. Create IAM Role for GitHub Actions

```bash
# Create trust policy document
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# Replace ACCOUNT_ID with your AWS Account ID
# Replace YOUR_GITHUB_ORG and YOUR_REPO with your GitHub org and repo name

# Create the role
aws iam create-role \
  --role-name github-actions-role \
  --assume-role-policy-document file://trust-policy.json

# Attach policy for ECR and EKS access
cat > github-actions-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:GetAuthorizationToken"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::*:role/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name github-actions-role \
  --policy-name github-actions-policy \
  --policy-document file://github-actions-policy.json
```

### 3. Set Up OIDC Provider for GitHub Actions

```bash
# Create OIDC provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

---

## EKS Cluster Setup

### 1. Create EKS Cluster

```bash
# Create cluster with eksctl (recommended)
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

# This will take 15-20 minutes to complete
```

### 2. Verify Cluster

```bash
# Verify cluster creation
aws eks describe-cluster --name voice-app-cluster --region us-east-1

# Get kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name voice-app-cluster

# Verify kubectl access
kubectl get nodes
kubectl get svc -A
```

### 3. Install AWS Load Balancer Controller (for Ingress)

```bash
# Add EKS repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Create IAM policy for ALB controller
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.2/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=voice-app-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install ALB controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=voice-app-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

### 4. Install Metrics Server (for HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## ECR Repository Setup

### 1. Create ECR Repositories

```bash
# Create FastAPI repository
aws ecr create-repository \
  --repository-name fastapi-s3-upload \
  --region us-east-1 \
  --image-scan-on-push \
  --image-tag-mutability MUTABLE

# Create React repository
aws ecr create-repository \
  --repository-name react-voice-you \
  --region us-east-1 \
  --image-scan-on-push \
  --image-tag-mutability MUTABLE

# Get repository URIs
aws ecr describe-repositories \
  --region us-east-1 \
  --query 'repositories[*].[repositoryName,repositoryUri]' \
  --output table
```

### 2. Update Kubernetes Manifests

Replace `ACCOUNT_ID` in `k8s/fastapi.yaml` and `k8s/react.yaml`:

```bash
# Replace placeholders (for macOS, use -i '' for Linux use -i)
sed -i '' 's/ACCOUNT_ID/YOUR_AWS_ACCOUNT_ID/g' k8s/fastapi.yaml
sed -i '' 's/ACCOUNT_ID/YOUR_AWS_ACCOUNT_ID/g' k8s/react.yaml
sed -i '' 's/ACCOUNT_ID/YOUR_AWS_ACCOUNT_ID/g' k8s/ingress.yaml
```

---

## GitHub Actions Setup

### 1. Add GitHub Secrets

Navigate to your GitHub repository:
- **Settings** → **Secrets and variables** → **Actions**

Add the following secrets:

```
AWS_ACCOUNT_ID: Your AWS Account ID
AWS_REGION: us-east-1
```

### 2. Enable OIDC in GitHub Repository

```bash
# The workflow already uses OIDC authentication (no secret keys needed!)
# Just add AWS_ACCOUNT_ID and AWS_REGION as shown above
```

### 3. Verify Workflow Permissions

- Go to **Settings** → **Actions** → **General**
- Set **Workflow permissions** to "Read and write permissions"
- Check "Allow GitHub Actions to create and approve pull requests"

---

## Deployment

### 1. Manual Deployment

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name voice-app-cluster

# Apply manifests
kubectl apply -f k8s/fastapi.yaml
kubectl apply -f k8s/react.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get deployment -n voice-app
kubectl get pods -n voice-app
kubectl get svc -n voice-app
```

### 2. Automated Deployment via CI/CD

Simply push to `main` branch:

```bash
git add .
git commit -m "Deploy to EKS"
git push origin main
```

The GitHub Actions workflow will:
1. Build Docker images
2. Push to ECR
3. Update EKS deployments
4. Monitor rollout
5. Perform smoke tests
6. Rollback on failure

Monitor workflow at: **GitHub Repository** → **Actions**

---

## Monitoring & Troubleshooting

### View Deployment Status

```bash
# Get all resources in namespace
kubectl get all -n voice-app

# View deployment logs
kubectl logs -n voice-app deployment/fastapi-deployment --tail 50
kubectl logs -n voice-app deployment/react-deployment --tail 50

# View recent events
kubectl describe pod -n voice-app -l app=fastapi
kubectl describe pod -n voice-app -l app=react

# Get pod details
kubectl get pods -n voice-app -o wide
```

### Check Service Endpoints

```bash
# Port forward to test locally
kubectl port-forward -n voice-app svc/fastapi-service 3000:3000 &
kubectl port-forward -n voice-app svc/react-service 3001:3001 &

# Test API
curl http://localhost:3000/health
curl http://localhost:3001/
```

### View Ingress

```bash
# Get Ingress status
kubectl get ingress -n voice-app

# Describe Ingress for ALB details
kubectl describe ingress voice-app-ingress -n voice-app
```

### Monitor Resource Usage

```bash
# View HPA status
kubectl get hpa -n voice-app
kubectl describe hpa fastapi-hpa -n voice-app
kubectl describe hpa react-hpa -n voice-app

# View metrics
kubectl top nodes
kubectl top pods -n voice-app
```

### Troubleshooting Common Issues

#### Pods not starting

```bash
# Check pod status
kubectl describe pod POD_NAME -n voice-app

# View logs
kubectl logs POD_NAME -n voice-app
kubectl logs POD_NAME -n voice-app --previous  # For crashed pods
```

#### Image pull errors

```bash
# Verify ECR authentication
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Check image exists
aws ecr describe-images --repository-name fastapi-s3-upload --region us-east-1
aws ecr describe-images --repository-name react-voice-you --region us-east-1
```

#### Ingress not working

```bash
# Check ALB controller
kubectl get deployment -n kube-system | grep aws-load-balancer

# View ALB controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check ingress class
kubectl get ingressclass
```

#### Service not accessible

```bash
# Check service endpoints
kubectl get endpoints -n voice-app

# Verify network policies
kubectl get networkpolicy -n voice-app
```

---

## Cleanup

To delete all resources:

```bash
# Delete namespace (deletes all resources in it)
kubectl delete namespace voice-app

# Delete EKS cluster
eksctl delete cluster --name voice-app-cluster --region us-east-1

# Delete ECR repositories
aws ecr delete-repository --repository-name fastapi-s3-upload --force --region us-east-1
aws ecr delete-repository --repository-name react-voice-you --force --region us-east-1
```

---

## Security Best Practices

1. **Secrets Management**: Use AWS Secrets Manager for sensitive data
2. **Network Policies**: Enforce pod-to-pod communication rules
3. **RBAC**: Implement role-based access control
4. **Image Scanning**: Enable ECR image scanning for vulnerabilities
5. **Monitoring**: Set up CloudWatch and CloudTrail
6. **Backups**: Enable EBS snapshots for persistence

---

## Next Steps

1. Configure custom domain name
2. Set up SSL/TLS certificates with ACM
3. Enable CloudWatch monitoring
4. Configure log aggregation (ELK, CloudWatch)
5. Set up alerts and notifications
6. Implement backup and disaster recovery

---

For more information:
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)
