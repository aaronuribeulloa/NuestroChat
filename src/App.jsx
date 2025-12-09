import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import { ChatContextProvider } from "./context/ChatContext";

// 1. Componente que protege las rutas (El "Portero")
const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();

  // Si NO hay usuario, mándalo al Login ("/")
  if (!currentUser) {
    return <Navigate to="/" />;
  }

  // Si SÍ hay usuario, déjalo pasar (muestra el Chat)
  return children;
};

// 2. La App Principal
function App() {
  return (
    <BrowserRouter>
      {/* El AuthProvider debe envolver todo para dar acceso al usuario */}
      <AuthProvider>
        <ChatContextProvider>
          <Routes>
            {/* Ruta Pública: Login */}
            <Route path="/" element={<Login />} />

            {/* Ruta Privada: Chat */}
            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
          </Routes>
        </ChatContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;