'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { setTokenGetter } from '@/lib/utils/apiClient';

/**
 * Component that initializes the API client with auth token getter
 * Must be rendered within AuthProvider
 */
export function AuthInitializer() {
  const { getIdToken } = useAuth();

  useEffect(() => {
    setTokenGetter(getIdToken);
  }, [getIdToken]);

  return null;
}
