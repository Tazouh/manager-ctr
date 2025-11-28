// --- SuiviTravaux.jsx ---
// VERSION PC + VERSION MOBILE WIZARD
// Appwrite + Auto code/prix/total + Responsive
// ---------------------------------------------

import React, { useEffect, useState } from "react";
import { account, databases, ID } from "../appwrite";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

const DB_ID = "692950f300288c67303a";
const COLLECTION = "suivi_de_travaux";

const tarifs = {
  "205-A": { travaux: "Tirage souterrain 0 à 288", prix: 1.05 },
  "205-B": { travaux: "Tirage souterrain 288 +", prix: 1.1 },
  "210-A": { travaux: "Tirage aérien 0 à 144", prix: 2.4 },
  "210-B": { travaux: "Tirage aérien 144 +", prix: 2.45 },
  "220-A": { travaux: "Tirage façade 0 à 144", prix: 3.25 },
  "220-B": { travaux: "Tirage façade 144 +", prix: 3.55 },
  "270-A": { travaux: "Soudure sout 0 - 48", prix: 100 },
  "270-B": { travaux: "Soudure sout 72 à 144", prix: 130 },
  "270-C": { travaux: "Soudure sout 288 à 576", prix: 195 },
  "270-D": { travaux: "Soudure sout 576 +", prix: 290 },
  "310-A": { travaux: "Soudure aérien 0 à 48", prix: 120 },
  "310-B": { travaux: "Soudure aérien 72 à 144", prix: 150 },
  "310-C": { travaux: "Soudure aérien 288 +", prix: 240 },
  "340-A": { travaux: "Boîte terminale sout", prix: 80 },
  "340-B": { travaux: "Boîte passage sout", prix: 90 },
  "340-C": { travaux: "Boîte terminale aérien", prix: 90 },
  "340-D": { travaux: "Boîte passage aérien", prix: 110 },
  "350-A": { travaux: "Soudures 0 à 288", prix: 4 },
  "350-B": { travaux: "Soudures 288 +", prix: 3 },
  "360-A": { travaux: "Pose tête 144 PM + soudures", prix: 570 },
  "360-B": { travaux: "Pose tête 72 PM + soudures", prix: 340 },
  "400-A": { travaux: "Mesure 0 à 144", prix: 4 },
  "400-B": { travaux: "Mesure 144 à 288", prix: 3.5 },
  "400-C": { travaux: "Mesure 288 +", prix: 3 },
  "400-D": { travaux: "Mesure Collecte / Transport", prix: 4.5 },
  "500-A": { travaux: "Régie", prix: 55 },
  "500-B": { travaux: "Aiguillage", prix: 0.4 },
};

function weekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

