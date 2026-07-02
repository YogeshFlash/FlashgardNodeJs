// Centralized configuration for Flashgard Pro
// This file is used by both the backend and frontend.

const getEnv = (key: string, fallback: any) => {
  try {
    const env = (globalThis as any).process?.env;
    if (env && env[key]) {
      return env[key];
    }
  } catch {
    // Ignore errors in environments where process is not defined
  }
  return fallback;
};

export const CONFIG = {
  // Backend Configuration
  BACKEND: {
    PORT: Number(getEnv('PORT', 3000)),
    // Database connection string
    DATABASE_URL: getEnv('DATABASE_URL', "postgresql://postgres:PgAdmin@localhost:5432/FlashgardPro?schema=public"),
	//DATABASE_URL: getEnv('DATABASE_URL', "postgresql://flashgard_admin:B75ZgxeGf6aAncEH@localhost:5432/flashgarddb2?schema=public"),
    // JWT secret for authentication
    JWT_SECRET: getEnv('JWT_SECRET', "flashgard-super-secret-key-2026"),
  },

  // Frontend Configuration
  FRONTEND: {
    // API Base URL for frontend requests
    API_BASE_URL: "http://localhost:3000/api",
  },

  // AWS S3 Configuration
  S3: {
    // Base URL for catalog images stored in S3
    CATALOG_IMAGE_BASE_URL: "https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog",
  },
};
