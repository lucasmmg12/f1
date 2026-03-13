// Central API configuration
// In development: uses localhost:8000
// In production: uses the VITE_API_URL environment variable (set in Vercel)
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
