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

// ------------------------------
// TARIFS
// ------------------------------
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

// ------------------------------
// SEMAINE DU MOIS
// ------------------------------
function weekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// ============================================================================
//   COMPONENT
// ============================================================================
export default function SuiviTravaux() {
  const navigate = useNavigate();

  // 🔥 Mobile detection FIX
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ------------------------------
  // STATE
  // ------------------------------
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  // Convertit virgule → point
  const norm = (v) => Number(String(v || 0).replace(",", "."));

  // ------------------------------
  // UPDATE CELL
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
        updated.annee = d.getFullYear();
      }

      if (key === "code" && tarifs[value]) {
        updated.travaux = tarifs[value].travaux;
        updated.prix = tarifs[value].prix;
      }

      if (key === "travaux") {
        const entry = Object.entries(tarifs).find(
          ([, t]) => t.travaux === value
        );
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

      setRows((prev) => prev.map((r) => (r.$id === id ? updated : r)));
    } catch (e) {
      console.error("Erreur updateCell :", e);
    }
  }

  // ------------------------------
  // ADD ROW
  // ------------------------------
  async function addRow() {
    try {
      const now = new Date();
      const row = {
        date: now.toISOString().split("T")[0],
        semaine: weekNumber(now),
        mois: selectedMonth,
        annee: selectedYear,
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
  // EXPORT
  // ------------------------------
  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Travaux");
    XLSX.writeFile(wb, "SuiviTravaux.xlsx");
  }

  // ------------------------------
  // SAVE MOBILE
  // ------------------------------
  async function saveMobile() {
    try {
      const d = new Date(form.date);

      const payload = {
        date: form.date,
        semaine: weekNumber(d),
        mois: d.getMonth() + 1,
        annee: d.getFullYear(),
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
    }
  }

  // ============================================================================
  //   MOBILE WIZARD
  // ============================================================================
  if (isMobile) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial" }}>
        <button onClick={() => navigate("/dashboard")}>⬅ Retour</button>
        <h2>📱 Ajouter un travail</h2>

        {/* ÉTAPE 1 */}
        {step === 1 && (
          <>
            <h3>📅 Date</h3>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={inp}
            />
            <button style={btn} onClick={() => setStep(2)}>
              Suivant ➡
            </button>
          </>
        )}

        {/* ÉTAPE 2 */}
        {step === 2 && (
          <>
            <h3>🛠️ Travaux</h3>
            <select
              value={form.travaux}
              onChange={(e) => {
                const entry = Object.entries(tarifs).find(
                  ([, t]) => t.travaux === e.target.value
                );
                if (entry) {
                  setForm({
                    ...form,
                    travaux: entry[1].travaux,
                    code: entry[0],
                    prix: entry[1].prix,
                  });
                } else setForm({ ...form, travaux: e.target.value });
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

            <button style={btn} onClick={() => setStep(3)}>
              Suivant ➡
            </button>
          </>
        )}

        {/* ÉTAPE 3 */}
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
              {(norm(form.quantite) * norm(form.prix)).toFixed(2)} €
            </div>

            <button style={btnGreen} onClick={saveMobile}>
              ✅ Enregistrer
            </button>
          </>
        )}
      </div>
    );
  }

  // ============================================================================
  //   DESKTOP VERSION
  // ============================================================================
  return (
    <div style={page}>
      <div style={card}>
        {/* HEADER */}
        <div style={header}>
          <button style={btnGrey} onClick={() => navigate("/dashboard")}>
            ← Retour
          </button>

          <h2 style={title}>📋 Suivi de travaux</h2>

          <button style={btnBlue} onClick={exportExcel}>
            💾 Export Excel
          </button>
        </div>

        {/* FILTRES */}
        <div style={filterRow}>
          {/* ANNÉE */}
          <select
            style={select}
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {Array.from({ length: 6 }, (_, i) => selectedYear - 3 + i).map(
              (year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              )
            )}
          </select>

          {/* MOIS */}
          <select
            style={select}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {[
              "Janvier",
              "Février",
              "Mars",
              "Avril",
              "Mai",
              "Juin",
              "Juillet",
              "Août",
              "Septembre",
              "Octobre",
              "Novembre",
              "Décembre",
            ].map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* TABLE */}
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Date</th>
              <th style={th}>Semaine</th>
              <th style={th}>Plaque</th>
              <th style={th}>Travaux</th>
              <th style={th}>Code</th>
              <th style={th}>Quantité</th>
              <th style={th}>Prix</th>
              <th style={th}>Total</th>
              <th style={th}></th>
            </tr>
          </thead>

          <tbody>
            {rows
              .filter((r) => Number(r.mois) === Number(selectedMonth))
              .filter((r) => new Date(r.date).getFullYear() === selectedYear)
              .map((r) => (
                <tr key={r.$id} style={row}>
                  {/* DATE */}
                  <td style={td}>
                    <input
                      type="date"
                      style={input}
                      value={r.date || ""}
                      onChange={(e) => updateCell(r.$id, "date", e.target.value)}
                    />
                  </td>

                  {/* SEMAINE */}
                  <td style={tdCenter}>{r.semaine}</td>

                  {/* PLAQUE */}
                  <td style={td}>
                    <input
                      style={input}
                      value={r.plaque || ""}
                      onChange={(e) =>
                        updateCell(r.$id, "plaque", e.target.value)
                      }
                    />
                  </td>

                  {/* TRAVAUX */}
                  <td style={td}>
                    <select
                      style={input}
                      value={r.travaux || ""}
                      onChange={(e) =>
                        updateCell(r.$id, "travaux", e.target.value)
                      }
                    >
                      <option value="">—</option>
                      {Object.entries(tarifs).map(([c, t]) => (
                        <option key={c} value={t.travaux}>
                          {t.travaux}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* CODE */}
                  <td style={td}>
                    <input
                      style={input}
                      value={r.code || ""}
                      onChange={(e) => updateCell(r.$id, "code", e.target.value)}
                    />
                  </td>

                  {/* QUANTITE */}
                  <td style={tdCenter}>
                    <input
                      type="number"
                      style={inputCenter}
                      value={r.quantite}
                      onChange={(e) =>
                        updateCell(r.$id, "quantite", e.target.value)
                      }
                    />
                  </td>

                  {/* PRIX */}
                  <td style={tdCenter}>
                    <input
                      type="number"
                      step="0.01"
                      style={inputCenter}
                      value={r.prix}
                      onChange={(e) => updateCell(r.$id, "prix", e.target.value)}
                    />
                  </td>

                  {/* TOTAL */}
                  <td style={tdCenter}>{Number(r.total).toFixed(2)} €</td>

                  {/* DELETE */}
                  <td style={tdCenter}>
                    <button style={deleteBtn} onClick={() => del(r.$id)}>
                      ❌
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {/* ADD BUTTON */}
        <button style={btnGreen} onClick={addRow}>
          ➕ Ajouter une ligne
        </button>
      </div>
    </div>
  );
}

// ============================================================================
//   STYLES
// ============================================================================
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
  marginBottom: 30,
};

const title = {
  margin: 0,
  color: "#2563eb",
  fontSize: 24,
};

const filterRow = {
  display: "flex",
  gap: 10,
  marginBottom: 15,
};

const select = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "white",
  fontSize: 14,
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 20,
  fontSize: 14,
};

const th = {
  background: "#eef2ff",
  padding: 12,
  textAlign: "center",
  fontWeight: 600,
  borderBottom: "2px solid #d1d5db",
};

const row = {
  borderBottom: "1px solid #e5e7eb",
  height: 50,
};

const td = {
  padding: "8px 10px",
  verticalAlign: "middle",
};

const tdCenter = {
  ...td,
  textAlign: "center",
};

const input = {
  width: "100%",
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
};

const inputCenter = {
  ...input,
  textAlign: "center",
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

const btnGreen = {
  padding: 14,
  borderRadius: 8,
  border: "none",
  background: "#10b981",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
  width: "100%",
  fontSize: 16,
};

const deleteBtn = {
  background: "none",
  border: "none",
  color: "red",
  cursor: "pointer",
  fontSize: 20,
};
// ------------------------------
// STYLES MOBILE (NOUVEAUX NOMS)
// ------------------------------

const inpMobile = {
  width: "100%",
  padding: "12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 16,
  marginBottom: 20,
};

const btnMobile = {
  padding: "12px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 8,
  width: "100%",
  marginTop: 10,
  fontSize: 18,
  fontWeight: "bold",
};

const btnGreenMobile = {
  padding: "14px",
  background: "#10b981",
  color: "white",
  border: "none",
  borderRadius: 8,
  width: "100%",
  fontSize: 18,
  fontWeight: "bold",
};

