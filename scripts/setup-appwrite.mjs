#!/usr/bin/env node

/**
 * Appwrite Setup Script
 * Automatically creates database, collections, and configures the Appwrite project
 */

import sdk from 'node-appwrite';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Configuration
const CONFIG = {
    DB_ID: 'licenser_db',
    COLLECTIONS: {
        API_KEYS: 'api_keys',
        LICENSES: 'licenses',
        SOFTWARE: 'software'
    }
};

async function setupAppwrite() {
    console.log('\n🚀 Leadspree Licenser - Appwrite Setup Script\n');
    console.log('This script will automatically set up your Appwrite project.\n');

    // Get Appwrite credentials
    const endpoint = await question('Enter Appwrite Endpoint (default: https://cloud.appwrite.io/v1): ') || 'https://cloud.appwrite.io/v1';
    const projectId = await question('Enter your Appwrite Project ID: ');
    const apiKey = await question('Enter your Appwrite API Key (with full permissions): ');

    if (!projectId || !apiKey) {
        console.error('❌ Project ID and API Key are required!');
        process.exit(1);
    }

    // Initialize Appwrite client
    const client = new sdk.Client()
        .setEndpoint(endpoint)
        .setProject(projectId)
        .setKey(apiKey);

    const databases = new sdk.Databases(client);
    const functions = new sdk.Functions(client);

    try {
        console.log('\n📦 Step 1: Creating Database...');
        await createDatabase(databases);

        console.log('\n📋 Step 2: Creating Collections...');
        await createCollections(databases);

        console.log('\n🔑 Step 3: Creating Indexes...');
        await createIndexes(databases);

        console.log('\n✅ Setup completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('1. Deploy the function from GitHub:');
        console.log('   - Go to Appwrite Console → Functions → Create Function');
        console.log('   - Connect your GitHub repository');
        console.log('   - Select folder: functions/verify-license');
        console.log('   - Set entrypoint: index.mjs');
        console.log('   - Runtime: Node.js 22');
        console.log('\n2. Set these environment variables in your function:');
        console.log(`   APPWRITE_ENDPOINT=${endpoint}`);
        console.log(`   APPWRITE_PROJECT_ID=${projectId}`);
        console.log(`   APPWRITE_API_KEY=${apiKey}`);
        console.log(`   DB_ID=${CONFIG.DB_ID}`);
        console.log(`   COL_API_KEYS=${CONFIG.COLLECTIONS.API_KEYS}`);
        console.log(`   COL_LICENSES=${CONFIG.COLLECTIONS.LICENSES}`);
        console.log(`   COL_SOFTWARE=${CONFIG.COLLECTIONS.SOFTWARE}`);
        console.log('\n3. Test your function with sample data');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    } finally {
        rl.close();
    }
}

async function createDatabase(databases) {
    try {
        await databases.create(CONFIG.DB_ID, 'Licenser Database');
        console.log(`✅ Database "${CONFIG.DB_ID}" created successfully`);
    } catch (error) {
        if (error.code === 409) {
            console.log(`ℹ️  Database "${CONFIG.DB_ID}" already exists`);
        } else {
            throw error;
        }
    }
}

async function createCollections(databases) {
    // Create api_keys collection
    await createCollection(
        databases,
        CONFIG.COLLECTIONS.API_KEYS,
        'API Keys',
        [
            { key: 'key_string', type: 'string', size: 128, required: true },
            { key: 'is_active', type: 'boolean', required: true },
            { key: 'last_used_at', type: 'datetime', required: false },
            { key: 'created_at', type: 'datetime', required: true }
        ]
    );

    // Create licenses collection
    await createCollection(
        databases,
        CONFIG.COLLECTIONS.LICENSES,
        'Licenses',
        [
            { key: 'license_key', type: 'string', size: 64, required: true },
            { key: 'software_id', type: 'string', size: 64, required: true },
            { key: 'buyer_name', type: 'string', size: 255, required: true },
            { key: 'buyer_email', type: 'string', size: 255, required: true },
            { key: 'is_active', type: 'boolean', required: true },
            { key: 'start_date', type: 'datetime', required: false },
            { key: 'end_date', type: 'datetime', required: false },
            { key: 'created_at', type: 'datetime', required: true }
        ]
    );

    // Create software collection
    await createCollection(
        databases,
        CONFIG.COLLECTIONS.SOFTWARE,
        'Software',
        [
            { key: 'name', type: 'string', size: 255, required: true },
            { key: 'slug', type: 'string', size: 128, required: true },
            { key: 'type', type: 'string', size: 64, required: false },
            { key: 'version', type: 'string', size: 32, required: false }
        ]
    );
}

async function createCollection(databases, collectionId, name, attributes) {
    try {
        // Create collection
        await databases.createCollection(
            CONFIG.DB_ID,
            collectionId,
            name,
            [sdk.Permission.read(sdk.Role.any())], // Read permissions
            [sdk.Permission.write(sdk.Role.any())] // Write permissions (adjust as needed)
        );
        console.log(`  ✅ Collection "${collectionId}" created`);

        // Add attributes
        for (const attr of attributes) {
            await createAttribute(databases, collectionId, attr);
            // Wait a bit between attribute creations
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        if (error.code === 409) {
            console.log(`  ℹ️  Collection "${collectionId}" already exists`);
        } else {
            throw error;
        }
    }
}

async function createAttribute(databases, collectionId, attr) {
    try {
        if (attr.type === 'string') {
            await databases.createStringAttribute(
                CONFIG.DB_ID,
                collectionId,
                attr.key,
                attr.size,
                attr.required
            );
        } else if (attr.type === 'boolean') {
            await databases.createBooleanAttribute(
                CONFIG.DB_ID,
                collectionId,
                attr.key,
                attr.required
            );
        } else if (attr.type === 'datetime') {
            await databases.createDatetimeAttribute(
                CONFIG.DB_ID,
                collectionId,
                attr.key,
                attr.required
            );
        }
        console.log(`    ✅ Attribute "${attr.key}" added to ${collectionId}`);
    } catch (error) {
        if (error.code === 409) {
            console.log(`    ℹ️  Attribute "${attr.key}" already exists in ${collectionId}`);
        } else {
            throw error;
        }
    }
}

async function createIndexes(databases) {
    // Create indexes for api_keys
    await createIndex(databases, CONFIG.COLLECTIONS.API_KEYS, 'key_string_unique', 'unique', ['key_string']);

    // Create indexes for licenses
    await createIndex(databases, CONFIG.COLLECTIONS.LICENSES, 'license_key_unique', 'unique', ['license_key']);
    await createIndex(databases, CONFIG.COLLECTIONS.LICENSES, 'software_id_index', 'key', ['software_id']);

    // Create indexes for software
    await createIndex(databases, CONFIG.COLLECTIONS.SOFTWARE, 'slug_unique', 'unique', ['slug']);
}

async function createIndex(databases, collectionId, indexKey, type, attributes) {
    try {
        await databases.createIndex(
            CONFIG.DB_ID,
            collectionId,
            indexKey,
            type,
            attributes
        );
        console.log(`  ✅ Index "${indexKey}" created on ${collectionId}`);
    } catch (error) {
        if (error.code === 409) {
            console.log(`  ℹ️  Index "${indexKey}" already exists on ${collectionId}`);
        } else {
            throw error;
        }
    }
}

// Run setup
setupAppwrite().catch(console.error);
