#!/bin/bash
# Docker Hub Authentication Fix Script

echo "🐳 Docker Hub Authentication Fix"
echo "================================"

# Check current Docker status
echo "📋 Checking Docker status..."
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Docker is not running properly"
    exit 1
fi

echo "✅ Docker is running"

# Check if we can pull images
echo "🔍 Testing Docker Hub connectivity..."
docker pull --quiet alpine:latest > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Docker Hub is accessible"
    
    # Try to pull the Node.js image
    echo "📦 Pulling Node.js 20 Alpine image..."
    docker pull node:20-alpine
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pulled node:20-alpine"
        echo "🚀 You can now run: make deploy-prod"
    else
        echo "⚠️ Failed to pull node:20-alpine, trying alternatives..."
        
        # Try Amazon ECR Public
        echo "📦 Trying Amazon ECR Public registry..."
        docker pull public.ecr.aws/docker/library/node:20-alpine
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully pulled from ECR Public"
            echo "📝 Using alternative Dockerfile..."
            cp Dockerfile Dockerfile.backup
            cp Dockerfile.alternative Dockerfile
            echo "🚀 You can now run: make deploy-prod"
        else
            echo "❌ All registries failed. You need to:"
            echo "   1. Create a Docker Hub account"
            echo "   2. Run: docker login"
            echo "   3. Enter your Docker Hub credentials"
        fi
    fi
else
    echo "❌ Cannot access Docker Hub. Possible solutions:"
    echo "   1. Check internet connectivity"
    echo "   2. Login to Docker Hub: docker login"
    echo "   3. Use alternative registry"
    
    # Provide manual login instructions
    echo ""
    echo "🔑 To login to Docker Hub:"
    echo "   docker login"
    echo "   Username: <your-dockerhub-username>"
    echo "   Password: <your-dockerhub-password>"
    echo ""
    echo "💡 Don't have Docker Hub account? Create one at: https://hub.docker.com"
fi