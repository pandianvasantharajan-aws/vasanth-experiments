# Kubernetes Secrets and ConfigMap Setup

This file provides examples for setting up AWS credentials and environment variables securely in EKS.

## Option 1: Using AWS Secrets Manager

### 1. Create secrets in AWS Secrets Manager

```bash
# Store AWS credentials in Secrets Manager
aws secretsmanager create-secret \
  --name voice-app/aws-credentials \
  --region us-east-1 \
  --secret-string '{
    "aws-access-key-id": "YOUR_AWS_ACCESS_KEY_ID",
    "aws-secret-access-key": "YOUR_AWS_SECRET_ACCESS_KEY"
  }'

# Store FastAPI configuration
aws secretsmanager create-secret \
  --name voice-app/fastapi-config \
  --region us-east-1 \
  --secret-string '{
    "s3-bucket-name": "amzn-s3-diary",
    "aws-region": "us-east-1"
  }'
```

### 2. Create IAM role for Kubernetes service account

```bash
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/$(aws eks describe-cluster --name voice-app-cluster --region us-east-1 --query 'cluster.identity.oidc.issuer' --output text | cut -d'/' -f5)"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/$(aws eks describe-cluster --name voice-app-cluster --region us-east-1 --query 'cluster.identity.oidc.issuer' --output text | cut -d'/' -f5):sub": "system:serviceaccount:voice-app:fastapi-sa"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name fastapi-secrets-access \
  --assume-role-policy-document file://trust-policy.json
```

### 3. Attach policy for Secrets Manager access

```bash
cat > secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:$AWS_ACCOUNT_ID:secret:voice-app/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name fastapi-secrets-access \
  --policy-name fastapi-secrets-policy \
  --policy-document file://secrets-policy.json
```

### 4. Install Secrets Store CSI Driver

```bash
# Add Helm repo
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update

# Install driver
helm install csi-secrets-store secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true

# Install AWS provider
helm repo add aws-secrets-manager https://aws.github.io/secrets-store-csi-driver-provider-aws
helm repo update

helm install secrets-provider-aws aws-secrets-manager/secrets-store-csi-driver-provider-aws \
  --namespace kube-system
```

### 5. Create SecretProviderClass

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
  namespace: voice-app
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "voice-app/aws-credentials"
        objectType: "secretsmanager"
        objectAlias: "aws-credentials"
      - objectName: "voice-app/fastapi-config"
        objectType: "secretsmanager"
        objectAlias: "fastapi-config"
```

---

## Option 2: Using Kubernetes Secrets (Simpler, Local Development)

### 1. Create base64 encoded credentials

```bash
# Encode credentials
echo -n "YOUR_AWS_ACCESS_KEY_ID" | base64
echo -n "YOUR_AWS_SECRET_ACCESS_KEY" | base64
```

### 2. Create Kubernetes Secret

```bash
# Create from literal values
kubectl create secret generic aws-credentials \
  --from-literal=aws-access-key-id=YOUR_AWS_ACCESS_KEY_ID \
  --from-literal=aws-secret-access-key=YOUR_AWS_SECRET_ACCESS_KEY \
  -n voice-app

# Or from file
cat > credentials.txt <<EOF
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
EOF

kubectl create secret generic aws-credentials \
  --from-file=credentials.txt \
  -n voice-app

# Verify
kubectl get secret aws-credentials -n voice-app -o yaml
```

### 3. Update Deployment to use Secret

The deployment manifests already reference the secret. Just ensure the secret exists:

```bash
# Check if secret exists
kubectl get secret aws-credentials -n voice-app
```

---

## Option 3: Using IAM Roles for Service Accounts (IRSA) - Recommended

This is the most secure approach for production.

### 1. Create IAM role for fastapi-sa

```bash
# Get OIDC provider
OIDC_PROVIDER=$(aws eks describe-cluster --name voice-app-cluster --region us-east-1 \
  --query 'cluster.identity.oidc.issuer' --output text | sed -e "s/^https:\/\///" | sed -e "s/\/$//" )

# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$AWS_ACCOUNT_ID:oidc-provider/$OIDC_PROVIDER"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "$OIDC_PROVIDER:sub": "system:serviceaccount:voice-app:fastapi-sa",
          "$OIDC_PROVIDER:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name fastapi-irsa-role \
  --assume-role-policy-document file://trust-policy.json
```

### 2. Create policy for S3 access

```bash
cat > s3-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::amzn-s3-diary",
        "arn:aws:s3:::amzn-s3-diary/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name fastapi-irsa-role \
  --policy-name fastapi-s3-policy \
  --policy-document file://s3-policy.json
```

### 3. Annotate service account

```bash
# Annotate existing service account
kubectl annotate serviceaccount fastapi-sa \
  -n voice-app \
  eks.amazonaws.com/role-arn=arn:aws:iam::$AWS_ACCOUNT_ID:role/fastapi-irsa-role \
  --overwrite

# Or create new service account with annotation
kubectl create serviceaccount fastapi-sa -n voice-app
kubectl annotate serviceaccount fastapi-sa \
  -n voice-app \
  eks.amazonaws.com/role-arn=arn:aws:iam::$AWS_ACCOUNT_ID:role/fastapi-irsa-role
```

### 4. Update deployment manifest

The deployment already uses the service account. The pods will automatically receive AWS credentials through the IRSA mechanism.

---

## Verify Configuration

### Check Kubernetes Secrets

```bash
# List all secrets
kubectl get secrets -n voice-app

# View secret details
kubectl describe secret aws-credentials -n voice-app

# Decode secret value (for debugging only)
kubectl get secret aws-credentials -n voice-app -o jsonpath='{.data.aws-access-key-id}' | base64 --decode
```

### Check Pod Environment Variables

```bash
# Exec into pod
kubectl exec -it POD_NAME -n voice-app -- sh

# View environment variables in pod
env | grep AWS
```

### Test S3 Access from Pod

```bash
# Exec into fastapi pod
kubectl exec -it FASTAPI_POD_NAME -n voice-app -- sh

# Test S3 access
aws s3 ls s3://amzn-s3-diary/

# Test API with S3 access
curl http://localhost:3000/api/voices
```

---

## Security Best Practices

1. **Never hardcode secrets** in manifests or images
2. **Use IRSA** for pod-to-AWS authentication (most secure)
3. **Rotate credentials regularly**
4. **Use Secrets Manager** for external secret management
5. **Enable audit logging** for secret access
6. **Restrict RBAC** for secret access
7. **Encrypt etcd** in EKS
8. **Use Pod Security Standards** to restrict containers

---

## Troubleshooting

### AWS credentials not working in pod?

```bash
# Check if environment variables are set
kubectl exec -it POD_NAME -n voice-app -- printenv | grep AWS

# For IRSA, check the assumed role
kubectl exec -it POD_NAME -n voice-app -- aws sts get-caller-identity

# Check pod logs for auth errors
kubectl logs POD_NAME -n voice-app
```

### Secret not found in pod?

```bash
# Check if secret exists
kubectl get secret aws-credentials -n voice-app

# Check secret volume mount
kubectl describe pod POD_NAME -n voice-app | grep -A 10 Mounts

# Check secret contents
kubectl get secret aws-credentials -n voice-app -o yaml
```

---

## Cleanup

```bash
# Delete secret
kubectl delete secret aws-credentials -n voice-app

# Delete IAM role (IRSA)
aws iam delete-role-policy --role-name fastapi-irsa-role --policy-name fastapi-s3-policy
aws iam delete-role --role-name fastapi-irsa-role
```
