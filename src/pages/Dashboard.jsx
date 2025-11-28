import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { account } from "../appwrite";

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
  width: "380px",
};

const titleStyle = {
  fontSize: "1.75rem",
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: "1.5rem",
};

const menuButtonStyle = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "none",
  backgroundColor: "#2563eb",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
  textAlign: "left",
};

const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  marginTop: "0.25rem",
  width: "100%",
  backgroundColor: "#ffffff",
  borderRadius: "0.5rem",
  boxShadow: "0 8px 20px rgba(0,0,0,0.20)",
  overflow: "hidden",
};

const itemStyle = {
  padding: "0.75rem 1rem",
  cursor: "pointer",
  borderBottom: "1px solid #e5e7eb",
};

export default function Dashboard({ onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleItemClick = (label) => {
    console.log("Menu choisi :", label);
    setOpen(false);

    if (label === "Planning") navigate("/planning");
    if (label === "Suivi travaux") navigate("/suivi");
    if (label === "Commande") navigate("/commande");
    if (label === "Gestion") navigate("/gestion");
  };

  const handleLogout = async () => {
    try {
      await account.deleteSession("current");
    } catch (err) {
      console.error("Erreur logout :", err);
    }
    if (onLogout) onLogout();
  };

  return (
    <div style={backgroundStyle}>
      <div style={overlayStyle}></div>

      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h1 style={titleStyle}>Dashboard CTR</h1>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                marginLeft: "1rem",
                padding: "0.35rem 0.7rem",
                borderRadius: "0.375rem",
                border: "none",
                backgroundColor: "#ef4444",
                color: "#fff",
                cursor: "pointer",
                height: "fit-content",
              }}
            >
              Déconnexion
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={menuButtonStyle}
              onClick={() => setOpen((o) => !o)}
            >
              Menu ▾
            </button>

            {open && (
              <ul style={dropdownStyle}>
                <li style={itemStyle} onClick={() => handleItemClick("Planning")}>
                  Planning
                </li>
                <li style={itemStyle} onClick={() => handleItemClick("Suivi travaux")}>
                  Suivi travaux
                </li>
                <li style={itemStyle} onClick={() => handleItemClick("Commande")}>
                  Commande
                </li>
                <li
                  style={{ ...itemStyle, borderBottom: "none" }}
                  onClick={() => handleItemClick("Gestion")}
                >
                  Gestion
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
