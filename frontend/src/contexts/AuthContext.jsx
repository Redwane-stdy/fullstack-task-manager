/* contexts/AuthContext.jsx - Version simplifiée */
import React, { createContext, useState, useContext } from 'react';
import api from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (username, password) => {
    try {
      console.log('🔐 Connexion avec:', username);
      
      const response = await api.post('/auth/login', { 
        username, 
        password 
      });
      
      console.log('✅ Réponse API:', response.data);
      
      const { token, user: userData } = response.data;
      
      if (token) {
        // Sauvegarder les données
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Mettre à jour l'état
        setUser(userData);
        setIsAuthenticated(true);
        
        console.log('✅ Connexion réussie');
        return userData;
      }
      
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };