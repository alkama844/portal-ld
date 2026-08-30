'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AdminUser } from '@patient-portal/shared';
import { apiFetch } from '../api/client';

interface AuthContextType {
  user: AdminUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await apiFetch<any>('/auth/me');
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else if (response.success && response.data?.email) {
        setUser(response.data);
      } else {
        setUser(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin_token');
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const userData = response.data?.user || (response.data?.email ? response.data : null);
      const token = response.data?.token;

      if (response.success && userData) {
        if (token && typeof window !== 'undefined') {
          localStorage.setItem('admin_token', token);
        }
        setUser(userData);
        setIsLoading(false);
        return { success: true };
      }

      setIsLoading(false);
      return {
        success: false,
        error: response.error || 'Invalid credentials'
      };
    } catch (err: any) {
      setIsLoading(false);
      return {
        success: false,
        error: err.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
      }
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
