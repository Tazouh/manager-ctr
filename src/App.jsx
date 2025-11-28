import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { account } from "./appwrite";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Planning from "./pages/Planning.jsx";

function App() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await account.get();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        Chargement...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* ---- PAGE LOGIN ---- */}
        {!isAuthenticated && (
          <Route
            path="/"
            element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />}
          />
        )}

        {/* ---- PAGES PROTÉGÉES ---- */}
        {isAuthenticated && (
          <>
            <Route
              path="/"
              element={<Dashboard onLogout={() => setIsAuthenticated(false)} />}
            />

            <Route
              path="/dashboard"
              element={<Dashboard onLogout={() => setIsAuthenticated(false)} />}
            />

            <Route
              path="/planning"
              element={<Planning />}
            />
          </>
        )}

        {/* Redirection par défaut */}
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
