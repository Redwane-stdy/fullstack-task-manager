/* pages/Login.jsx - Version simplifiée */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Rediriger si déjà connecté
  if (isAuthenticated) {
    navigate('/boards');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(username, password);
      console.log('🎉 Connexion réussie, redirection...');
      navigate('/boards');
    } catch (error) {
      console.error('❌ Erreur:', error);
      
      if (error.response?.status === 429) {
        setError("Trop de tentatives. Attendez 15 minutes ou redémarrez le serveur.");
      } else if (error.response?.status === 401) {
        setError("Identifiants incorrects");
      } else {
        setError("Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">TaskManager</h1>
        
        <div onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Nom d'utilisateur
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full font-bold py-2 px-4 rounded ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded">
          <p className="text-sm text-blue-800">
            <strong>Identifiants:</strong><br />
            admin / password123
          </p>
        </div>
      </div>
    </div>
  );
}