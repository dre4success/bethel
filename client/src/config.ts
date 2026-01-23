// API base URL - uses environment variable or derives from current hostname
export const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8080`
