import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, getToken, getStoredUser, setStoredUser, setToken } from "../apiClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Restore from localStorage immediately for fast UI render
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      setUserRole(stored.role);
    }

    // Validate token with server
    auth.me()
      .then(({ user: serverUser }) => {
        setUser(serverUser);
        setUserRole(serverUser.role);
        setStoredUser(serverUser);
        localStorage.setItem('user_role', serverUser.role);
      })
      .catch(() => {
        auth.logout();
        setUser(null);
        setUserRole(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token, userData) => {
    setToken(token);
    setStoredUser(userData);
    localStorage.setItem('user_role', userData.role);
    setUser(userData);
    setUserRole(userData.role);
  };

  const logout = () => {
    auth.logout();
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
