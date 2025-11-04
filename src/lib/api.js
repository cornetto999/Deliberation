const DEFAULT_BASE = 'http://localhost/deliberation';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');

export const apiUrl = (path) => `${API_BASE_URL}/routes/${path}`;

