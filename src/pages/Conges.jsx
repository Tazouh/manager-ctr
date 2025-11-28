import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { databases, ID, account } from "../appwrite";

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
  width: "480px",
  maxWidth: "95vw",
};

const titleStyle = {
  fontSize: "1.5rem",
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: "1.5rem",
};

// IDs Appwrite
const DB_ID = "692950f300288c67303a";
const CONGES_COL = "conges";

// 🔹 Formattage des dates type "28 Novembre 2025"
function formatDateFr(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const options = { day: "2-digit", month: "long", year: "numeric" };
  let txt = d.toLocaleDateString("fr-FR", options); // ex: "28 novembre 2025"

  const parts = txt.split(" ");
  if (parts.length >= 3) {
    parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
    txt = parts.join(" ");
  }
  return txt;
}

export default function Conges() {
  const navigate = useNavigate();

  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // 🔸 mode édition : null = nouvelle demande, sinon = id du document
  const [editingId, setEditingId] = useState(null);

  // 🔐 Récupérer l'utilisateur + ses demandes de congé
  const loadMyRequests = async () => {
    try {
      setLoadingRequests(true);

      const user = await account.get();
      setCurrentUser(user);

      const res = await databases.listDocuments(DB_ID, CONGES_COL);

      const mine = res.documents
        .filter((doc) => doc.userId === user.$id)
        .sort((a, b) =>
          (b.createdAt || b.$createdAt).localeCompare(
            a.createdAt || a.$createdAt
          )
        );

      setMyRequests(mine);
      console.log("Mes demandes de congé :", mine);
    } catch (err) {
      console.error("Erreur chargement des demandes :", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
  }, []);

  // 🔸 Cliquer sur "Modifier" : pré-remplir le formulaire
  const startEdit = (req) => {
    if (!currentUser || req.userId !== currentUser.$id) return;
    if (req.statut !== "en attente") return;

    setDateDebut(req.dateDebut || "");
    setDateFin(req.dateFin || "");
    setCommentaire(req.commentaire || "");
    setEditingId(req.$id);
  };

  // 🔸 Annuler le mode édition
  const cancelEdit = () => {
    setEditingId(null);
    setDateDebut("");
    setDateFin("");
    setCommentaire("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!dateDebut || !dateFin) {
      alert("Merci de saisir une date de début et une date de fin.");
      return;
    }

    setLoading(true);

    try {
      let user = currentUser;
      if (!user) {
        user = await account.get();
        setCurrentUser(user);
      }

      console.log("Demande de congé (submit) :", {
        dateDebut,
        dateFin,
        commentaire,
        editingId,
      });

      if (editingId) {
        // 🔧 Mise à jour d'une demande existante (seulement si toujours "en attente")
        const req = myRequests.find((r) => r.$id === editingId);
        if (!req || req.statut !== "en attente") {
          alert(
            "Cette demande ne peut plus être modifiée (statut changé entre temps)."
          );
        } else {
          await databases.updateDocument(DB_ID, CONGES_COL, editingId, {
            dateDebut,
            dateFin,
            commentaire,
          });
          alert("Demande de congé mise à jour ✅");
        }
      } else {
        // ➕ Nouvelle demande
        await databases.createDocument(DB_ID, CONGES_COL, ID.unique(), {
          dateDebut,
          dateFin,
          commentaire,
          userId: user ? user.$id : null,
          userName: user ? user.name : null,
          statut: "en attente",
          createdAt: new Date().toISOString(),
        });

        alert("Demande de congé enregistrée ✅");
      }

      // reset du formulaire + sortie du mode édition
      setDateDebut("");
      setDateFin("");
      setCommentaire("");
      setEditingId(null);

      await loadMyRequests();
    } catch (err) {
      console.error("Erreur Appwrite (congés) :", err);
      alert("Erreur Appwrite : " + (err?.message || "voir console"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={backgroundStyle}>
      <div style={overlayStyle}></div>

      <div style={wrapperStyle}>
        <div style={cardStyle}>
          {/* Header avec retour */}
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
              Demande de congé
            </span>
          </div>

          <h1 style={titleStyle}>
            {editingId ? "Modifier une demande de congé" : "Formulaire de congés"}
          </h1>

          {/* FORMULAIRE */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="dateDebut"
                style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}
              >
                Date de début
              </label>
              <input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="dateFin"
                style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}
              >
                Date de fin
              </label>
              <input
                id="dateFin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="commentaire"
                style={{ display: "block", fontWeight: "500", marginBottom: "0.25rem" }}
              >
                Commentaire (optionnel)
              </label>
              <textarea
                id="commentaire"
                rows={3}
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Ex : congés payés, récupération, raison..."
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  backgroundColor: loading ? "#9ca3af" : "#2563eb",
                  color: "#fff",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? "Envoi en cours..."
                  : editingId
                  ? "Enregistrer les modifications"
                  : "Envoyer la demande"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#f3f4f6",
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>

          {/* LISTE DES DEMANDES DU COMPTE */}
          <div style={{ marginTop: "2rem" }}>
            <h2
              style={{
                fontSize: "1.1rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
              }}
            >
              Mes demandes de congé
            </h2>

            {loadingRequests ? (
              <p style={{ fontStyle: "italic", opacity: 0.7 }}>Chargement…</p>
            ) : myRequests.length === 0 ? (
              <p style={{ fontStyle: "italic", opacity: 0.7 }}>
                Aucune demande enregistrée pour l’instant.
              </p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", paddingBottom: 4 }}>Début</th>
                    <th style={{ textAlign: "left", paddingBottom: 4 }}>Fin</th>
                    <th style={{ textAlign: "left", paddingBottom: 4 }}>Statut</th>
                    <th style={{ textAlign: "left", paddingBottom: 4 }}>
                      Commentaire admin
                    </th>
                    <th style={{ textAlign: "left", paddingBottom: 4 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((req) => (
                    <tr key={req.$id}>
                      <td style={{ padding: "2px 0" }}>
                        {formatDateFr(req.dateDebut)}
                      </td>
                      <td style={{ padding: "2px 0" }}>
                        {formatDateFr(req.dateFin)}
                      </td>
                      <td style={{ padding: "2px 0" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor:
                              req.statut === "en attente"
                                ? "#fde68a"
                                : req.statut === "validé"
                                ? "#bbf7d0"
                                : "#fecaca",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {req.statut}
                        </span>
                      </td>
                      <td style={{ padding: "2px 0", maxWidth: 220 }}>
                        {req.commentaireAdmin ? (
                          req.commentaireAdmin
                        ) : (
                          <span style={{ opacity: 0.6 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "2px 0" }}>
                        {req.statut === "en attente" && (
                          <button
                            type="button"
                            onClick={() => startEdit(req)}
                            style={{
                              padding: "2px 8px",
                              borderRadius: "0.375rem",
                              border: "1px solid #d1d5db",
                              backgroundColor: "#e5e7eb",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Modifier
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
