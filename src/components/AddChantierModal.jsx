import React, { useState } from "react";
import { databases, ID } from "../appwrite";

const DB_ID = "692950f300288c67303a";
const CHANTIER_COL = "chantiers";

export default function AddChantierModal({ onClose, onAdded }) {
  const [nom, setNom] = useState("");
  const [couleur, setCouleur] = useState("#3b82f6");

  async function handleAdd() {
    if (!nom.trim()) {
      alert("Le nom du chantier est obligatoire");
      return;
    }

    try {
      await databases.createDocument(DB_ID, CHANTIER_COL, ID.unique(), {
        nom,
        couleur,
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
        <h2>Ajouter un chantier</h2>

        <label>Nom :</label>
        <input
          type="text"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          style={{
            width: "100%",
            marginBottom: 10,
            padding: "6px",
            borderRadius: "6px",
          }}
        />

        <label>Couleur :</label>
        <input
          type="color"
          value={couleur}
          onChange={(e) => setCouleur(e.target.value)}
          style={{
            width: "100%",
            height: "40px",
            marginBottom: 20,
            cursor: "pointer",
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#6b7280", color: "white" }}
          >
            Annuler
          </button>

          <button
            onClick={handleAdd}
            style={{ flex: 1, background: "green", color: "white" }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
