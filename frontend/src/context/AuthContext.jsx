import React, { createContext, useState, useEffect, useCallback } from 'react';
import { loginApi, registerApi, getMeApi } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('smart_campus_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and verify user on application mount
  const initializeAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('smart_campus_token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getMeApi();
      if (data.success && data.user) {
        setUser(data.user);
        setToken(savedToken);
      } else {
        localStorage.removeItem('smart_campus_token');
        setUser(null);
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to verify authenticated session:', err.message);
      localStorage.removeItem('smart_campus_token');
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Login handler
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await loginApi({ email, password });
      if (data.success && data.token) {
        localStorage.setItem('smart_campus_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Invalid email or password';
      setAuthError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Register handler
  const register = async (userData) => {
    setAuthError(null);
    try {
      const data = await registerApi(userData);
      if (data.success && data.token) {
        localStorage.setItem('smart_campus_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to complete registration';
      setAuthError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('smart_campus_token');
    setUser(null);
    setToken(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        isAuthenticated: !!user,
        role: user?.role || null,
        login,
        register,
        logout,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
