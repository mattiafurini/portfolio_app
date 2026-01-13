#!/bin/bash

# Deployment Script for Portfolio App on Azure VM

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull

# 2. Backend Setup
echo "🛠️ Setting up Backend..."
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
cd ..

# 3. Frontend Setup
echo "🎨 Setting up Frontend..."
cd frontend
npm install
npm run build
cd ..

# 4. Restart PM2 processes
echo "🔄 Restarting Application..."
pm2 reload all || pm2 start ecosystem.config.js

echo "✅ Deployment Complete!"
