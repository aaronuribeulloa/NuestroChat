import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Room from "./pages/Room";
import { ChatContextProvider } from "./context/ChatContext";
import React from "react";

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/" />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatContextProvider>
          <Routes>
            <Route path="/" element={<Login />} />

            <Route
              path="/chat"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />

            {/* --- RUTA PARA VIDEOLLAMADAS --- */}
            <Route
              path="/room/:roomId"
              element={
                <PrivateRoute>
                  <Room />
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