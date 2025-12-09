# Automated Appwrite Setup

This directory contains scripts to automatically set up your Appwrite project.

## Quick Start

### 1. Install Dependencies

```bash
cd scripts
npm install
```

### 2. Run Setup Script

```bash
npm run setup
```

The script will prompt you for:
- **Appwrite Endpoint** (default: https://cloud.appwrite.io/v1)
- **Project ID** (from your Appwrite Console)
- **API Key** (create one with full permissions)

### 3. What Gets Created

The script automatically creates:

✅ **Database**: `licenser_db`

✅ **Collections**:
- `api_keys` - API key management
- `licenses` - License storage
- `software` - Software products

✅ **Fields**: All required fields with proper types and sizes

✅ **Indexes**: Unique and search indexes on key fields

## Manual Steps After Setup

After running the setup script, you still need to:

### 1. Deploy the Function

1. Go to **Appwrite Console** → **Functions** → **Create Function**
2. Choose **Git** as source
3. Connect your GitHub repository: `LS-License_Appwrite`
4. Configure:
   - **Root Directory**: `functions/verify-license`
   - **Entrypoint**: `index.mjs`
   - **Runtime**: Node.js 22
   - **Branch**: `main`

### 2. Set Environment Variables

Add these to your function:

```
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<your_project_id>
APPWRITE_API_KEY=<your_api_key>
DB_ID=licenser_db
COL_API_KEYS=api_keys
COL_LICENSES=licenses
COL_SOFTWARE=software
```

### 3. Deploy and Test

1. Click **Deploy** in Appwrite Console
2. Wait for build to complete
3. Test with sample data

## Troubleshooting

### "Permission denied" error
- Ensure your API Key has all required scopes:
  - `databases.read`
  - `databases.write`
  - `collections.read`
  - `collections.write`
  - `attributes.read`
  - `attributes.write`
  - `indexes.read`
  - `indexes.write`

### "Collection already exists"
- The script handles this gracefully and skips existing resources
- Safe to run multiple times

### "Attribute creation failed"
- Wait 1-2 minutes between retries
- Appwrite needs time to process attribute creation

## Getting Your Appwrite Credentials

### Project ID
1. Go to Appwrite Console
2. Select your project
3. Go to **Settings**
4. Copy **Project ID**

### API Key
1. Go to Appwrite Console → **Overview**
2. Click **API Keys** tab
3. Click **Create API Key**
4. Name: "Setup Script"
5. Select **all scopes** (or at minimum: databases, collections, attributes, indexes)
6. Click **Create**
7. Copy the key (you won't see it again!)

## What This Script Does NOT Do

❌ Deploy the function (must be done via Appwrite Console)
❌ Set function environment variables (must be done manually)
❌ Create sample data (you'll add this later)

These steps require Appwrite Console access and cannot be fully automated via SDK.
