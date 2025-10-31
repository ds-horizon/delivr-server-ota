import { Options } from "sequelize";

export const DB_NAME = "codepushdb";
export const DB_USER = "codepush";
export const DB_PASS = "root";
export const DB_HOST = "localhost";
export const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "codepush-local-bucket";
export const GCS_EMULATOR_CLIENT_EMAIL = "test@example.com";
export const GCS_EMULATOR_PRIVATE_KEY = "fake-private-key-for-emulator";

export const SEQUELIZE_CONFIG: Options = {
  database: process.env.DB_NAME || DB_NAME,
  dialect: "mysql",
  replication: {
    write: {
      host: process.env.DB_HOST || DB_HOST,
      username: process.env.DB_USER || DB_USER,
      password: process.env.DB_PASS || DB_PASS,
    },
    read: [
      {
        host: process.env.DB_HOST_READER,
        username: process.env.DB_USER || DB_USER,
        password: process.env.DB_PASS || DB_PASS,
      },
    ],
  },
  pool: {
    max: 5,
    min: 1,
    acquire: 10000,
    idle: 10000,
    evict: 15000,
    maxUses: 100000,
  },
};

export const GCS_CONFIG = {
  projectId: process.env.GCP_PROJECT_ID || 'codepush-local-dev',
  // For local development with fake-gcs-server
  ...(process.env.NODE_ENV === 'development' && {
    apiEndpoint: process.env.STORAGE_EMULATOR_HOST || 'http://localhost:4443',
    // Use fake credentials for fake-gcs-server
    credentials: {
      client_email: process.env.GCS_EMULATOR_CLIENT_EMAIL || GCS_EMULATOR_CLIENT_EMAIL,
      private_key: process.env.GCS_EMULATOR_PRIVATE_KEY || GCS_EMULATOR_PRIVATE_KEY
    },
    // Disable SSL verification for local development
    ...(process.env.STORAGE_EMULATOR_HOST && {
      ssl: false
    })
  }),
  // For production, use service account key file or ADC
  ...(process.env.NODE_ENV !== 'development' && process.env.GOOGLE_APPLICATION_CREDENTIALS && {
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  })
};
