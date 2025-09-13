/* App.jsx */
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Boards from "./pages/Boards";
import Board from "./pages/Board";

function App() {
  const { isAuthenticated, loading } = useAuth();

  // Afficher un loader global pendant la vérification de l'auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 text-lg">Initialisation...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Route de connexion */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
              <Navigate to="/boards" replace /> : 
              <Login />
          } 
        />
        
        {/* Routes protégées */}
        <Route 
          path="/boards" 
          element={
            <ProtectedRoute>
              <Layout>
                <Boards />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/boards/:id" 
          element={
            <ProtectedRoute>
              <Layout>
                <Board />
              </Layout>
            </ProtectedRoute>
          } 
        />
        
        {/* Redirection par défaut */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={isAuthenticated ? "/boards" : "/login"} 
              replace 
            />
          } 
        />
        
        {/* Route 404 */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-800">404</h1>
                <p className="text-gray-600 mt-2">Page non trouvée</p>
                <button 
                  onClick={() => window.history.back()}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Retour
                </button>
              </div>
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;