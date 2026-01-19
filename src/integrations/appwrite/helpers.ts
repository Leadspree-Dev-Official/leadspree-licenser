export const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'licenser_db';

export const COLLECTIONS = {
    API_KEYS: import.meta.env.VITE_APPWRITE_COLLECTION_API_KEYS || 'api_keys',
    LICENSES: import.meta.env.VITE_APPWRITE_COLLECTION_LICENSES || 'licenses',
    SOFTWARE: import.meta.env.VITE_APPWRITE_COLLECTION_SOFTWARE || 'software',
};

// Convert Appwrite document to match expected format
export const formatDocument = (doc: any) => ({
    id: doc.$id,
    ...doc,
    created_at: doc.$createdAt,
    updated_at: doc.$updatedAt,
});

// Format multiple documents
export const formatDocuments = (docs: any[]) => docs.map(formatDocument);
