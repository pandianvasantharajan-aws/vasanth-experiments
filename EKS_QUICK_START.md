# EKS Deployment - Quick Start Guide

Get your Voice App running on AWS EKS in 30 minutes! 🚀

## Prerequisites (5 min)

```bash
# Install required tools
# AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-macos-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# kubectl
brew install kubectl

# eksctl
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl

# Verify installations
aws --version
kubectl version --client
eksctl version
```

## Step 1: AWS Setup (5 min)

```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity

# Export your account ID for later use
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo $AWS_ACCOUNT_ID
```

## Step 2: Create EKS Cluster (20 min)

```bash
# Option A: Using helper script
bash scripts/eks-helper.sh
# Select: 1. Create EKS cluster

# Option B: Manual command
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

# Wait for cluster creation (15-20 minutes)
```

## Step 3: Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region us-east-1 \
  --name voice-app-cluster

# Verify access
kubectl get nodes
```

## Step 4: Set Up ECR Repositories

```bash
# Create FastAPI repository
aws ecr create-repository \
  --repository-name fastapi-s3-upload \
  --region us-east-1

# Create React repository
aws ecr create-repository \
  --repository-name react-voice-you \
  --region us-east-1

# Get repository URIs
aws ecr describe-repositories \
  --region us-east-1 \
  --query 'repositories[*].[repositoryName,repositoryUri]' \
  --output table
```

## Step 5: Update Kubernetes Manifests

```bash
# Replace ACCOUNT_ID in all k8s manifests
sed -i '' "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" k8s/fastapi.yaml
sed -i '' "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" k8s/react.yaml
sed -i '' "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" k8s/ingress.yaml
```

## Step 6: Set Up GitHub Actions (5 min)

### Add GitHub Secrets

Go to your GitHub repository:
- Settings → Secrets and variables → Actions
- Add: `AWS_ACCOUNT_ID` = Your AWS Account ID
- Add: `AWS_REGION` = us-east-1

### Update GitHub Actions OIDC

```bash
# Create IAM role for GitHub Actions
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
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

# Replace YOUR_GITHUB_ORG and YOUR_REPO
aws iam create-role \
  --role-name github-actions-role \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
curl https://raw.githubusercontent.com/aws/aws-config-rules/master/aws-config-conformance-packs/Amazon-ECS-Full-ECR-Access.json -o ecr-policy.json

aws iam put-role-policy \
  --role-name github-actions-role \
  --policy-name ecr-policy \
  --policy-document file://ecr-policy.json
```

## Step 7: Deploy Application

### Option A: Manual Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/fastapi.yaml
kubectl apply -f k8s/react.yaml

# Wait for deployments
kubectl rollout status deployment/fastapi-deployment -n voice-app
kubectl rollout status deployment/react-deployment -n voice-app

# Verify status
kubectl get pods -n voice-app
```

### Option B: Automatic Deployment via CI/CD

```bash
# Just push to main branch
git add .
git commit -m "Deploy to EKS"
git push origin main

# Monitor at: GitHub → Actions
```

## Step 8: Access Your Application

```bash
# Port forward services
kubectl port-forward -n voice-app svc/fastapi-service 3000:3000 &
kubectl port-forward -n voice-app svc/react-service 3001:3001 &

# Access applications
# Frontend: http://localhost:3001
# API: http://localhost:3000/api/voices
# API Docs: http://localhost:3000/docs

# Test API
curl http://localhost:3000/health
```

## Verify Deployment

```bash
# Check all resources
kubectl get all -n voice-app

# View deployment logs
kubectl logs -n voice-app deployment/fastapi-deployment --tail 50
kubectl logs -n voice-app deployment/react-deployment --tail 50

# Check resource usage
kubectl top pods -n voice-app
kubectl top nodes
```

## Common Tasks

### Scale Deployment

```bash
# Scale FastAPI to 5 replicas
kubectl scale deployment/fastapi-deployment -n voice-app --replicas=5

# Scale React to 3 replicas
kubectl scale deployment/react-deployment -n voice-app --replicas=3
```

### View Logs

```bash
# Real-time logs
kubectl logs -n voice-app -f deployment/fastapi-deployment

# Last 100 lines
kubectl logs -n voice-app deployment/fastapi-deployment --tail 100
```

### Rollback Deployment

```bash
# Rollback to previous version
kubectl rollout undo deployment/fastapi-deployment -n voice-app

# View rollout history
kubectl rollout history deployment/fastapi-deployment -n voice-app
```

### Describe Pod Issues

```bash
# Get pod details
kubectl describe pod POD_NAME -n voice-app

# Get previous logs (for crashed pods)
kubectl logs POD_NAME -n voice-app --previous
```

## Install ALB Controller (for Ingress)

```bash
# Add Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Create IAM policy
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.2/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=voice-app-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::$AWS_ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install ALB controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=voice-app-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Apply Ingress
kubectl apply -f k8s/ingress.yaml
```

## Cleanup

```bash
# Delete application namespace
kubectl delete namespace voice-app

# Delete EKS cluster
eksctl delete cluster --name voice-app-cluster --region us-east-1

# Delete ECR repositories
aws ecr delete-repository --repository-name fastapi-s3-upload --force
aws ecr delete-repository --repository-name react-voice-you --force
```

## Troubleshooting

### Pods not starting?
```bash
kubectl describe pod POD_NAME -n voice-app
kubectl logs POD_NAME -n voice-app
```

### Image pull failed?
```bash
# Check if images exist in ECR
aws ecr describe-images --repository-name fastapi-s3-upload

# Re-push images manually
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
```

### Service not accessible?
```bash
# Check endpoints
kubectl get endpoints -n voice-app

# Test connectivity
kubectl exec -it POD_NAME -n voice-app -- sh
curl http://fastapi-service:3000/health
```

## Next Steps

1. ✅ Cluster created and running
2. ✅ Applications deployed
3. 📝 Configure custom domain
4. 🔐 Set up SSL/TLS certificates
5. 📊 Enable CloudWatch monitoring
6. 🔔 Set up alerts and notifications
7. 💾 Configure backups

## Resources

- [Full Setup Guide](AWS_EKS_DEPLOYMENT_GUIDE.md)
- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helper Script](scripts/eks-helper.sh)

---

**Need help?** Check the logs and troubleshooting section in the full guide.
