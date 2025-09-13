// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { 
    "Content-Type": "application/json" 
  },
  timeout: 10000, // Timeout de 10 secondes
});

// Intercepteur pour les requêtes - ajouter automatiquement le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🚀 Requête envoyée:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur dans la requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses - gérer les erreurs automatiquement
api.interceptors.response.use(
  (response) => {
    console.log('✅ Réponse reçue:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('❌ Erreur de réponse:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url
    });

    // Si token expiré, rediriger vers login
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirection vers la page de login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem('token');
  }
}

// Fonction de test de connexion
export async function testConnection() {
  try {
    const response = await api.get('/health');
    console.log('✅ API accessible:', response.data);
    return true;
  } catch (error) {
    console.error('❌ API non accessible:', error.message);
    return false;
  }
}

// Fonctions d'authentification
export const auth = {
  // Login
  async login(credentials) {
    try {
      console.log('🔐 Tentative de connexion:', { email: credentials.email });
      const response = await api.post('/auth/login', credentials);
      
      if (response.data.token) {
        setAuthToken(response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.response?.data || error.message);
      throw error;
    }
  },

  // Register
  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('❌ Erreur d\'inscription:', error.response?.data || error.message);
      throw error;
    }
  },

  // Logout
  logout() {
    setAuthToken(null);
    localStorage.removeItem('user');
    console.log('👋 Déconnexion réussie');
  },

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  // Obtenir l'utilisateur actuel
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};

// -----------------------
// Endpoints Boards / Lists / Cards
// -----------------------
// Assomption REST : base /api
// Boards : /boards, /boards/:id
// Lists (nested) : /boards/:boardId/lists, /lists/:id
// Cards (nested) : /lists/:listId/cards, /cards/:id
// Reorder endpoints: POST /boards/:boardId/lists/reorder { ordered: [...] }
//                    POST /lists/:listId/cards/reorder { ordered: [...] }

export const boardsAPI = {
  list: () => api.get('/boards'),
  get: (id) => api.get(`/boards/${id}`),
  create: (payload) => api.post('/boards', payload),
  update: (id, payload) => api.patch(`/boards/${id}`, payload),
  remove: (id) => api.delete(`/boards/${id}`),
};

export const listsAPI = {
  listForBoard: (boardId) => api.get(`/boards/${boardId}/lists`),
  createForBoard: (boardId, payload) => api.post(`/boards/${boardId}/lists`, payload),
  update: (listId, payload) => api.patch(`/lists/${listId}`, payload),
  remove: (listId) => api.delete(`/lists/${listId}`),
  reorderForBoard: (boardId, ordered) => api.post(`/boards/${boardId}/lists/reorder`, { ordered }),
};

export const cardsAPI = {
  createForList: (listId, payload) => api.post(`/lists/${listId}/cards`, payload),
  update: (cardId, payload) => api.patch(`/cards/${cardId}`, payload),
  remove: (cardId) => api.delete(`/cards/${cardId}`),
  reorderForList: (listId, ordered) => api.post(`/lists/${listId}/cards/reorder`, { ordered }),
};

export default api;
