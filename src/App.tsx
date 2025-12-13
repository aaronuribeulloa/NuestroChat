import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatContextProvider } from "./context/ChatContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Room from "./pages/Room";
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
          <ThemeProvider>
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
              <Route
                path="/room/:roomId"
                element={
                  <PrivateRoute>
                    <Room />
                  </PrivateRoute>
                }
              />
            </Routes>
          </ThemeProvider>
        </ChatContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;