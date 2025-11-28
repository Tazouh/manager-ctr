import React, { useEffect, useState, useMemo } from "react";
import { account, databases, ID, Query } from "../appwrite";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

// === Appwrite ===
const DB_ID = "692950f300288c67303a";
const COLLECTION = "suivi_de_travaux";

// === Tarifs automatiques ===
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

// === Calcule la semaine ISO ===
function weekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - start) / 86400000 + 1) / 7);
}

export default function SuiviTravaux() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState("mois");
  const [selectedWeek, setSelectedWeek] = useState(weekNumber(new Date()));
  const [filters, setFilters] = useState({});

  // === Charger les données Appwrite ===
  async function loadRows() {
    try {
      const res = await databases.listDocuments(DB_ID, COLLECTION);
      setRows(res.documents);
    } catch (err) {
      console.error("Erreur loadRows :", err);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  // ============= Ajouter une ligne ============
  async function addRow() {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];

    const newRow = {
      date: dateStr,
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

    try {
      const doc = await databases.createDocument(DB_ID, COLLECTION, ID.unique(), newRow);
      setRows((prev) => [...prev, doc]);
    } catch (err) {
      console.error("Erreur addRow :", err);
    }
  }

  // ============= Mettre à jour Appwrite ============
  async function updateCell(id, key, value) {
    try {
      const updated = rows.find((r) => r.$id === id);
      if (!updated) return;

      const draft = { ...updated, [key]: value };

      if (key === "date") {
        const d = new Date(value);
        draft.semaine = weekNumber(d);
        draft.mois = d.getMonth() + 1;
      }

      if (key === "code") {
        const info = tarifs[value];
        if (info) {
          draft.travaux = info.travaux;
          draft.prix = info.prix;
        }
      }

      if (key === "travaux") {
        const entry = Object.entries(tarifs).find(([, t]) => t.travaux === value);
        if (entry) {
          draft.code = entry[0];
          draft.prix = entry[1].prix;
        }
      }

      draft.total = (draft.quantite * draft.prix).toFixed(2);

      await databases.updateDocument(DB_ID, COLLECTION, id, draft);

      loadRows();
    } catch (err) {
      console.error("Erreur updateCell :", err);
    }
  }

  // ============= Supprimer une ligne ============
  async function deleteRow(id) {
    if (!window.confirm("Supprimer cette ligne ?")) return;

    try {
      await databases.deleteDocument(DB_ID, COLLECTION, id);
      setRows((prev) => prev.filter((r) => r.$id !== id));
    } catch (err) {
      console.error("Erreur deleteRow :", err);
    }
  }

  // ==================== FILTRAGE ======================
  const monthRows = rows.filter((r) => r.mois === selectedMonth);

  const filtered = useMemo(() => {
    let data = [...monthRows];

    if (viewMode === "semaine")
      data = data.filter((r) => r.semaine === selectedWeek);

    Object.entries(filters).forEach(([key, val]) => {
      if (val && val !== "ALL") data = data.filter((r) => r[key] === val);
    });

    return data;
  }, [rows, selectedMonth, selectedWeek, viewMode, filters]);

  // ==================== EXPORT EXCEL =====================
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Travaux");
    XLSX.writeFile(wb, `Suivi_Travaux_M${selectedMonth}.xlsx`);
  }

  // ==================== RENDU =====================
  return (
    <div
      style={{
        backgroundImage: "url('/Fond.png')",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(6px)",
          padding: 20,
          borderRadius: 12,
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <button onClick={() => navigate("/dashboard")} style={btnGrey}>
            ← Retour
          </button>

          <h2 style={{ margin: 0 }}>📋 Suivi de travaux</h2>

          <button onClick={exportExcel} style={btnBlue}>
            💾 Export Excel
          </button>
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} style={select}>
            <option value="semaine">Vue semaine</option>
            <option value="mois">Vue mois</option>
          </select>

          {viewMode === "semaine" ? (
            <input
              type="number"
              min={1}
              max={53}
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              style={select}
            />
          ) : (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={select}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Mois {i + 1}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tableau */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#e5e7eb" }}>
              <th>Date</th>
              <th>Semaine</th>
              <th>Description</th>
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
            {filtered.map((r) => (
              <tr key={r.$id}>
                <td>
                  <input
                    type="date"
                    value={r.date}
                    onChange={(e) => updateCell(r.$id, "date", e.target.value)}
                    style={input}
                  />
                </td>

                <td>{r.semaine}</td>

                <td>
                  <input
                    value={r.description}
                    onChange={(e) => updateCell(r.$id, "description", e.target.value)}
                    style={input}
                  />
                </td>

                <td>
                  <input
                    value={r.plaque}
                    onChange={(e) => updateCell(r.$id, "plaque", e.target.value)}
                    style={input}
                  />
                </td>

                <td>
                  <select
                    value={r.travaux}
                    onChange={(e) => updateCell(r.$id, "travaux", e.target.value)}
                    style={input}
                  >
                    <option value="">—</option>
                    {Object.entries(tarifs).map(([code, info]) => (
                      <option key={code} value={info.travaux}>
                        {info.travaux}
                      </option>
                    ))}
                  </select>
                </td>

                <td>
                  <input
                    value={r.code}
                    onChange={(e) => updateCell(r.$id, "code", e.target.value)}
                    style={input}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={r.quantite}
                    onChange={(e) => updateCell(r.$id, "quantite", parseFloat(e.target.value))}
                    style={input}
                  />
                </td>

                <td>
                  <input
                    type="number"
                    value={r.prix}
                    onChange={(e) => updateCell(r.$id, "prix", parseFloat(e.target.value))}
                    style={input}
                  />
                </td>

                <td>{r.total} €</td>

                <td>
                  <button onClick={() => deleteRow(r.$id)} style={{ color: "red" }}>
                    ❌
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addRow} style={btnGreen}>
          ➕ Ajouter une ligne
        </button>
      </div>
    </div>
  );
}

// === Styles ===
const btnGrey = {
  background: "#ccc",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  cursor: "pointer",
};

const btnBlue = {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "8px 14px",
  borderRadius: 6,
  cursor: "pointer",
};

const btnGreen = {
  marginTop: 20,
  background: "#10b981",
  color: "white",
  border: "none",
  padding: "10px 16px",
  borderRadius: 6,
  cursor: "pointer",
  width: "100%",
};

const select = {
  padding: "6px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
};

const input = {
  width: "100%",
  padding: "4px",
  borderRadius: 4,
  border: "1px solid #d1d5db",
};
