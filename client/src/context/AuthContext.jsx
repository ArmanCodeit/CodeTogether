import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cdt_token') || '');
  const [loading, setLoading] = useState(true);

  // Initialize and verify user from backend
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
          } else {
            // Token invalid or expired
            localStorage.removeItem('cdt_token');
            setToken('');
          }
        } catch (err) {
          console.warn('Auth check error:', err);
        }
      }

      // Check for locally saved guest profile
      const savedGuest = localStorage.getItem('cdt_guest_user');
      if (savedGuest) {
        try {
          setUser(JSON.parse(savedGuest));
          setLoading(false);
          return;
        } catch (e) {}
      }

      // Default clean developer profile based on random ID
      const newGuestId = `dev_${Math.random().toString(36).substring(2, 8)}`;
      const defaultProfile = {
        _id: newGuestId,
        id: newGuestId,
        name: 'Developer',
        email: '',
        avatar: 'DV',
        handle: `@${newGuestId}`,
        role: 'developer',
        settings: {
          micMutedByDefault: false,
          cameraOffByDefault: false,
          theme: 'vs-dark',
          fontSize: 14,
          tabSize: 2,
        },
      };
      setUser(defaultProfile);
      localStorage.setItem('cdt_guest_user', JSON.stringify(defaultProfile));
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
      localStorage.removeItem('cdt_guest_user');
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
      localStorage.removeItem('cdt_guest_user');
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('cdt_token');
    localStorage.removeItem('cdt_guest_user');
    setToken('');
    const guestId = `dev_${Math.random().toString(36).substring(2, 8)}`;
    const guest = {
      _id: guestId,
      id: guestId,
      name: 'Developer',
      email: '',
      avatar: 'DV',
      handle: `@${guestId}`,
      role: 'developer',
      settings: {
        micMutedByDefault: false,
        cameraOffByDefault: false,
        theme: 'vs-dark',
        fontSize: 14,
        tabSize: 2,
      },
    };
    setUser(guest);
    localStorage.setItem('cdt_guest_user', JSON.stringify(guest));
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
      // Update local profile
      setUser(prev => {
        const updated = { ...prev, ...updateData };
        if (updateData.name) {
          updated.avatar = updateData.name.substring(0, 2).toUpperCase();
        }
        localStorage.setItem('cdt_guest_user', JSON.stringify(updated));
        return updated;
      });
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
        isAuthenticated: !!token && !!user?.email,
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
