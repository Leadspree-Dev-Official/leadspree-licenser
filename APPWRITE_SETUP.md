# Appwrite Migration Guide

This guide explains how to deploy the Leadspree Licenser to Appwrite after migrating from Supabase.

## Prerequisites

Before deploying, ensure you have:

1. **Appwrite Cloud Account** or self-hosted Appwrite instance
2. **GitHub Repository** with this code pushed
3. **Appwrite Project** created in the Appwrite Console

## Step 1: Create Appwrite Database

### 1.1 Create Database

1. Go to Appwrite Console → **Databases**
2. Click **Create Database**
3. Set Database ID: `licenser_db`
4. Click **Create**

### 1.2 Create Collections

Create the following collections with their respective fields:

#### Collection: `api_keys`

| Field Name | Type | Size | Required | Array |
|------------|------|------|----------|-------|
| key_string | String | 128 | Yes | No |
| is_active | Boolean | - | Yes | No |
| last_used_at | DateTime | - | No | No |
| created_at | DateTime | - | Yes | No |

**Indexes:**
- Create unique index on `key_string`

#### Collection: `licenses`

| Field Name | Type | Size | Required | Array |
|------------|------|------|----------|-------|
| license_key | String | 64 | Yes | No |
| software_id | String | 64 | Yes | No |
| buyer_name | String | 255 | Yes | No |
| buyer_email | String | 255 | Yes | No |
| is_active | Boolean | - | Yes | No |
| start_date | DateTime | - | No | No |
| end_date | DateTime | - | No | No |
| created_at | DateTime | - | Yes | No |

**Indexes:**
- Create unique index on `license_key`
- Create index on `software_id`

#### Collection: `software`

| Field Name | Type | Size | Required | Array |
|------------|------|------|----------|-------|
| name | String | 255 | Yes | No |
| slug | String | 128 | Yes | No |
| type | String | 64 | No | No |
| version | String | 32 | No | No |

**Indexes:**
- Create unique index on `slug`

## Step 2: Create Appwrite API Key

1. Go to Appwrite Console → **Overview** → **API Keys**
2. Click **Create API Key**
3. Name: `Licenser Server Key`
4. Select the following scopes:
   - ✅ `databases.read`
   - ✅ `databases.write`
   - ✅ `functions.execute`
5. Click **Create**
6. **Copy the API key** (you won't see it again!)

## Step 3: Deploy Appwrite Function

### 3.1 Connect GitHub Repository

1. Go to Appwrite Console → **Functions**
2. Click **Create Function**
3. Choose **Git** as the source
4. Connect your GitHub account if not already connected
5. Select your repository: `leadspree-licenser`
6. Click **Next**

### 3.2 Configure Function

**Basic Settings:**
- **Function Name:** `verify-license`
- **Runtime:** `Node.js 22.0`
- **Branch:** `main` (or your default branch)
- **Root Directory:** `functions/verify-license`
- **Entrypoint:** `index.mjs`

**Build Settings:**
- **Build Command:** (leave empty, npm install runs automatically)
- **Install Command:** `npm install`

**Execution Settings:**
- **Timeout:** 15 seconds
- **Memory:** 512 MB

### 3.3 Set Environment Variables

Add the following environment variables:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1` | Appwrite API endpoint |
| `APPWRITE_PROJECT_ID` | `<your_project_id>` | Your Appwrite project ID |
| `APPWRITE_API_KEY` | `<server_api_key>` | API key from Step 2 |
| `DB_ID` | `licenser_db` | Database ID |
| `COL_API_KEYS` | `api_keys` | API keys collection ID |
| `COL_LICENSES` | `licenses` | Licenses collection ID |
| `COL_SOFTWARE` | `software` | Software collection ID |

**To find your Project ID:**
- Go to Appwrite Console → **Settings** → **Project ID**

### 3.4 Configure Permissions

1. Scroll to **Execute Access**
2. Select **Any** (allows public API calls)
3. Click **Create**

### 3.5 Deploy

1. Click **Deploy** or wait for automatic deployment
2. Monitor the build logs
3. Once deployed, you'll see a **Function URL** (copy this!)

## Step 4: Update Frontend (Optional)

If you want to use Appwrite for license verification in your frontend:

### 4.1 Create `.env.local` or update `.env`

```env
# Appwrite Configuration
VITE_APPWRITE_FUNCTION_URL=https://cloud.appwrite.io/v1/functions/<function-id>/executions
```

Replace `<function-id>` with your actual function ID from the Appwrite Console.

### 4.2 Update API Calls

In your frontend code where you verify licenses, replace the Supabase call:

```javascript
// Old Supabase approach
const { data } = await supabase.functions.invoke('verify-license', {
  body: { api_key, license_key, software_id }
});

// New Appwrite approach
const response = await fetch(import.meta.env.VITE_APPWRITE_FUNCTION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    api_key,
    license_key,
    software_id
  })
});

const data = await response.json();
```

## Step 5: Test the Function

### 5.1 Test via Appwrite Console

1. Go to your function in Appwrite Console
2. Click **Execute**
3. Set **Method:** `POST`
4. Add **Body:**

```json
{
  "api_key": "your-test-api-key",
  "license_key": "your-test-license-key",
  "software_id": "optional-software-id"
}
```

5. Click **Execute**
6. Check the response

### 5.2 Test via cURL

```bash
curl -X POST \
  https://cloud.appwrite.io/v1/functions/<function-id>/executions \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your-test-api-key",
    "license_key": "your-test-license-key"
  }'
```

## Step 6: Deploy Frontend to Appwrite (Optional)

If you want to host your frontend on Appwrite as well:

1. Go to Appwrite Console → **Storage** → **Create Bucket**
2. Enable **File Security** → Public read access
3. Build your frontend: `npm run build`
4. Upload the `dist` folder contents to the bucket
5. Configure custom domain if needed

**Alternative:** Use Appwrite's Git Deploy feature (if available in your plan)

## Troubleshooting

### Function Build Fails

- Check that `package.json` is in `functions/verify-license/`
- Verify the entrypoint is set to `index.mjs`
- Check build logs for specific errors

### "Invalid API key" Error

- Verify the API key has correct scopes
- Check that `APPWRITE_API_KEY` environment variable is set correctly
- Ensure the API key is not expired

### Database Connection Issues

- Verify database ID matches `DB_ID` environment variable
- Check collection IDs match environment variables
- Ensure API key has `databases.read` and `databases.write` scopes

### CORS Errors

- The function includes CORS headers for `*` origin
- If you need to restrict origins, modify the `corsHeaders` in `index.mjs`

## Migration Checklist

- [ ] Appwrite project created
- [ ] Database `licenser_db` created
- [ ] Collections created: `api_keys`, `licenses`, `software`
- [ ] Indexes configured on collections
- [ ] Server API key created with correct scopes
- [ ] Function deployed from GitHub
- [ ] Environment variables configured
- [ ] Function tested successfully
- [ ] Frontend updated (if applicable)
- [ ] Data migrated from Supabase (if applicable)

## Next Steps

1. **Migrate Data:** Export data from Supabase and import to Appwrite
2. **Update Frontend:** Switch API calls to use Appwrite function
3. **Test Thoroughly:** Verify all license operations work correctly
4. **Monitor:** Check function logs and execution metrics
5. **Optimize:** Adjust timeout and memory settings based on usage

## Support

For issues specific to:
- **Appwrite:** Check [Appwrite Documentation](https://appwrite.io/docs)
- **This Project:** Review function logs in Appwrite Console
