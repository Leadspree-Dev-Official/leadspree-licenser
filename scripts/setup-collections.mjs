#!/usr/bin/env node

/**
 * Appwrite Setup Script - Collections Only
 * Creates collections in existing database
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';

// Configuration - EDIT THESE VALUES
const CONFIG = {
    ENDPOINT: 'https://sgp.cloud.appwrite.io/v1',
    PROJECT_ID: '69387f1b0031db2eabd9',
    API_KEY: 'standard_f2a68d3226995da6720141c994a8bd6387087b699aab6ec8eeaed008a49c3ea1b123f0253f8157c99979498a90a062cb5aaf33529a0b798da017b8780aa11cfa1ca040e5a60258e5d3cb35992fe709c177768778bc01f8ae5f5f93d287c3658933079f43e5020ef492a36e5c548e698afb967d80ca165df72ad2572cbb3915f8',
    DB_ID: 'licenser_db',
    COLLECTIONS: {
        API_KEYS: 'api_keys',
        LICENSES: 'licenses',
        SOFTWARE: 'software'
    }
};

async function setupCollections() {
    console.log('\n🚀 Leadspree Licenser - Creating Collections\n');

    // Initialize Appwrite client
    const client = new Client()
        .setEndpoint(CONFIG.ENDPOINT)
        .setProject(CONFIG.PROJECT_ID)
        .setKey(CONFIG.API_KEY);

    const databases = new Databases(client);

    try {
        console.log('📋 Creating Collections...\n');
        await createCollections(databases);

        console.log('\n🔑 Creating Indexes...\n');
        await createIndexes(databases);

        console.log('\n✅ Setup completed successfully!');
        console.log('\n📝 Next Steps:');
        console.log('1. Deploy the function from GitHub:');
        console.log('   - Go to Appwrite Console → Functions → Create Function');
        console.log('   - Connect your GitHub repository: LS-License_Appwrite');
        console.log('   - Select folder: functions/verify-license');
        console.log('   - Set entrypoint: index.mjs');
        console.log('   - Runtime: Node.js 22');
        console.log('\n2. Set these environment variables in your function:');
        console.log(`   APPWRITE_ENDPOINT=${CONFIG.ENDPOINT}`);
        console.log(`   APPWRITE_PROJECT_ID=${CONFIG.PROJECT_ID}`);
        console.log(`   APPWRITE_API_KEY=${CONFIG.API_KEY}`);
        console.log(`   DB_ID=${CONFIG.DB_ID}`);
        console.log(`   COL_API_KEYS=${CONFIG.COLLECTIONS.API_KEYS}`);
        console.log(`   COL_LICENSES=${CONFIG.COLLECTIONS.LICENSES}`);
        console.log(`   COL_SOFTWARE=${CONFIG.COLLECTIONS.SOFTWARE}`);
        console.log('\n3. Test your function with sample data\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
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
        // Create collection with correct parameter order for Appwrite SDK 13.0
        // createCollection(databaseId, collectionId, name, permissions, documentSecurity, enabled)
        await databases.createCollection(
            CONFIG.DB_ID,
            collectionId,
            name,
            undefined, // permissions - use undefined for default
            false,     // documentSecurity
            false      // enabled
        );
        console.log(`  ✅ Collection "${collectionId}" created`);

        // Add attributes
        for (const attr of attributes) {
            await createAttribute(databases, collectionId, attr);
            await new Promise(resolve => setTimeout(resolve, 1500));
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
setupCollections().catch(console.error);
