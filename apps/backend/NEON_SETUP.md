# Neon Database Setup Guide

## Quick Setup with Neon

1. **Create Neon Account**
   - Go to https://console.neon.tech
   - Sign up for free account

2. **Create Database**
   - Click "New Project"
   - Choose PostgreSQL
   - Select region (closest to you)
   - Give it a name (e.g., "whale-tracker")

3. **Get Connection String**
   - In your project dashboard, click "Connection Details"
   - Copy the "Connection string"
   - It should look like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

4. **Update Environment**
   ```bash
   # Edit your .env file
   DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
   ```

5. **Run Database Migration**
   ```bash
   npx prisma migrate dev --name init
   ```

6. **Start Server**
   ```bash
   pnpm run dev
   ```

## Alternative: Local PostgreSQL

If you prefer to use local PostgreSQL:

1. **Install PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   
   # Windows
   # Download from https://postgresql.org/download/windows/
   ```

2. **Create Database**
   ```bash
   sudo -u postgres createdb whale_tracker
   ```

3. **Update .env**
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/whale_tracker?schema=public"
   ```

4. **Run Migration**
   ```bash
   npx prisma migrate dev --name init
   ```

## Database Schema

The system will create these tables:

- **users** - Wallet addresses and user metadata
- **whales** - Whale addresses being tracked
- **user_whales** - Join table for user-whale relationships
- **whale_activities** - Transaction and activity records

## Features

✅ **Auto-migrations** - Schema updates automatically
✅ **Type-safe queries** - Full TypeScript support
✅ **Connection pooling** - Optimized performance
✅ **Graceful fallback** - Works without database too
✅ **Real-time sync** - Persistent whale tracking
