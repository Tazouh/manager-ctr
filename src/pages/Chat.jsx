// src/pages/Chat.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const backgroundStyle = {
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: "url('/Fond.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
};

const wrapperStyle = {
  position: "relative",
  zIndex: 1,
  minHeight: "100vh",
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const cardStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.9)",
  padding: "2rem",
  borderRadius: "0.75rem",
  boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
  width: "420px",
  maxWidth: "95vw",
};

export default function Chat() {
  const navigate = useNavigate();

  return (
    <div style={backgroundStyle}>
      <div style={overlayStyle}></div>

      <div style={wrapperStyle}>
        <div style={cardStyle}>
          {/* Entête avec bouton retour */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              ← Retour
            </button>

            <span style={{ fontWeight: "600", fontSize: "0.95rem", opacity: 0.7 }}>
              Chat interne
            </span>
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              textAlign: "center",
              marginBottom: "1rem",
            }}
          >
            Chat (bientôt)
          </h1>

          <p style={{ textAlign: "center", opacity: 0.8 }}>
            L’espace de chat sera développé ici plus tard.
            <br />
            Pour l’instant, c’est juste une page de test.
          </p>
        </div>
      </div>
    </div>
  );
}
