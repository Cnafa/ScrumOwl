import React, { createContext, useState, useContext, ReactNode, useMemo } from 'react';
import { User } from '../types';
import { ALL_USERS } from '../constants';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  signInWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const signInWithGoogle = () => {
    // In a real app, this would redirect to Google's OAuth consent screen.
    // Here, we simulate a successful login with a specific Gmail user.
    // The backend would handle the OIDC callback, verify the token,
    // and create/update the user, then issue a JWT.
    // This mock assumes that process was successful for Alice Johnson.
    const googleUser = ALL_USERS.find(u => u.email === 'alice.j@gmail.com');
    if (googleUser) {
        // We also simulate updating the user's profile picture on login,
        // as per the spec, by appending a timestamp to the URL.
        setUser({
            ...googleUser,
            avatarUrl: `${googleUser.avatarUrl}&t=${new Date().getTime()}`
        });
    } else {
        // This case simulates the backend returning an error because the user
        // doesn't exist or isn't a gmail user.
        console.error("Simulated login failed: Could not find the mock Gmail user.");
        alert("Login failed. Only @gmail.com accounts are supported.");
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(() => ({
    isAuthenticated: !!user,
    user,
    signInWithGoogle,
    logout,
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};