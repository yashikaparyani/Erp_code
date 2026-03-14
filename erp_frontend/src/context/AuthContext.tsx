'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Role } from './RoleContext';

export interface AppUser {
  username: string;
  role: Role;
  roles: string[];
  name: string;
  email: string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSessionUser(payload: any): AppUser | null {
  const data = payload?.data;
  if (!data?.user || !data?.primary_role) {
    return null;
  }

  return {
    username: data.user,
    role: data.primary_role as Role,
    roles: Array.isArray(data.roles) ? data.roles : [],
    name: data.full_name || data.user,
    email: data.email || data.user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        setCurrentUser(null);
        return;
      }

      const payload = await response.json();
      setCurrentUser(mapSessionUser(payload));
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refreshSession();
      setIsLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.success) {
      return false;
    }

    setCurrentUser(mapSessionUser(payload));
    return true;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      setCurrentUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, isAuthenticated: !!currentUser, isLoading, login, logout, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
