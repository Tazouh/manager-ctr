import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { account, databases } from "../appwrite";

// Appwrite
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
  width: "900px",
  maxWidth: "98vw",
};

// même format que dans Conges.jsx
function formatDateFr(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const options = { day: "2-digit", month: "long", year: "numeric" };
  let txt = d.toLocaleDateString("fr-FR", options);
  const parts = txt.split(" ");
  if (parts.length >= 3) {
    parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    txt = parts.join(" ");
  }
  return txt;
}

export default function Gestion() {
  const navigate = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [conges, setConges] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [updatingId, setUpdatingId] = useState(null);

  // drafts pour commentaire admin
  const [commentDrafts, setCommentDrafts] = useState({});

  // charge toutes les demandes de congés
  const loadConges = async () => {
    try {
      const res = await databases.listDocuments(DB_ID, CONGES_COL);

      // tri : en attente d'abord, puis par date de création (plus récent en haut)
      const sorted = [...res.documents].sort((a, b) => {
        if (a.statut === "en attente" && b.statut !== "en attente") return -1;
        if (b.statut === "en attente" && a.statut !== "en attente") return 1;

        const da = a.createdAt || a.$createdAt;
        const db = b.createdAt || b.$createdAt;
        return (db || "").localeCompare(da || "");
      });

      setConges(sorted);

      const pending = sorted.filter((d) => d.statut === "en attente").length;
      setPendingCount(pending);

      // initialiser les commentaires admin dans les drafts
      const drafts = {};
      sorted.forEach((c) => {
        drafts[c.$id] = c.commentaireAdmin || "";
      });
      setCommentDrafts(drafts);
    } catch (err) {
      console.error("Erreur chargement congés (Gestion) :", err);
    }
  };

  // change le statut d'une demande + enregistre le commentaire admin
const updateStatut = async (docId, newStatut) => {
  try {
    setUpdatingId(docId);

    const texte = commentDrafts[docId] ?? "";

    await databases.updateDocument(DB_ID, CONGES_COL, docId, {
      statut: newStatut,
      commentaireAdmin: texte,
      vuUser: false, // 👈 nouvelle décision → à revoir pour le tech
    });

    await loadConges();
  } catch (err) {
    console.error("Erreur update statut congé :", err);
    alert("Erreur lors de la mise à jour du statut (voir console).");
  } finally {
    setUpdatingId(null);
  }
};



  // enregistre le commentaire admin
  const saveAdminComment = async (docId) => {
    try {
      setUpdatingId(docId);
      const texte = commentDrafts[docId] ?? "";
      await databases.updateDocument(DB_ID, CONGES_COL, docId, {
        commentaireAdmin: texte,
      });
      await loadConges();
    } catch (err) {
      console.error("Erreur update commentaire admin :", err);
      alert("Erreur lors de l'enregistrement du commentaire (voir console).");
    } finally {
      setUpdatingId(null);
    }
  };

  // vérifie admin + charge les données
  useEffect(() => {
    const init = async () => {
      try {
        const user = await account.get();
        const labels = user.labels || [];
        const adminFlag =
          Array.isArray(labels) && labels.includes("admin");

        if (!adminFlag) {
          alert("Accès réservé à l'administration.");
          navigate("/dashboard");
          return;
        }

        setIsAdmin(true);
        await loadConges();
      } catch (err) {
        console.error("Erreur chargement utilisateur (Gestion) :", err);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

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
        Chargement de la gestion…
      </div>
    );
  }

  if (!isAdmin) {
    // normallement on est déjà redirigé, mais par sécurité
    return null;
  }

  return (
    <div style={backgroundStyle}>
      <div style={overlayStyle}></div>

      <div style={wrapperStyle}>
        <div style={cardStyle}>
          {/* HEADER */}
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

            <span
              style={{
                fontWeight: "600",
                fontSize: "1rem",
                opacity: 0.85,
              }}
            >
              Gestion
            </span>
          </div>

          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: "bold",
              marginBottom: "1.25rem",
              textAlign: "center",
            }}
          >
            Gestion des congés
          </h1>

          {/* Sous-titre avec bulle de demandes en attente */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontWeight: "600",
                fontSize: "1rem",
              }}
            >
              Demandes de congé
            </div>

            {pendingCount > 0 && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 24,
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 999,
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                }}
              >
                {pendingCount} en attente
              </span>
            )}
          </div>

          {/* TABLEAU DES DEMANDES */}
          {conges.length === 0 ? (
            <p style={{ fontStyle: "italic", opacity: 0.7 }}>
              Aucune demande de congé pour le moment.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
  <table
    style={{
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 4px",   // un peu d'espace entre les lignes
      fontSize: "0.9rem",
    }}
  >
    <thead>
      <tr>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 130,
          }}
        >
          Technicien
        </th>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 120,
          }}
        >
          Début
        </th>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 120,
          }}
        >
          Fin
        </th>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 160,
          }}
        >
          Commentaire technicien
        </th>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 190,
          }}
        >
          Commentaire admin
        </th>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 110,
          }}
        >
          Statut
        </th>
        <th
          style={{
            textAlign: "left",
            padding: "8px 10px",
            borderBottom: "1px solid #e5e7eb",
            minWidth: 170,
          }}
        >
          Actions
        </th>
      </tr>
    </thead>
    <tbody>
      {conges.map((c) => (
        <tr key={c.$id}>
          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
            }}
          >
            {c.userName || c.userId || "—"}
          </td>
          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
            }}
          >
            {formatDateFr(c.dateDebut)}
          </td>
          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
            }}
          >
            {formatDateFr(c.dateFin)}
          </td>
          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
              maxWidth: 220,
            }}
          >
            {c.commentaire || <span style={{ opacity: 0.6 }}>—</span>}
          </td>

          {/* COMMENTAIRE ADMIN : textarea seulement si "en attente" */}
          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
              maxWidth: 260,
            }}
          >
            {c.statut === "en attente" ? (
              <>
                <textarea
                  rows={2}
                  value={commentDrafts[c.$id] ?? ""}
                  onChange={(e) =>
                    setCommentDrafts((prev) => ({
                      ...prev,
                      [c.$id]: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "4px",
                    borderRadius: "0.375rem",
                    border: "1px solid #d1d5db",
                    resize: "vertical",
                    fontSize: "0.85rem",
                  }}
                />
                <button
                  type="button"
                  disabled={updatingId === c.$id}
                  onClick={() => saveAdminComment(c.$id)}
                  style={{
                    marginTop: "4px",
                    padding: "2px 8px",
                    borderRadius: "0.375rem",
                    border: "none",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    fontSize: "0.8rem",
                    cursor:
                      updatingId === c.$id ? "not-allowed" : "pointer",
                  }}
                >
                  Enregistrer
                </button>
              </>
            ) : (
              <div style={{ fontSize: "0.85rem" }}>
                {c.commentaireAdmin && c.commentaireAdmin.trim() !== "" ? (
                  c.commentaireAdmin
                ) : (
                  <span style={{ opacity: 0.6 }}>—</span>
                )}
              </div>
            )}
          </td>

          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
            }}
          >
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 999,
                backgroundColor:
                  c.statut === "en attente"
                    ? "#fde68a"
                    : c.statut === "validé"
                    ? "#bbf7d0"
                    : "#fecaca",
                border: "1px solid #e5e7eb",
              }}
            >
              {c.statut || "—"}
            </span>
          </td>

          <td
            style={{
              padding: "8px 10px",
              verticalAlign: "top",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                disabled={updatingId === c.$id}
                onClick={() => updateStatut(c.$id, "validé")}
                style={{
                  padding: "2px 8px",
                  borderRadius: "0.375rem",
                  border: "none",
                  backgroundColor: "#22c55e",
                  color: "#fff",
                  fontSize: "0.8rem",
                  cursor:
                    updatingId === c.$id ? "not-allowed" : "pointer",
                }}
              >
                Valider
              </button>
              <button
                type="button"
                disabled={updatingId === c.$id}
                onClick={() => updateStatut(c.$id, "refusé")}
                style={{
                  padding: "2px 8px",
                  borderRadius: "0.375rem",
                  border: "none",
                  backgroundColor: "#ef4444",
                  color: "#fff",
                  fontSize: "0.8rem",
                  cursor:
                    updatingId === c.$id ? "not-allowed" : "pointer",
                }}
              >
                Refuser
              </button>
              <button
                type="button"
                disabled={updatingId === c.$id}
                onClick={() => updateStatut(c.$id, "en attente")}
                style={{
                  padding: "2px 8px",
                  borderRadius: "0.375rem",
                  border: "1px solid #9ca3af",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  fontSize: "0.8rem",
                  cursor:
                    updatingId === c.$id ? "not-allowed" : "pointer",
                }}
              >
                Remettre en attente
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

          )}
        </div>
      </div>
    </div>
  );
}
