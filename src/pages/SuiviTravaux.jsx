// --- SuiviTravaux.jsx ---
// VERSION SEMI-OPTIMISÉE
// + Alignement & espacement améliorés
// + Colonnes Quantité / Prix réduites
// + € aligné proprement
// + Nettoyage des doublons
// + Filtres simplifiés
// + Style factorisé
// + 100% compatible Appwrite
// + Champ Plaque
// + Colonne Semaine (auto depuis la date)

import React, { useEffect, useState } from "react";
import { databases, ID } from "../appwrite";
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
// WEEK NUMBER
// ------------------------------
function weekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// ============================================================================
// COMPONENT
// ============================================================================
export default function SuiviTravaux() {
  const navigate = useNavigate();

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Unlock counter (ISF)
  const [unlockCounter, setUnlockCounter] = useState(0);

  // STATE
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState([]);
  const [step, setStep] = useState(1);

  // Vue ISF uniquement
  const [showISFOnly, setShowISFOnly] = useState(false);

  // Filtres colonne par colonne
  const [filters, setFilters] = useState({
    date: "",
    semaine: "",
    description: "",
    plaque: "",
    travaux: "",
    quantite: "",
    prix: "",
    commentaire: "",
    total: "",
  });

  const [form, setForm] = useState({
    date: "",
    description: "",
    plaque: "",
    travaux: "",
    code: "",
    quantite: "",
    prix: "",
    commentaire: "",
  });

  const [openFilter, setOpenFilter] = useState(null);

  const excelFilterIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 5h18v2H3V5zm4 6h10v2H7v-2zm-4 6h18v2H3v-2z" />
    </svg>
  );

  // LOAD DATA
  useEffect(() => {
    databases.listDocuments(DB_ID, COLLECTION).then((res) => {
      const docs = res.documents.map((d) => ({
        ...d,
        isfLocked: Boolean(d.isfLocked),
        isfNumero: d.isfNumero ?? "",
      }));
      setRows(docs);
    });
  }, []);

  const norm = (v) => Number(String(v || 0).replace(",", "."));

  // ------------------------------
  // UPDATE CELL (optimisé, sécurisé ISF)
  // ------------------------------
  async function updateCell(id, key, value, force = false) {
    try {
      const base = rows.find((r) => r.$id === id);
      if (!base) return;

      if (base.isfLocked && !["isfLocked", "isfNumero"].includes(key) && !force) {
        alert("Cette ligne est verrouillée (ISF activé)");
        return;
      }

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
        const found = Object.entries(tarifs).find(([_, t]) => t.travaux === value);
        if (found) {
          updated.code = found[0];
          updated.prix = found[1].prix;
        }
      }

      updated.quantite = norm(updated.quantite);
      updated.prix = norm(updated.prix);
      updated.total = Number((updated.quantite * updated.prix).toFixed(2));

      updated.isfLocked = Boolean(updated.isfLocked);
      updated.isfNumero = updated.isfNumero ?? "";

      const clean = { ...updated };
      delete clean.$id;
      delete clean.$collectionId;
      delete clean.$databaseId;
      delete clean.$createdAt;
      delete clean.$updatedAt;

      await databases.updateDocument(DB_ID, COLLECTION, id, clean);

      setRows((prev) => prev.map((r) => (r.$id === id ? updated : r)));
    } catch (e) {
      console.error("Erreur updateCell :", e);
    }
  }

  // ------------------------------
  // ACTIVER / DESACTIVER ISF
  // ------------------------------
  async function toggleISF(row) {
    if (!row.isfLocked) {
      const numero = prompt("Numéro d'attachement ISF :");
      if (!numero || numero.trim() === "") return;

      await databases.updateDocument(DB_ID, COLLECTION, row.$id, {
        isfLocked: true,
        isfNumero: numero.trim(),
      });

      setRows((prev) =>
        prev.map((r) =>
          r.$id === row.$id ? { ...r, isfLocked: true, isfNumero: numero.trim() } : r
        )
      );
      return;
    }

    const next = unlockCounter + 1;
    setUnlockCounter(next);

    if (next < 8) return;

    await databases.updateDocument(DB_ID, COLLECTION, row.$id, {
      isfLocked: false,
      isfNumero: "",
    });

    setUnlockCounter(0);

    setRows((prev) =>
      prev.map((r) =>
        r.$id === row.$id ? { ...r, isfLocked: false, isfNumero: "" } : r
      )
    );
  }

  // ------------------------------
  // AJOUTER UNE LIGNE
  // ------------------------------
  async function addRow() {
    try {
      const now = new Date();

      const row = {
        date: now.toISOString().split("T")[0],
        description: "",
        plaque: "",
        semaine: weekNumber(now),
        mois: selectedMonth,
        annee: selectedYear,
        travaux: "",
        code: "",
        quantite: 0,
        prix: 0,
        total: 0,
        commentaire: "",
        isfLocked: false,
        isfNumero: "",
      };

      const doc = await databases.createDocument(DB_ID, COLLECTION, ID.unique(), row);

      setRows((r) => [...r, doc]);
    } catch (e) {
      console.error("Erreur addRow :", e);
    }
  }

  // ------------------------------
  // SUPPRESSION
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

  // ========================================================================
  // MOBILE VERSION
  // ========================================================================
  if (isMobile) {
    async function saveMobile() {
      try {
        const now = new Date(form.date);

        const row = {
          date: form.date,
          description: form.description,
          plaque: form.plaque || "",
          semaine: weekNumber(now),
          mois: now.getMonth() + 1,
          annee: now.getFullYear(),
          travaux: form.travaux,
          code: form.code,
          quantite: norm(form.quantite),
          prix: norm(form.prix),
          total: Number((norm(form.quantite) * norm(form.prix)).toFixed(2)),
          commentaire: form.commentaire,
          isfLocked: false,
          isfNumero: "",
        };

        await databases.createDocument(DB_ID, COLLECTION, ID.unique(), row);
        alert("Travail ajouté !");
        navigate("/dashboard");
      } catch (e) {
        console.error("Erreur saveMobile:", e);
      }
    }

    return (
      <div style={{ padding: 20, fontFamily: "Arial" }}>
        <button onClick={() => navigate("/dashboard")}>⬅ Retour</button>
        <h2>📱 Ajout de travaux</h2>

        {/* STEP 1 — DATE */}
        {step === 1 && (
          <>
            <h3>📅 Date</h3>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              style={inpMobile}
            />
            <button style={btnMobile} onClick={() => setStep(2)}>
              Suivant ➡
            </button>
          </>
        )}

        {/* STEP 2 — DESCRIPTION + PLAQUE */}
        {step === 2 && (
          <>
            <h3>📝 Description</h3>
            <input
              type="text"
              placeholder="Ex: CDI07_FD08_6000"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              style={inpMobile}
            />

            <h3>🧱 Plaque</h3>
            <input
              type="text"
              placeholder="Ex: PLAQUE 123"
              value={form.plaque || ""}
              onChange={(e) =>
                setForm({ ...form, plaque: e.target.value })
              }
              style={inpMobile}
            />

            <button style={btnMobile} onClick={() => setStep(3)}>
              Suivant ➡
            </button>
          </>
        )}

        {/* STEP 3 — TRAVAUX */}
        {step === 3 && (
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
              style={inpMobile}
            >
              <option value="">Choisir...</option>
              {Object.entries(tarifs).map(([code, info]) => (
                <option key={code} value={info.travaux}>
                  {info.travaux}
                </option>
              ))}
            </select>

            <button style={btnMobile} onClick={() => setStep(4)}>
              Suivant ➡
            </button>
          </>
        )}

        {/* STEP 4 — QUANTITE / PRIX / COMMENTAIRE */}
        {step === 4 && (
          <>
            <h3>🔢 Quantité</h3>
            <input
              type="number"
              value={form.quantite}
              onChange={(e) =>
                setForm({ ...form, quantite: e.target.value, total: "" })
              }
              style={inpMobile}
            />

            <h3>💶 Prix</h3>
            <input
              type="number"
              step="0.01"
              value={form.prix}
              onChange={(e) => setForm({ ...form, prix: e.target.value })}
              style={inpMobile}
            />

            <h3>💬 Commentaire</h3>
            <input
              type="text"
              value={form.commentaire}
              onChange={(e) =>
                setForm({ ...form, commentaire: e.target.value })
              }
              style={inpMobile}
            />

            <h3>🧮 Total</h3>
            <div style={{ fontSize: 24, marginBottom: 20 }}>
              {(norm(form.quantite) * norm(form.prix)).toFixed(2)} €
            </div>

            <button style={btnGreenMobile} onClick={saveMobile}>
              ✅ Enregistrer
            </button>
          </>
        )}
      </div>
    );
  }

  // ========================================================================
  // DESKTOP VERSION
  // ========================================================================
  return (
    <div style={page}>
      <div style={card}>
        {/* HEADER */}
        <div style={header}>
          <button style={btnGrey} onClick={() => navigate("/dashboard")}>
            ← Retour
          </button>

          <h2 style={title}>📋 Suivi de travaux</h2>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              style={{
                ...btnBlue,
                background: showISFOnly ? "#f97316" : "#2563eb",
              }}
              onClick={() => setShowISFOnly((v) => !v)}
            >
              {showISFOnly ? "Afficher tout" : "Voir ISF"}
            </button>

            <button style={btnBlue} onClick={exportExcel}>
              💾 Export Excel
            </button>
          </div>
        </div>

        {/* FILTER MONTH / YEAR */}
        <div style={filterRow}>
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

        {/* TABLE DESKTOP */}
        <table style={table}>
          <thead>
            {/* COLONNES */}
            <tr>
              <th style={th}>ISF</th>
              <th style={th}>Date</th>
              <th style={{ ...th, width: 70 }}>Semaine</th>
              <th style={th}>Description</th>
              <th style={{ ...th, width: 110 }}>Plaque</th>
              <th style={th}>Travaux</th>
              <th style={{ ...th, width: 60 }}>Qté</th>
              <th style={{ ...th, width: 80 }}>Prix</th>
              <th style={th}>Total</th>
              <th style={th}>Commentaire</th>
              <th style={th}></th>
            </tr>

            {/* FILTRES */}
            <tr>
              <th />

              {/* DATE */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "date" ? null : "date")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "date" && (
                  <div style={filterPopup}>
                    <input
                      type="date"
                      style={input}
                      value={filters.date}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, date: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* SEMAINE */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "semaine" ? null : "semaine")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "semaine" && (
                  <div style={filterPopup}>
                    <input
                      type="number"
                      style={inputCenter}
                      value={filters.semaine}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, semaine: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* DESCRIPTION */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(
                      openFilter === "description" ? null : "description"
                    )
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "description" && (
                  <div style={filterPopup}>
                    <input
                      style={input}
                      placeholder="Contient..."
                      value={filters.description}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* PLAQUE */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "plaque" ? null : "plaque")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "plaque" && (
                  <div style={filterPopup}>
                    <input
                      style={input}
                      placeholder="Contient..."
                      value={filters.plaque}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, plaque: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* TRAVAUX */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "travaux" ? null : "travaux")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "travaux" && (
                  <div style={filterPopup}>
                    <input
                      style={input}
                      placeholder="Contient..."
                      value={filters.travaux}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, travaux: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* QUANTITÉ */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "quantite" ? null : "quantite")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "quantite" && (
                  <div style={filterPopup}>
                    <input
                      type="number"
                      style={inputCenter}
                      value={filters.quantite}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, quantite: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* PRIX */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "prix" ? null : "prix")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "prix" && (
                  <div style={filterPopup}>
                    <input
                      type="number"
                      style={inputCenter}
                      value={filters.prix}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, prix: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* TOTAL */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(openFilter === "total" ? null : "total")
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "total" && (
                  <div style={filterPopup}>
                    <input
                      type="number"
                      style={inputCenter}
                      value={filters.total}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, total: e.target.value }))
                      }
                    />
                  </div>
                )}
              </th>

              {/* COMMENTAIRE */}
              <th style={{ position: "relative" }}>
                <span
                  style={{ marginLeft: 4, cursor: "pointer", opacity: 0.6 }}
                  onClick={() =>
                    setOpenFilter(
                      openFilter === "commentaire" ? null : "commentaire"
                    )
                  }
                >
                  {excelFilterIcon}
                </span>

                {openFilter === "commentaire" && (
                  <div style={filterPopup}>
                    <input
                      style={input}
                      placeholder="Contient..."
                      value={filters.commentaire}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          commentaire: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
              </th>

              <th />
            </tr>
          </thead>

          {/* BODY */}
          <tbody>
            {rows
              .filter((r) => Number(r.mois) === Number(selectedMonth))
              .filter((r) => new Date(r.date).getFullYear() === selectedYear)
              .filter((r) => (showISFOnly ? r.isfLocked : true))

              .filter((r) => (filters.date ? r.date === filters.date : true))
              .filter((r) =>
                filters.semaine
                  ? String(r.semaine) === String(filters.semaine)
                  : true
              )
              .filter((r) =>
                r.description
                  ?.toLowerCase()
                  .includes(filters.description.toLowerCase())
              )
              .filter((r) =>
                r.plaque?.toLowerCase().includes(filters.plaque.toLowerCase())
              )
              .filter((r) =>
                r.travaux?.toLowerCase().includes(filters.travaux.toLowerCase())
              )
              .filter((r) =>
                filters.quantite
                  ? String(r.quantite) === filters.quantite
                  : true
              )
              .filter((r) =>
                filters.prix ? String(r.prix) === filters.prix : true
              )
              .filter((r) =>
                filters.total ? String(r.total) === filters.total : true
              )
              .filter((r) =>
                r.commentaire
                  ?.toLowerCase()
                  .includes(filters.commentaire.toLowerCase())
              )

              .map((r) => {
                const locked = Boolean(r.isfLocked);

                return (
                  <tr
                    key={r.$id}
                    style={{
                      ...row,
                      background: locked ? "#ffe8e8" : "white",
                    }}
                  >
                    {/* ISF */}
                    <td style={tdCenter}>
                      <input
                        type="checkbox"
                        checked={r.isfLocked}
                        onChange={() => toggleISF(r)}
                        style={{ width: 20, height: 20 }}
                      />
                    </td>

                    {/* DATE */}
                    <td style={td}>
                      <input
                        type="date"
                        disabled={locked}
                        style={input}
                        value={r.date || ""}
                        onChange={(e) =>
                          updateCell(r.$id, "date", e.target.value)
                        }
                      />
                    </td>

                    {/* SEMAINE (readonly) */}
                    <td style={tdCenter}>{r.semaine ?? ""}</td>

                    {/* DESCRIPTION */}
                    <td style={td}>
                      <input
                        disabled={locked}
                        style={input}
                        value={r.description || ""}
                        onChange={(e) =>
                          updateCell(r.$id, "description", e.target.value)
                        }
                      />
                    </td>

                    {/* PLAQUE */}
                    <td style={td}>
                      <input
                        disabled={locked}
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
                        disabled={locked}
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

                    {/* QUANTITÉ */}
                    <td style={tdCenter}>
                      <input
                        disabled={locked}
                        type="number"
                        style={{ ...inputCenter, width: "55px" }}
                        value={r.quantite}
                        onChange={(e) =>
                          updateCell(r.$id, "quantite", e.target.value)
                        }
                      />
                    </td>

                    {/* PRIX */}
                    <td style={tdCenter}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                      >
                        <input
                          disabled={locked}
                          type="number"
                          step="0.01"
                          style={{ ...inputCenter, width: "70px" }}
                          value={r.prix}
                          onChange={(e) =>
                            updateCell(r.$id, "prix", e.target.value)
                          }
                        />
                        <span>€</span>
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td style={{ ...tdCenter, whiteSpace: "nowrap" }}>
                      {Number(r.total).toFixed(2)} €
                    </td>

                    {/* COMMENTAIRE */}
                    <td style={td}>
                      <input
                        disabled={locked}
                        style={input}
                        value={r.commentaire || ""}
                        onChange={(e) =>
                          updateCell(r.$id, "commentaire", e.target.value)
                        }
                      />
                    </td>

                    {/* DELETE */}
                    <td style={tdCenter}>
                      {!locked && (
                        <button style={deleteBtn} onClick={() => del(r.$id)}>
                          ❌
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        <button style={btnGreen} onClick={addRow}>
          ➕ Ajouter une ligne
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES DESKTOP
// ============================================================================
const page = {
  minHeight: "100vh",
  padding: 20,
  fontFamily: "Arial",
  backgroundImage: "url('/Fond.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
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
  fontWeight: "bold",
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
  // on sépare les cellules pour créer un espace entre elles
  borderCollapse: "separate",
  borderSpacing: "6px 0",   // 8px d’espace horizontal, 0 vertical
  marginBottom: 20,
  fontSize: 14,
};

const th = {
  background: "#eef2ff",
  padding: 10,
  textAlign: "center",
  fontWeight: 600,
  borderBottom: "2px solid #d1d5db",
};

const row = {
  borderBottom: "1px solid #e5e7eb",
  height: 48,
};

const td = {
  padding: "6px 10px",
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
  background: "white",
};

const inputCenter = {
  ...input,
  textAlign: "center",
};

const deleteBtn = {
  background: "none",
  border: "none",
  color: "red",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: "bold",
};

const btnGrey = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  background: "#e5e7eb",
  cursor: "pointer",
  fontWeight: "bold",
};

const btnBlue = {
  padding: "8px 14px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "white",
  cursor: "pointer",
  fontWeight: "bold",
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

const filterPopup = {
  position: "absolute",
  top: "100%",
  left: 0,
  background: "white",
  padding: 10,
  border: "1px solid #ccc",
  borderRadius: 6,
  boxShadow: "0 3px 8px rgba(0,0,0,0.15)",
  zIndex: 100,
  width: 180,
};

// ============================================================================
// STYLES MOBILE
// ============================================================================
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
  cursor: "pointer",
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
  cursor: "pointer",
};
