# Leadspree Licenser

A comprehensive license management system for software products, supporting multiple resellers and license verification.

## Project Info

**Original Lovable URL**: https://lovable.dev/projects/ac85b2d3-6e2f-42d9-b937-a25dda222d2c

## Technologies

This project is built with:

- **Frontend**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **Backend**: Appwrite Functions (Node.js 22)
- **Database**: Appwrite Database
- **Authentication**: Supabase Auth (or Appwrite Auth)

## Getting Started

### Prerequisites

- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- Appwrite account (for deployment)

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd leadspree-licenser

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Deployment

### Deploy to Appwrite

This project is configured for deployment to Appwrite. See the comprehensive setup guide:

📖 **[APPWRITE_SETUP.md](./APPWRITE_SETUP.md)** - Complete Appwrite deployment guide

Quick overview:
1. Create Appwrite project and database
2. Deploy the `/functions/verify-license/` function from GitHub
3. Configure environment variables
4. Build and deploy frontend

### Deploy to Lovable (Legacy)

You can still deploy via Lovable:
- Open [Lovable](https://lovable.dev/projects/ac85b2d3-6e2f-42d9-b937-a25dda222d2c)
- Click Share → Publish

## Project Structure

```
leadspree-licenser/
├── functions/
│   └── verify-license/       # Appwrite function for license verification
│       ├── index.mjs          # Function entry point
│       └── package.json       # Function dependencies
├── src/                       # React frontend source
├── supabase/                  # Legacy Supabase configuration
├── APPWRITE_SETUP.md          # Appwrite deployment guide
└── .env.appwrite.example      # Environment variables template
```

## Features

- 🔐 **License Verification API** - Secure license key validation
- 👥 **Multi-tenant Support** - Admin and reseller roles
- 📊 **Dashboard Analytics** - License usage and statistics
- 🔑 **API Key Management** - Secure API access control
- 📦 **Software Management** - Multiple software products
- 📈 **Allocation Tracking** - Reseller license allocations

## Custom Domain

To connect a custom domain:
- **Lovable**: Navigate to Project > Settings > Domains and click Connect Domain
- **Appwrite**: Configure in Appwrite Console under Settings > Domains

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Support

For deployment issues, see [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) troubleshooting section.

