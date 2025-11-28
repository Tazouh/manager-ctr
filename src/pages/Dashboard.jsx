import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { account, databases } from "../appwrite";

// 🔧 Appwrite
const DB_ID = "692950f300288c67303a";
const CONGES_COL = "conges";

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

  // admin / gestion
  const [pendingCongesCount, setPendingCongesCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // notif pour l’utilisateur sur "Demande de congé"
  const [congesNotifCount, setCongesNotifCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();

  // ---------- Fonctions de chargement ----------
  // nb de congés "en attente" (pour l'onglet Gestion, admin uniquement)
  const fetchPendingConges = async () => {
    try {
      const res = await databases.listDocuments(DB_ID, CONGES_COL);
      const pending = res.documents.filter(
        (doc) => doc.statut === "en attente"
      ).length;
      setPendingCongesCount(pending);
    } catch (err) {
      console.error("Erreur chargement congés (pending) :", err);
    }
  };

  // nb de congés de l'utilisateur dont le statut n'est plus "en attente"
  const fetchUserCongesNotif = async (userId) => {
    try {
      const res = await databases.listDocuments(DB_ID, CONGES_COL);
      const mineProcessed = res.documents.filter(
        (doc) => doc.userId === userId && doc.statut !== "en attente"
      );
      setCongesNotifCount(mineProcessed.length);
    } catch (err) {
      console.error("Erreur chargement congés (notif user) :", err);
    }
  };

  // ---------- Init au montage ----------
  useEffect(() => {
    const init = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user);

        const labels = user.labels || [];
        const adminFlag =
          Array.isArray(labels) && labels.includes("admin");
        setIsAdmin(adminFlag);

        if (adminFlag) {
          await fetchPendingConges();
        }

        await fetchUserCongesNotif(user.$id);
      } catch (err) {
        console.error("Erreur chargement utilisateur/dashboard :", err);
      }
    };

    init();
  }, []);

  const handleItemClick = (label) => {
    console.log("Menu choisi :", label);
    setOpen(false);

    if (label === "Planning") navigate("/planning");
    if (label === "Suivi travaux") navigate("/suivi");
    if (label === "Commande") navigate("/commande");
    if (label === "Inventaire") navigate("/inventaire");
    if (label === "Demande de congé") navigate("/conges");
    if (label === "Chat") navigate("/chat");
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
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
              onClick={async () => {
                const newOpen = !open;
                setOpen(newOpen);

                // refresh des compteurs quand on ouvre le menu
                if (newOpen && currentUser) {
                  if (isAdmin) {
                    fetchPendingConges();
                  }
                  fetchUserCongesNotif(currentUser.$id);
                }
              }}
            >
              Menu ▾
            </button>

            {open && (
              <ul style={dropdownStyle}>
                <li style={itemStyle} onClick={() => handleItemClick("Planning")}>
                  Planning
                </li>

                <li
                  style={itemStyle}
                  onClick={() => handleItemClick("Suivi travaux")}
                >
                  Suivi travaux
                </li>

                <li style={itemStyle} onClick={() => handleItemClick("Commande")}>
                  Commande
                </li>

                <li
                  style={itemStyle}
                  onClick={() => handleItemClick("Inventaire")}
                >
                  Inventaire
                </li>

                {/* Demande de congé + bulle pour l'utilisateur */}
                <li
                  style={itemStyle}
                  onClick={() => handleItemClick("Demande de congé")}
                >
                  <span style={{ marginRight: 8 }}>Demande de congé</span>
                  {congesNotifCount > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 20,
                        height: 20,
                        padding: "0 6px",
                        borderRadius: 999,
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}
                    >
                      {congesNotifCount}
                    </span>
                  )}
                </li>

                <li style={itemStyle} onClick={() => handleItemClick("Chat")}>
                  Chat
                </li>

                {/* Gestion visible uniquement pour admin */}
                {isAdmin && (
                  <li
                    style={{ ...itemStyle, borderBottom: "none" }}
                    onClick={() => handleItemClick("Gestion")}
                  >
                    <span style={{ marginRight: 8 }}>Gestion</span>
                    {pendingCongesCount > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 20,
                          height: 20,
                          padding: "0 6px",
                          borderRadius: 999,
                          backgroundColor: "#ef4444",
                          color: "#fff",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                        }}
                      >
                        {pendingCongesCount}
                      </span>
                    )}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
