import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AppointmentRole } from '../types';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (appointment: AppointmentRole, password: string) => Promise<void>;
  logout: () => void;
  switchAppointment: (appointment: AppointmentRole) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  canModify: () => boolean;
  hasAppointment: (allowed: AppointmentRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await api.getCurrentUser();
          setUser(res.user);
        } catch (e) {
          clearAuthToken();
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (appointment: AppointmentRole, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ appointment, password });
      setAuthToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  const switchAppointment = async (appointment: AppointmentRole) => {
    // Logging out to allow clean re-authentication under the new appointment role
    logout();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.changePassword({ currentPassword, newPassword });
  };

  const canModify = (): boolean => {
    if (!user) return false;
    // CO has strictly read-only access. 2IC, DUTY_OFFICER, DUTY_MUNSHI have full operational access.
    return user.appointment !== 'CO';
  };

  const hasAppointment = (allowed: AppointmentRole[]): boolean => {
    if (!user) return false;
    return allowed.includes(user.appointment);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        switchAppointment,
        changePassword,
        canModify,
        hasAppointment,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
