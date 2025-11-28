import React, { useEffect, useState } from "react";
import { databases, ID } from "../appwrite";
import { useNavigate } from "react-router-dom";
import AddTechnicienModal from "../components/AddTechnicienModal";
import AddChantierModal from "../components/AddChantierModal";
import * as XLSX from "xlsx";

// === Appwrite IDs ===
const DB_ID = "692950f300288c67303a";
const TECH_COL = "techniciens";
const CHANTIER_COL = "chantiers";
const PLAN_COL = "planning";

// === Période autorisée ===
const MIN_DATE = new Date(2025, 11, 1);
const MAX_DATE = new Date(2050, 0, 31);

function clampDate(d) {
  if (d < MIN_DATE) return MIN_DATE;
  if (d > MAX_DATE) return MAX_DATE;
  return d;
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getISOWeek(d) {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}

export default function Planning() {
  const navigate = useNavigate();

  // === STATES ===
  const [techniciens, setTechniciens] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [planning, setPlanning] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("week");

  const [showTechModal, setShowTechModal] = useState(false);
  const [showChantierModal, setShowChantierModal] = useState(false);

  const [quickMenu, setQuickMenu] = useState(null);
  const [modal, setModal] = useState(null);

  const [showManageTech, setShowManageTech] = useState(false);
  const [showManageChantier, setShowManageChantier] = useState(false);

  // === LOAD DATA ===
  useEffect(() => {
    loadTechniciens();
    loadChantiers();
    loadPlanning();
  }, []);

  async function loadTechniciens() {
    try {
      const res = await databases.listDocuments(DB_ID, TECH_COL);
      setTechniciens(res.documents);
    } catch (err) {
      console.error("Erreur loadTechniciens :", err);
    }
  }

  async function loadChantiers() {
    try {
      const res = await databases.listDocuments(DB_ID, CHANTIER_COL);
      setChantiers(res.documents);
    } catch (err) {
      console.error("Erreur loadChantiers :", err);
    }
  }

  async function loadPlanning() {
    try {
      const res = await databases.listDocuments(DB_ID, PLAN_COL);

      const obj = {};
      res.documents.forEach((doc) => {
        if (!doc.date || !doc.technicienId) return;

        const dateStr =
          typeof doc.date === "string"
            ? doc.date.slice(0, 10)
            : (() => {
                const d = new Date(doc.date);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
              })();

        const key = `${dateStr}-${doc.technicienId}`;
        obj[key] = doc;
      });

      setPlanning(obj);
    } catch (err) {
      console.error("Erreur loadPlanning :", err);
    }
  }

  // === SAVE & DELETE ===
  async function savePlanningCell(date, techId, updates) {
    const key = `${date}-${techId}`;
    const prev = planning[key];

    if (prev) {
      await databases.updateDocument(DB_ID, PLAN_COL, prev.$id, updates);
    } else {
      await databases.createDocument(DB_ID, PLAN_COL, ID.unique(), {
        date,
        technicienId: techId,
        ...updates,
      });
    }

    loadPlanning();
  }

  async function deletePlanningCell(date, techId) {
    const key = `${date}-${techId}`;
    const prev = planning[key];
    if (!prev) return;

    await databases.deleteDocument(DB_ID, PLAN_COL, prev.$id);
    loadPlanning();
  }

  // === GESTION TECH & CHANTIERS ===
  async function handleDeleteTechnicien(id) {
    if (!window.confirm("Supprimer ce technicien ?")) return;
    await databases.deleteDocument(DB_ID, TECH_COL, id);
    loadTechniciens();
    loadPlanning();
  }

  async function handleRenameTechnicien(tech) {
    const nouveauNom = window.prompt("Nouveau nom du technicien :", tech.nom);
    if (!nouveauNom || !nouveauNom.trim()) return;

    await databases.updateDocument(DB_ID, TECH_COL, tech.$id, {
      nom: nouveauNom.trim(),
    });
    loadTechniciens();
  }

  async function handleDeleteChantier(id) {
    if (!window.confirm("Supprimer ce chantier ?")) return;
    await databases.deleteDocument(DB_ID, CHANTIER_COL, id);
    loadChantiers();
  }

  async function handleRenameChantier(chantier) {
    const nouveauNom = window.prompt("Nouveau nom :", chantier.nom);
    if (!nouveauNom || !nouveauNom.trim()) return;

    await databases.updateDocument(DB_ID, CHANTIER_COL, chantier.$id, {
      nom: nouveauNom.trim(),
      couleur: chantier.couleur,
    });
    loadChantiers();
  }

  async function handleChangeChantierColor(chantier, newColor) {
    await databases.updateDocument(DB_ID, CHANTIER_COL, chantier.$id, {
      nom: chantier.nom,
      couleur: newColor,
    });
    loadChantiers();
  }

  // === NAVIGATION ===
  function nextMonth() {
    setCurrentDate((d) => {
      const x = new Date(d);
      x.setMonth(x.getMonth() + 1);
      return clampDate(x);
    });
  }

  function prevMonth() {
    setCurrentDate((d) => {
      const x = new Date(d);
      x.setMonth(x.getMonth() - 1);
      return clampDate(x);
    });
  }

  function nextWeek() {
    setCurrentDate((d) => {
      const x = new Date(d);
      x.setDate(x.getDate() + 7);
      return clampDate(x);
    });
  }

  function prevWeek() {
    setCurrentDate((d) => {
      const x = new Date(d);
      x.setDate(x.getDate() - 7);
      return clampDate(x);
    });
  }

  // === JOURS ===
  function getMonthDays(date) {
    let y = date.getFullYear();
    let m = date.getMonth();

    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    const days = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  }

  function getWeekDays(date) {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));

    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // === COULEUR DU CHANTIER ===
  function getChantierColorByName(nom) {
    if (!nom) return null;
    const c = chantiers.find((ch) => ch.nom === nom);
    return c?.couleur || null;
  }

  // === CELLULE ===
  function renderCellContent(cell, showTitle = true) {
    if (!cell) return showTitle ? "—" : null;

    return (
      <div style={{ fontSize: "12px" }}>
        {showTitle && (
          <div style={{ fontWeight: "bold" }}>{cell.valeur || "—"}</div>
        )}

        {cell.petit && (
          <div>🚐 <span style={{ fontSize: "11px" }}>Petit déplacement</span></div>
        )}

        {cell.grand && (
          <div>🧳 <span style={{ fontSize: "11px" }}>Grand déplacement</span></div>
        )}

        {cell.nuit && (
          <div>🌙 <span style={{ fontSize: "11px" }}>Nuit ({cell.heuresNuit}h)</span></div>
        )}
      </div>
    );
  }

  // === MENUS ===
  function openQuickMenu(e, date, techId) {
    e.preventDefault();
    setQuickMenu({ x: e.clientX, y: e.clientY, date, techId });
  }

  function openModal(e, date, techId) {
    e.preventDefault();
    const key = `${date}-${techId}`;
    const cell = planning[key] || {};

    setModal({
      date,
      techId,
      chantier: cell.valeur || "",
      petit: cell.petit || false,
      grand: cell.grand || false,
      nuit: cell.nuit || false,
      heuresNuit: cell.heuresNuit || 0,
      secteur: cell.secteur || "",
      id: cell.$id || null,
    });
  }

  // === EXPORT EXCEL ===
  function exportToExcel() {
    const days =
      viewMode === "month" ? getMonthDays(currentDate) : getWeekDays(currentDate);

    const header = [
      "Technicien",
      ...days.map((d) =>
        d.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        })
      ),
    ];

    const data = [header];

    techniciens.forEach((t) => {
      const row = [t.nom];

      days.forEach((d) => {
        const dateStr = ymd(d);
        const key = `${dateStr}-${t.$id}`;
        const cell = planning[key];

        if (!cell) {
          row.push("");
        } else {
          const parts = [];
          if (cell.valeur) parts.push(cell.valeur);
          if (cell.petit) parts.push("Petit déplacement");
          if (cell.grand) parts.push("Grand déplacement");
          if (cell.nuit) parts.push(`Nuit (${cell.heuresNuit || 0}h)`);
          if (cell.secteur) parts.push(`Secteur: ${cell.secteur}`);
          row.push(parts.join(" | "));
        }
      });

      data.push(row);
    });

    if (data.length === 1) {
      alert("Aucune donnée à exporter.");
      return;
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      viewMode === "week" ? "Semaine" : "Mois"
    );

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const label = viewMode === "week" ? "semaine" : "mois";
    a.href = url;
    a.download = `planning_${label}_${ymd(currentDate)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
// === RENDU VUE MENSUELLE ===
function renderMonth() {
  const days = getMonthDays(currentDate);

  return (
    <div style={{ padding: 20 }}>
      {/* NAVIGATION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 15,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            padding: "6px 12px",
            background: "#1f2937",
            color: "white",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          ◀
        </button>

        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#111827",
            margin: 0,
          }}
        >
          {currentDate
            .toLocaleString("fr-FR", { month: "long", year: "numeric" })
            .toUpperCase()}
        </h2>

        <button
          onClick={nextMonth}
          style={{
            padding: "6px 12px",
            background: "#1f2937",
            color: "white",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          ▶
        </button>
      </div>

      {/* TABLEAU */}
      <div
        style={{
          width: "100%",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: "700px",
            borderCollapse: "separate",
            borderSpacing: "0 6px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "10px 6px",
                  background: "#f3f4f6",
                  borderRadius: "6px",
                  textAlign: "center",
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Date
              </th>

              {techniciens.map((t) => (
                <th
                  key={t.$id}
                  style={{
                    padding: "10px 6px",
                    background: "#f3f4f6",
                    borderRadius: "6px",
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {t.nom}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {days.map((d, i) => {
              const dateStr = ymd(d);
              const week = getISOWeek(d);

              return (
                <React.Fragment key={dateStr}>
                  <tr>
                    {/* CELLULE DATE */}
                    <td
                      style={{
                        padding: "10px 6px",
                        background: "#e5e7eb",
                        borderRadius: "6px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#1f2937",
                      }}
                    >
                      <div style={{ opacity: 0.7 }}>S{week}</div>
                      <div style={{ fontSize: "13px" }}>
                        {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        {pad(d.getDate())}/{pad(d.getMonth() + 1)}
                      </div>
                    </td>

                    {/* CELLULES TECHNICIENS */}
                    {techniciens.map((t) => {
                      const key = `${dateStr}-${t.$id}`;
                      const cell = planning[key];
                      const chantierColor = cell?.valeur
                        ? getChantierColorByName(cell.valeur)
                        : null;

                      return (
                        <td
                          key={t.$id}
                          style={{
                            padding: 0,
                            minWidth: "120px",
                            backgroundColor: chantierColor || "#d1d5db",
                            borderRadius: "8px",
                            cursor: "pointer",
                            overflow: "hidden",
                            boxShadow:
                              chantierColor ? "0 0 8px rgba(0,0,0,0.15)" : "none",
                          }}
                          onClick={(e) => openQuickMenu(e, dateStr, t.$id)}
                          onContextMenu={(e) => openModal(e, dateStr, t.$id)}
                        >
                          <div
                            style={{
                              padding: "8px 4px",
                              color: "black",
                              fontWeight: 700,
                              fontSize: "13px",
                              wordBreak: "break-word",
                              textAlign: "center",
                            }}
                          >
                            {cell?.valeur || "—"}
                          </div>

                          {cell && (
                            <div
                              style={{
                                fontSize: "11px",
                                paddingBottom: 6,
                                textAlign: "center",
                                color: "#111",
                              }}
                            >
                              {cell.petit && <div>🚐 Petit déplacement</div>}
                              {cell.grand && <div>🧳 Grand déplacement</div>}
                              {cell.nuit && (
                                <div>🌙 Nuit ({cell.heuresNuit}h)</div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* LIGNE SÉPARATION ENTRE SEMAINES */}
                  {(i === 0 || getISOWeek(d) !== getISOWeek(days[i - 1])) && (
                    <tr>
                      <td colSpan={1 + techniciens.length}>
                        <div
                          style={{
                            height: "4px",
                            background: "#000",
                            opacity: 0.4,
                            margin: "10px 0",
                            borderRadius: 4,
                          }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// === RENDU VUE HEBDO ===
function renderWeek() {
  const days = getWeekDays(currentDate);

  return (
    <div style={{ padding: 20 }}>
      {/* NAVIGATION SEMAINE */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 15,
        }}
      >
        <button
          onClick={prevWeek}
          style={{
            padding: "6px 12px",
            background: "#1f2937",
            color: "white",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          ◀
        </button>

        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#111827",
            margin: 0,
          }}
        >
          Semaine {getISOWeek(currentDate)} —{" "}
          {days[0].toLocaleDateString("fr-FR")} au{" "}
          {days[4].toLocaleDateString("fr-FR")}
        </h2>

        <button
          onClick={nextWeek}
          style={{
            padding: "6px 12px",
            background: "#1f2937",
            color: "white",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          ▶
        </button>
      </div>

      {/* TABLEAU */}
      <div style={{ width: "100%", overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: "700px",
            borderCollapse: "separate",
            borderSpacing: "0 6px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "10px 6px",
                  background: "#f3f4f6",
                  borderRadius: 6,
                  textAlign: "center",
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                Technicien
              </th>

              {days.map((d) => (
                <th
                  key={d}
                  style={{
                    padding: "10px 6px",
                    background: "#f3f4f6",
                    borderRadius: 6,
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#374151",
                  }}
                >
                  {d.toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {techniciens.map((t) => (
              <tr key={t.$id}>
                {/* NOM TECHNICIEN */}
                <td
                  style={{
                    padding: "10px 6px",
                    background: "#e5e7eb",
                    borderRadius: 8,
                    fontWeight: 700,
                    color: "#1f2937",
                    textAlign: "center",
                  }}
                >
                  {t.nom}
                </td>

                {/* CELLULES TECHNICIEN */}
                {days.map((d) => {
                  const dateStr = ymd(d);
                  const key = `${dateStr}-${t.$id}`;
                  const cell = planning[key];
                  const chantierColor = cell?.valeur
                    ? getChantierColorByName(cell.valeur)
                    : null;

                  return (
                    <td
                      key={dateStr}
                      style={{
                        padding: 0,
                        backgroundColor: chantierColor || "#d1d5db",
                        borderRadius: 8,
                        cursor: "pointer",
                        overflow: "hidden",
                        boxShadow:
                          chantierColor ? "0 0 8px rgba(0,0,0,0.15)" : "none",
                      }}
                      onContextMenu={(e) => openModal(e, dateStr, t.$id)}
                    >
                      {/* SELECT – Choix du chantier */}
                      <select
                        style={{
                          width: "100%",
                          padding: "8px 8px",
                          border: "none",
                          outline: "none",
                          backgroundColor: chantierColor || "#cbd5e1",
                          color: "black",
                          fontWeight: 700,
                          fontSize: "13px",
                          textAlign: "center",
                          appearance: "none",
                          borderRadius: "0px",
                        }}
                        value={cell?.valeur || ""}
                        onChange={(e) =>
                          savePlanningCell(dateStr, t.$id, {
                            valeur: e.target.value,
                          })
                        }
                      >
                        <option value="">—</option>
                        {chantiers.map((c) => (
                          <option key={c.$id} value={c.nom}>
                            {c.nom}
                          </option>
                        ))}
                      </select>

                      {/* Infos supplémentaires */}
                      {cell && (
                        <div
                          style={{
                            padding: "4px 4px 6px",
                            fontSize: "11px",
                            textAlign: "center",
                            color: "#111",
                          }}
                        >
                          {cell.petit && <div>🚐 Petit</div>}
                          {cell.grand && <div>🧳 Grand</div>}
                          {cell.nuit && (
                            <div>🌙 Nuit ({cell.heuresNuit}h)</div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// === RENDU PRINCIPAL ===
return (
  <div
    style={{
      minHeight: "100vh",
      width: "100%",
      backgroundImage: "url('/Fond.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      position: "relative",
      padding: "20px",
    }}
  >
    {/* Overlay sombre */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
        zIndex: 0,
      }}
    />

    {/* Card principale */}
    <div
      style={{
        position: "relative",
        zIndex: 2,
        maxWidth: "1000px",
        margin: "0 auto",
        background: "rgba(255,255,255,0.95)",
        borderRadius: "16px",
        padding: "25px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      

      {/* BARRE DES BOUTONS */}
<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  }}
>

  {/* ⬅ BOUTON RETOUR */}
  <button
    onClick={() => navigate("/dashboard")}
    style={{
      padding: "8px 14px",
      borderRadius: 8,
      background: "#374151",
      color: "white",
      fontWeight: 600,
    }}
  >
    ⬅ Retour
  </button>

  <button
    onClick={() => setViewMode("month")}
    style={{
      padding: "8px 14px",
      borderRadius: 8,
      background: viewMode === "month" ? "#2563eb" : "#e5e7eb",
      color: viewMode === "month" ? "white" : "#1f2937",
      fontWeight: 600,
    }}
  >
    Vue mensuelle
  </button>

  <button
    onClick={() => setViewMode("week")}
    style={{
      padding: "8px 14px",
      borderRadius: 8,
      background: viewMode === "week" ? "#2563eb" : "#e5e7eb",
      color: viewMode === "week" ? "white" : "#1f2937",
      fontWeight: 600,
    }}
  >
    Vue hebdomadaire
  </button>

  <button
    onClick={exportToExcel}
    style={{
      padding: "8px 14px",
      borderRadius: 8,
      background: "#059669",
      color: "white",
      fontWeight: 600,
    }}
  >
    Export Excel
  </button>

  <button
    onClick={() => setShowTechModal(true)}
    style={{
      marginLeft: "auto",
      padding: "8px 16px",
      borderRadius: 8,
      background: "#2563eb",
      color: "white",
      fontWeight: 600,
    }}
  >
    + Technicien
  </button>

  <button
    onClick={() => setShowChantierModal(true)}
    style={{
      padding: "8px 16px",
      borderRadius: 8,
      background: "#10b981",
      color: "white",
      fontWeight: 600,
    }}
  >
    + Chantier
  </button>
</div>


      {/* TITRES / GESTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
          padding: "12px 18px",
          background: "#f3f4f6",
          borderRadius: 10,
          boxShadow: "inset 0 0 5px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Techniciens</span>
          <button
            onClick={() => setShowManageTech(true)}
            style={{
              background: "#374151",
              color: "white",
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Modifier
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Chantiers</span>
          <button
            onClick={() => setShowManageChantier(true)}
            style={{
              background: "#374151",
              color: "white",
              padding: "6px 10px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Modifier
          </button>
        </div>
      </div>

      {/* PLANNING */}
      {viewMode === "month" ? renderMonth() : renderWeek()}

      {/* QUICK MENU (clic droit cellule) */}
      {quickMenu && (
        <div
          style={{
            position: "fixed",
            top: quickMenu.y,
            left: quickMenu.x,
            background: "#1f2937",
            color: "white",
            padding: "10px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 999,
            minWidth: "180px",
          }}
        >
          <div
            style={{
              padding: "6px",
              cursor: "pointer",
              borderBottom: "1px solid #4b5563",
            }}
            onClick={() => {
              savePlanningCell(quickMenu.date, quickMenu.techId, { valeur: "" });
              setQuickMenu(null);
            }}
          >
            — Aucun chantier
          </div>

          {chantiers.map((c) => (
            <div
              key={c.$id}
              style={{
                padding: "6px",
                cursor: "pointer",
                borderBottom: "1px solid #4b5563",
              }}
              onClick={() => {
                savePlanningCell(quickMenu.date, quickMenu.techId, {
                  valeur: c.nom,
                });
                setQuickMenu(null);
              }}
            >
              {c.nom}
            </div>
          ))}

          <div
            style={{ padding: 6, cursor: "pointer", textAlign: "center" }}
            onClick={() => setQuickMenu(null)}
          >
            Fermer
          </div>
        </div>
      )}

      {/* MODALE SUPPLÉMENTS */}
      {modal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 20,
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 25,
              width: "360px",
              boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 10, fontSize: 20, fontWeight: 700 }}>
              Supplément
            </h3>

            <p style={{ marginBottom: 12 }}>
              <b>{techniciens.find((t) => t.$id === modal.techId)?.nom}</b> —{" "}
              {modal.date}
            </p>

            {/* Cases à cocher */}
            <label style={{ display: "block", marginTop: 8 }}>
              <input
                type="checkbox"
                checked={modal.petit}
                onChange={(e) => setModal({ ...modal, petit: e.target.checked })}
              />{" "}
              Petit déplacement
            </label>

            <label style={{ display: "block", marginTop: 8 }}>
              <input
                type="checkbox"
                checked={modal.grand}
                onChange={(e) => setModal({ ...modal, grand: e.target.checked })}
              />{" "}
              Grand déplacement
            </label>

            <label style={{ display: "block", marginTop: 8 }}>
              <input
                type="checkbox"
                checked={modal.nuit}
                onChange={(e) => setModal({ ...modal, nuit: e.target.checked })}
              />{" "}
              Travail de nuit
            </label>

            {modal.nuit && (
              <input
                type="number"
                value={modal.heuresNuit}
                onChange={(e) =>
                  setModal({ ...modal, heuresNuit: Number(e.target.value) })
                }
                placeholder="Heures"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  marginTop: 6,
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                }}
              />
            )}

            {/* Secteur */}
            <input
              type="text"
              placeholder="Secteur / lieu"
              value={modal.secteur}
              onChange={(e) =>
                setModal({ ...modal, secteur: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                marginTop: 10,
              }}
            />

            {/* Boutons */}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                style={{
                  flex: 1,
                  background: "#10b981",
                  color: "white",
                  padding: "8px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
                onClick={() => {
                  savePlanningCell(modal.date, modal.techId, {
                    valeur: modal.chantier,
                    petit: modal.petit,
                    grand: modal.grand,
                    nuit: modal.nuit,
                    heuresNuit: modal.heuresNuit,
                    secteur: modal.secteur,
                  });
                  setModal(null);
                }}
              >
                Valider
              </button>

              <button
                style={{
                  flex: 1,
                  background: "#9ca3af",
                  color: "white",
                  padding: "8px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
                onClick={() => setModal(null)}
              >
                Annuler
              </button>

              <button
                style={{
                  flex: 1,
                  background: "#ef4444",
                  color: "white",
                  padding: "8px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
                onClick={() => {
                  deletePlanningCell(modal.date, modal.techId);
                  setModal(null);
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale gestion techniciens */}
      {showManageTech && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 20,
          }}
          onClick={() => setShowManageTech(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 20,
              width: 380,
              maxHeight: "75vh",
              overflowY: "auto",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 15, fontWeight: 700 }}>
              Gestion des techniciens
            </h3>

            {techniciens.map((t) => (
              <div
                key={t.$id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  background: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <span>{t.nom}</span>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleRenameTechnicien(t)}
                    style={{
                      background: "#2563eb",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    Renommer
                  </button>

                  <button
                    onClick={() => handleDeleteTechnicien(t.$id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button
                onClick={() => setShowManageTech(false)}
                style={{
                  padding: "8px 14px",
                  background: "#374151",
                  color: "white",
                  borderRadius: 8,
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE GESTION CHANTIERS */}
      {showManageChantier && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            padding: 20,
          }}
          onClick={() => setShowManageChantier(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 20,
              width: 380,
              maxHeight: "75vh",
              overflowY: "auto",
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 15, fontWeight: 700 }}>
              Gestion des chantiers
            </h3>

            {chantiers.map((c) => (
              <div
                key={c.$id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  background: "#f9fafb",
                  borderRadius: 8,
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      background: c.couleur || "#9ca3af",
                      border: "1px solid #6b7280",
                    }}
                  />
                  <span>{c.nom}</span>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={c.couleur || "#3b82f6"}
                    onChange={(e) => handleChangeChantierColor(c, e.target.value)}
                    style={{ width: 36, height: 26, border: "none" }}
                  />

                  <button
                    onClick={() => handleRenameChantier(c)}
                    style={{
                      background: "#2563eb",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    Renommer
                  </button>

                  <button
                    onClick={() => handleDeleteChantier(c.$id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}

            <div style={{ textAlign: "right", marginTop: 10 }}>
              <button
                onClick={() => setShowManageChantier(false)}
                style={{
                  padding: "8px 14px",
                  background: "#374151",
                  color: "white",
                  borderRadius: 8,
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES AJOUT */}
      {showTechModal && (
        <AddTechnicienModal
          onClose={() => setShowTechModal(false)}
          onAdded={loadTechniciens}
        />
      )}

      {showChantierModal && (
        <AddChantierModal
          onClose={() => setShowChantierModal(false)}
          onAdded={loadChantiers}
        />
      )}
    </div>
  </div>
);
}
