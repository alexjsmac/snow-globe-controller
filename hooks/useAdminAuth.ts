import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

// Simple password-based authentication for admin
// In production, you'd want to use Firebase Auth or a more secure solution
const ADMIN_PASSWORD_HASH = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH;

if (!ADMIN_PASSWORD_HASH) {
  console.warn(
    'Admin password not configured. Please set NEXT_PUBLIC_ADMIN_PASSWORD_HASH in your .env.local file'
  );
}

export function useAdminAuth(): AdminAuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if admin is already authenticated via localStorage
    const authToken = localStorage.getItem('admin_auth');
    if (ADMIN_PASSWORD_HASH && authToken === btoa(ADMIN_PASSWORD_HASH)) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = (password: string): boolean => {
    // Simple password check - in production, use proper authentication
    if (!ADMIN_PASSWORD_HASH) {
      console.error('Admin password not configured');
      return false;
    }

    if (password === ADMIN_PASSWORD_HASH) {
      localStorage.setItem('admin_auth', btoa(ADMIN_PASSWORD_HASH));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    router.push('/');
  };

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
}
