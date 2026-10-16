import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cdt_token') || '');
  const [loading, setLoading] = useState(true);

  // Initialize and verify user
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Auth check error, falling back to local demo profile:', err);
        }
      }

      // Default demo profile matching screenshots
      const demoUser = {
        _id: 'usr_89f02c',
        id: 'usr_89f02c',
        name: 'Sarah Connor',
        email: 'sarah@codetogether.dev',
        avatar: 'SC',
        handle: '@sarah_c',
        role: 'architect',
        settings: {
          micMutedByDefault: false,
          cameraOffByDefault: false,
          theme: 'vs-dark',
          fontSize: 14,
          tabSize: 2,
        },
      };

      setUser(demoUser);
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }
      localStorage.setItem('cdt_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      localStorage.setItem('cdt_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('cdt_token');
    setToken('');
    // Reset to demo user or null
    setUser(null);
  };

  const updateProfile = async (updateData) => {
    try {
      if (token) {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          return data.user;
        }
      }
      // Local fallback
      setUser(prev => ({ ...prev, ...updateData }));
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
