'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Role } from './RoleContext';

export interface DemoUser {
  username: string;
  password: string;
  role: Role;
  name: string;
  email: string;
}

export const demoUsers: DemoUser[] = [
  {
    username: 'director',
    password: 'Director@123',
    role: 'Director',
    name: 'Rajesh Sharma',
    email: 'rajesh.sharma@itms.in',
  },
  {
    username: 'dept.head',
    password: 'DeptHead@123',
    role: 'Department Head',
    name: 'Priya Mehta',
    email: 'priya.mehta@itms.in',
  },
  {
    username: 'hr.head',
    password: 'HRHead@123',
    role: 'HR Head',
    name: 'Anjali Rao',
    email: 'anjali.rao@itms.in',
  },
  {
    username: 'presales.head',
    password: 'Presales@123',
    role: 'Presales Tendering Head',
    name: 'Amit Verma',
    email: 'amit.verma@itms.in',
  },
  {
    username: 'eng.head',
    password: 'EngHead@123',
    role: 'Engineering Head',
    name: 'Suresh Nair',
    email: 'suresh.nair@itms.in',
  },
  {
    username: 'engineer',
    password: 'Engineer@123',
    role: 'Engineer',
    name: 'Neha Singh',
    email: 'neha.singh@itms.in',
  },
  {
    username: 'purchase',
    password: 'Purchase@123',
    role: 'Purchase',
    name: 'Vikram Desai',
    email: 'vikram.desai@itms.in',
  },
  {
    username: 'stores.head',
    password: 'Stores@123',
    role: 'Stores Logistics Head',
    name: 'Kavita Joshi',
    email: 'kavita.joshi@itms.in',
  },
  {
    username: 'proj.manager',
    password: 'ProjMgr@123',
    role: 'Project Manager',
    name: 'Ravi Kumar',
    email: 'ravi.kumar@itms.in',
  },
  {
    username: 'accounts',
    password: 'Accounts@123',
    role: 'Accounts',
    name: 'Sunita Patel',
    email: 'sunita.patel@itms.in',
  },
  {
    username: 'field.tech',
    password: 'FieldTech@123',
    role: 'Field Technician',
    name: 'Rohit Gupta',
    email: 'rohit.gupta@itms.in',
  },
  {
    username: 'om.operator',
    password: 'OMOper@123',
    role: 'OM Operator',
    name: 'Deepak Mali',
    email: 'deepak.mali@itms.in',
  },
];

interface AuthContextType {
  currentUser: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('erp_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      sessionStorage.removeItem('erp_user');
    }
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string): boolean => {
    const user = demoUsers.find(
      u => u.username === username.trim() && u.password === password
    );
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem('erp_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('erp_user');
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, isAuthenticated: !!currentUser, isLoading, login, logout }}
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
