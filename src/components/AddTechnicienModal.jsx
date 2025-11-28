import React, { useState } from "react";
import { databases, ID } from "../appwrite";

const DB_ID = "692950f300288c67303a";
const TECH_COL = "techniciens";

export default function AddTechnicienModal({ onClose, onAdded }) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  async function handleAdd() {
    if (!nom.trim() || !prenom.trim()) {
      alert("Nom et prénom sont obligatoires");
      return;
    }

    try {
      await databases.createDocument(DB_ID, TECH_COL, ID.unique(), {
        nom,
        prenom,
        telephone,
        email,
      });

      if (onAdded) onAdded();
      onClose();
    } catch (err) {
      alert("Erreur Appwrite : " + err.message);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: 25,
          borderRadius: 12,
          width: "360px",
        }}
      >
        <h2 style={{ marginBottom: 15 }}>Ajouter un technicien</h2>

        {/* Nom */}
        <label style={{ display: "block", marginBottom: 4 }}>Nom :</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 12,
            padding: "6px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
          }}
        />

        {/* Prénom */}
        <label style={{ display: "block", marginBottom: 4 }}>Prénom :</label>
        <input
          type="text"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 12,
            padding: "6px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
          }}
        />

        {/* Téléphone */}
        <label style={{ display: "block", marginBottom: 4 }}>
          Numéro de téléphone :
        </label>
        <input
          type="tel"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Ex : 0600000000"
          style={{
            width: "100%",
            marginBottom: 12,
            padding: "6px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
          }}
        />

        {/* Mail */}
        <label style={{ display: "block", marginBottom: 4 }}>
          Adresse mail :
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="exemple@domaine.com"
          style={{
            width: "100%",
            marginBottom: 20,
            padding: "6px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "#6b7280",
              color: "white",
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>

          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              background: "green",
              color: "white",
              padding: "8px 0",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
