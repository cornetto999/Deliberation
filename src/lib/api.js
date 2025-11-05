const DEFAULT_BASE = 'http://localhost/deliberation';

// CRA-only env handling
const envBase = process.env.REACT_APP_API_BASE_URL || DEFAULT_BASE;

export const API_BASE_URL = String(envBase).replace(/\/+$/, '');

export const apiUrl = (path) => `${API_BASE_URL}/routes/${path}`;

