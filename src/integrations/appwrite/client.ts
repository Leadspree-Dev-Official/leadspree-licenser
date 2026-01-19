import { Client, Databases, Account, Query, ID } from 'appwrite';

const client = new Client()
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1')
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID || '69387f1b0031db2eabd9');

export const databases = new Databases(client);
export const account = new Account(client);
export { Query, ID };
export default client;
