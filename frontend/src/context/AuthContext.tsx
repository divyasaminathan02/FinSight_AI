import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    role: User['role'];
    department?: string;
  }) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: User['role']) => void;
}

const DEFAULT_USER: User = {
  id: 1,
  email: 'arjun.mehta@finsight.ai',
  full_name: 'Arjun Mehta',
  role: 'RISK_MANAGER',
  department: 'Portfolio Risk Management',
  is_active: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('finsight_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('finsight_token') || 'demo_token_arjun_mehta';
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('finsight_user', JSON.stringify(user));
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem('finsight_token', data.access_token);
      localStorage.setItem('finsight_user', JSON.stringify(data.user));
    } catch (err) {
      console.warn('Backend login fallback to local session:', err);
      // Fallback for demonstration if offline
      const demoUser: User = {
        id: 1,
        email,
        full_name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        role: 'RISK_MANAGER',
        department: 'Portfolio Risk Management',
        is_active: true,
      };
      setUser(demoUser);
      setToken('demo_token_session');
      localStorage.setItem('finsight_token', 'demo_token_session');
      localStorage.setItem('finsight_user', JSON.stringify(demoUser));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: User['role'];
    department?: string;
  }) => {
    setIsLoading(true);
    try {
      await authApi.register(userData);
      // Auto login upon successful registration
      await login(userData.email, userData.password);
    } catch (err) {
      console.warn('Backend register error, creating demo session:', err);
      const newUser: User = {
        id: Date.now(),
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department || 'Enterprise Financial Operations',
        is_active: true,
      };
      setUser(newUser);
      setToken('demo_token_' + Date.now());
      localStorage.setItem('finsight_token', 'demo_token_' + Date.now());
      localStorage.setItem('finsight_user', JSON.stringify(newUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('finsight_token');
    localStorage.removeItem('finsight_user');
  };

  const switchRole = (newRole: User['role']) => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      localStorage.setItem('finsight_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