export default function SuiviTravaux() {
  const navigate = useNavigate();
  const isMobile = window.innerWidth < 768;

  const [rows, setRows] = useState([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    date: "",
    travaux: "",
    code: "",
    quantite: "",
    prix: "",
    total: "",
  });

  // ------------------------------
  // LOAD DATA
  // ------------------------------
  useEffect(() => {
    databases
      .listDocuments(DB_ID, COLLECTION)
      .then((res) => setRows(res.documents || []))
      .catch((err) => console.error("Erreur loadRows:", err));
  }, []);

  // ------------------------------
  // NORMALISE NUMBER
  // ------------------------------
  const norm = (v) => {
    if (v === undefined || v === null || v === "") return 0;
    return Number(String(v).replace(",", "."));
  };

  // ------------------------------
  // UPDATE CELL (VERSION PC)
  // ------------------------------
  async function updateCell(id, key, value) {
    try {
      const base = rows.find((r) => r.$id === id);
      if (!base) return;

      const updated = { ...base, [key]: value };

      if (key === "date") {
        const d = new Date(value);
        updated.semaine = weekNumber(d);
        updated.mois = d.getMonth() + 1;
      }

      if (key === "code") {
        const t = tarifs[value];
        if (t) {
          updated.travaux = t.travaux;
          updated.prix = t.prix;
        }
      }

      if (key === "travaux") {
        const entry = Object.entries(tarifs).find(([, t]) => t.travaux === value);
        if (entry) {
          updated.code = entry[0];
          updated.prix = entry[1].prix;
        }
      }

      updated.quantite = norm(updated.quantite);
      updated.prix = norm(updated.prix);
      updated.total = Number((updated.quantite * updated.prix).toFixed(2));

      const {
        $id,
        $collectionId,
        $databaseId,
        $createdAt,
        $updatedAt,
        ...clean
      } = updated;

      await databases.updateDocument(DB_ID, COLLECTION, id, clean);

      setRows((p) => p.map((r) => (r.$id === id ? updated : r)));
    } catch (e) {
      console.error("Erreur updateCell :", e);
    }
  }

  // ------------------------------
  // ADD ROW (PC)
  // ------------------------------
  async function addRow() {
    try {
      const now = new Date();
      const row = {
        date: now.toISOString().split("T")[0],
        semaine: weekNumber(now),
        mois: now.getMonth() + 1,
        description: "",
        plaque: "",
        travaux: "",
        code: "",
        quantite: 0,
        prix: 0,
        total: 0,
      };

      const doc = await databases.createDocument(
        DB_ID,
        COLLECTION,
        ID.unique(),
        row
      );

      setRows((r) => [...r, doc]);
    } catch (e) {
      console.error("Erreur addRow :", e);
    }
  }

  // ------------------------------
  // DELETE
  // ------------------------------
  async function del(id) {
    if (!window.confirm("Supprimer ?")) return;
    try {
      await databases.deleteDocument(DB_ID, COLLECTION, id);
      setRows((r) => r.filter((x) => x.$id !== id));
    } catch (e) {
      console.error("Erreur delete:", e);
    }
  }

  // ------------------------------
  // EXPORT EXCEL
  // ------------------------------
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Travaux");
    XLSX.writeFile(wb, "SuiviTravaux.xlsx");
  }

  // ------------------------------
  // MOBILE WIZARD : SAVE
  // ------------------------------
  async function saveMobile() {
    try {
      const d = new Date(form.date);

      const payload = {
        date: form.date,
        semaine: weekNumber(d),
        mois: d.getMonth() + 1,
        travaux: form.travaux,
        code: form.code,
        quantite: norm(form.quantite),
        prix: norm(form.prix),
        total: Number((norm(form.quantite) * norm(form.prix)).toFixed(2)),
      };

      await databases.createDocument(DB_ID, COLLECTION, ID.unique(), payload);
      alert("Travail enregistré !");
      setStep(1);
      setForm({
        date: "",
        travaux: "",
        code: "",
        quantite: "",
        prix: "",
        total: "",
      });
    } catch (e) {
      console.error("Erreur saveMobile:", e);
      alert("Erreur Appwrite");
    }
  }

  // ------------------------------
  // MOBILE VIEW
  // ------------------------------
  if (isMobile) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial" }}>
        <button onClick={() => navigate("/dashboard")}>⬅ Retour</button>
        <h2>📱 Ajouter un travail</h2>

        {step === 1 && (
          <>
            <h3>📅 Date</h3>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={inp}
            />
            <button style={btn} onClick={() => setStep(2)}>Suivant ➡</button>
          </>
        )}

        {step === 2 && (
          <>
            <h3>🛠️ Travaux</h3>
            <select
              value={form.travaux}
              onChange={(e) => {
                const t = Object.entries(tarifs).find(
                  ([, x]) => x.travaux === e.target.value
                );
                if (t) {
                  setForm({
                    ...form,
                    travaux: t[1].travaux,
                    code: t[0],
                    prix: t[1].prix,
                  });
                } else {
                  setForm({ ...form, travaux: e.target.value });
                }
              }}
              style={inp}
            >
              <option value="">Choisir...</option>
              {Object.entries(tarifs).map(([code, info]) => (
                <option key={code} value={info.travaux}>
                  {info.travaux}
                </option>
              ))}
            </select>
            <button style={btn} onClick={() => setStep(3)}>Suivant ➡</button>
          </>
        )}

        {step === 3 && (
          <>
            <h3>🔢 Quantité</h3>
            <input
              type="number"
              value={form.quantite}
              onChange={(e) =>
                setForm({ ...form, quantite: e.target.value, total: "" })
              }
              style={inp}
            />

            <h3>💶 Prix</h3>
            <input
              type="number"
              step="0.01"
              value={form.prix}
              onChange={(e) => setForm({ ...form, prix: e.target.value })}
              style={inp}
            />

            <h3>🧮 Total</h3>
            <div style={{ fontSize: 24, marginBottom: 20 }}>
              {(
                norm(form.quantite) * norm(form.prix)
              ).toFixed(2)}{" "}
              €
            </div>

            <button style={btnGreen} onClick={saveMobile}>
              ✅ Enregistrer
            </button>
          </>
        )}
      </div>
    );
  }

  // ------------------------------
  // DESKTOP VIEW
  // ------------------------------
  return (
    <div style={page}>
      <div style={card}>
        <div style={header}>
          <button style={btnGrey} onClick={() => navigate("/dashboard")}>
            ← Retour
          </button>
          <h2 style={title}>📋 Suivi de travaux</h2>
          <button style={btnBlue} onClick={exportExcel}>
            💾 Export Excel
          </button>
        </div>

        <table style={table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Semaine</th>
              <th>Plaque</th>
              <th>Travaux</th>
              <th>Code</th>
              <th>Quantité</th>
              <th>Prix</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.$id}>
                <td>
                  <input
                    type="date"
                    style={inp}
                    value={r.date || ""}
                    onChange={(e) => updateCell(r.$id, "date", e.target.value)}
                  />
                </td>

                <td>{r.semaine}</td>

                <td>
                  <input
                    style={inp}
                    value={r.plaque || ""}
                    onChange={(e) => updateCell(r.$id, "plaque", e.target.value)}
                  />
                </td>

                <td>
                  <select
                    style={inp}
                    value={r.travaux || ""}
                    onChange={(e) =>
                      updateCell(r.$id, "travaux", e.target.value)
                    }
                  >
                    <option value="">—</option>
                    {Object.entries(tarifs).map(([c, t]) => (
                      <option key={c}>{t.travaux}</option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    style={inp}
                    value={r.code || ""}
                    onChange={(e) => updateCell(r.$id, "code", e.target.value)}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    style={inp}
                    value={r.quantite}
                    onChange={(e) =>
                      updateCell(r.$id, "quantite", e.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    step="0.01"
                    style={inp}
                    value={r.prix}
                    onChange={(e) => updateCell(r.$id, "prix", e.target.value)}
                  />
                </td>

                <td>{Number(r.total).toFixed(2)} €</td>

                <td>
                  <button
                    onClick={() => del(r.$id)}
                    style={deleteBtn}
                  >
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button style={btnGreen} onClick={addRow}>
          ➕ Ajouter une ligne
        </button>
      </div>
    </div>
  );
}

// ------------------------------
// STYLES
// ------------------------------
const page = {
  background: "#f5f7fb",
  minHeight: "100vh",
  padding: 20,
  fontFamily: "Arial",
};

const card = {
  background: "white",
  padding: 20,
  borderRadius: 12,
  maxWidth: 1400,
  margin: "0 auto",
  boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
};

const title = { margin: 0, color: "#2563eb" };

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 20,
};

const inp = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
};

const btnGrey = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  background: "#e5e7eb",
  cursor: "pointer",
};

const btnBlue = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
};

const btn = {
  padding: 12,
  width: "100%",
  border: "none",
  borderRadius: 8,
  background: "#2563eb",
  color: "white",
  margin: "20px 0",
  fontSize: 18,
};

const btnGreen = {
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
};

const deleteBtn = {
  background: "none",
  border: "none",
  color: "red",
  cursor: "pointer",
};
