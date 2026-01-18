#!/bin/bash

# Voice App EKS Helper Script
# This script provides convenient commands for EKS management

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="voice-app-cluster"
REGION="us-east-1"
NAMESPACE="voice-app"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"

# Helper functions
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Main menu
show_menu() {
    echo ""
    echo "==================================="
    echo "  Voice App EKS Helper"
    echo "==================================="
    echo "1. Create EKS cluster"
    echo "2. Update kubeconfig"
    echo "3. Deploy application"
    echo "4. View deployment status"
    echo "5. View logs"
    echo "6. Port forward services"
    echo "7. Check resource usage"
    echo "8. View Ingress status"
    echo "9. Scale deployment"
    echo "10. Rollback deployment"
    echo "11. Delete application"
    echo "12. Delete cluster"
    echo "0. Exit"
    echo "==================================="
    echo ""
}

# Command implementations
create_cluster() {
    print_info "Creating EKS cluster: $CLUSTER_NAME"
    
    eksctl create cluster \
      --name "$CLUSTER_NAME" \
      --region "$REGION" \
      --nodegroup-name standard-workers \
      --node-type t3.medium \
      --nodes 2 \
      --nodes-min 2 \
      --nodes-max 5 \
      --managed \
      --with-oidc \
      --enable-ssm
    
    print_success "Cluster created successfully"
}

update_kubeconfig() {
    print_info "Updating kubeconfig for cluster: $CLUSTER_NAME"
    
    aws eks update-kubeconfig \
      --region "$REGION" \
      --name "$CLUSTER_NAME"
    
    print_success "Kubeconfig updated"
}

deploy_application() {
    print_info "Deploying application to EKS"
    
    # Check if namespace exists
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Apply manifests
    kubectl apply -f k8s/fastapi.yaml
    kubectl apply -f k8s/react.yaml
    
    print_success "Application deployed"
    print_info "Waiting for rollout..."
    
    kubectl rollout status deployment/fastapi-deployment -n "$NAMESPACE" --timeout=5m
    kubectl rollout status deployment/react-deployment -n "$NAMESPACE" --timeout=5m
    
    print_success "All deployments ready"
}

view_status() {
    print_info "Deployment Status"
    echo ""
    
    echo "=== Deployments ==="
    kubectl get deployment -n "$NAMESPACE"
    echo ""
    
    echo "=== Pods ==="
    kubectl get pods -n "$NAMESPACE" -o wide
    echo ""
    
    echo "=== Services ==="
    kubectl get svc -n "$NAMESPACE"
    echo ""
    
    echo "=== Ingress ==="
    kubectl get ingress -n "$NAMESPACE" || print_warning "No ingress configured"
}

view_logs() {
    echo -e "\n${YELLOW}Select service to view logs:${NC}"
    echo "1. FastAPI"
    echo "2. React"
    
    read -p "Enter choice (1-2): " choice
    
    case $choice in
        1)
            print_info "FastAPI logs (last 50 lines):"
            kubectl logs -n "$NAMESPACE" deployment/fastapi-deployment --tail 50
            ;;
        2)
            print_info "React logs (last 50 lines):"
            kubectl logs -n "$NAMESPACE" deployment/react-deployment --tail 50
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

port_forward() {
    print_info "Starting port forwarding..."
    print_warning "Press Ctrl+C to stop"
    
    echo -e "\n${YELLOW}Select service to forward:${NC}"
    echo "1. FastAPI (3000:3000)"
    echo "2. React (3001:3001)"
    echo "3. Both"
    
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            kubectl port-forward -n "$NAMESPACE" svc/fastapi-service 3000:3000
            ;;
        2)
            kubectl port-forward -n "$NAMESPACE" svc/react-service 3001:3001
            ;;
        3)
            kubectl port-forward -n "$NAMESPACE" svc/fastapi-service 3000:3000 &
            kubectl port-forward -n "$NAMESPACE" svc/react-service 3001:3001
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

check_resources() {
    print_info "Resource Usage"
    echo ""
    
    echo "=== Node Resources ==="
    kubectl top nodes
    echo ""
    
    echo "=== Pod Resources ==="
    kubectl top pods -n "$NAMESPACE"
    echo ""
    
    echo "=== HPA Status ==="
    kubectl get hpa -n "$NAMESPACE"
}

view_ingress() {
    print_info "Ingress Status"
    kubectl get ingress -n "$NAMESPACE" -o wide
    echo ""
    kubectl describe ingress voice-app-ingress -n "$NAMESPACE" || print_warning "Ingress not found"
}

scale_deployment() {
    echo -e "\n${YELLOW}Select deployment to scale:${NC}"
    echo "1. FastAPI"
    echo "2. React"
    
    read -p "Enter choice (1-2): " choice
    read -p "Enter number of replicas: " replicas
    
    case $choice in
        1)
            kubectl scale deployment/fastapi-deployment -n "$NAMESPACE" --replicas="$replicas"
            print_success "FastAPI scaled to $replicas replicas"
            ;;
        2)
            kubectl scale deployment/react-deployment -n "$NAMESPACE" --replicas="$replicas"
            print_success "React scaled to $replicas replicas"
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

rollback_deployment() {
    echo -e "\n${YELLOW}Select deployment to rollback:${NC}"
    echo "1. FastAPI"
    echo "2. React"
    
    read -p "Enter choice (1-2): " choice
    
    case $choice in
        1)
            kubectl rollout undo deployment/fastapi-deployment -n "$NAMESPACE"
            print_success "FastAPI rolled back to previous version"
            ;;
        2)
            kubectl rollout undo deployment/react-deployment -n "$NAMESPACE"
            print_success "React rolled back to previous version"
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

delete_application() {
    print_warning "This will delete the application namespace and all resources in it"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        kubectl delete namespace "$NAMESPACE"
        print_success "Application namespace deleted"
    else
        print_info "Cancelled"
    fi
}

delete_cluster() {
    print_warning "This will delete the entire EKS cluster!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        read -p "Enter cluster name to confirm: " confirm_name
        if [ "$confirm_name" = "$CLUSTER_NAME" ]; then
            eksctl delete cluster --name "$CLUSTER_NAME" --region "$REGION"
            print_success "Cluster deleted"
        else
            print_error "Cluster name does not match"
        fi
    else
        print_info "Cancelled"
    fi
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (0-12): " choice
    
    case $choice in
        1) create_cluster ;;
        2) update_kubeconfig ;;
        3) deploy_application ;;
        4) view_status ;;
        5) view_logs ;;
        6) port_forward ;;
        7) check_resources ;;
        8) view_ingress ;;
        9) scale_deployment ;;
        10) rollback_deployment ;;
        11) delete_application ;;
        12) delete_cluster ;;
        0) print_info "Exiting"; exit 0 ;;
        *) print_error "Invalid choice" ;;
    esac
done
