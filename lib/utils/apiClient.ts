/**
 * API client utility that automatically includes authentication token
 * Use this instead of fetch() for authenticated API calls
 */

let getTokenFunction: (() => Promise<string | null>) | null = null;

/**
 * Set the function to retrieve the auth token
 * This should be called once in the app initialization
 */
export function setTokenGetter(getter: () => Promise<string | null>) {
  getTokenFunction = getter;
}

/**
 * Get the current ID token
 * Returns null if no token getter is set
 */
export async function getIdToken(): Promise<string | null> {
  return getTokenFunction ? await getTokenFunction() : null;
}

/**
 * Authenticated fetch wrapper that automatically includes Bearer token
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getIdToken();

  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
