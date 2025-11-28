import React, { useEffect, useState } from "react";
import { databases, ID } from "../appwrite";
import { useNavigate } from "react-router-dom";
import AddTechnicienModal from "../components/AddTechnicienModal";
import AddChantierModal from "../components/AddChantierModal";

// === Appwrite ===
const DB_ID = "692950f300288c67303a";
const TECH_COL = "techniciens";
const CHANTIER_COL = "chantiers";
const PLAN_COL = "planning";

// === Période autorisée ===
const MIN_DATE = new Date(2025, 11, 1); // 1 déc 2025
const MAX_DATE = new Date(2050, 0, 31); // 31 jan 2050

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

  const [techniciens, setTechniciens] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [planning, setPlanning] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");

  const [showTechModal, setShowTechModal] = useState(false);
  const [showChantierModal, setShowChantierModal] = useState(false);

  const [quickMenu, setQuickMenu] = useState(null);
  const [modal, setModal] = useState(null);

  // === CHARGEMENT DES DONNÉES ===
  useEffect(() => {
    loadTechniciens();
    loadChantiers();
    loadPlanning();
  }, []);

  async function loadTechniciens() {
    const res = await databases.listDocuments(DB_ID, TECH_COL);
    setTechniciens(res.documents);
  }

  async function loadChantiers() {
    const res = await databases.listDocuments(DB_ID, CHANTIER_COL);
    setChantiers(res.documents);
  }

  async function loadPlanning() {
    const res = await databases.listDocuments(DB_ID, PLAN_COL);
    const obj = {};
    res.documents.forEach((doc) => {
      obj[`${doc.date}-${doc.technicienId}`] = doc;
    });
    setPlanning(obj);
  }

  // === SAUVEGARDE ===
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

  // === SUPPRESSION ===
  async function deletePlanningCell(date, techId) {
    const key = `${date}-${techId}`;
    const prev = planning[key];
    if (!prev) return;

    await databases.deleteDocument(DB_ID, PLAN_COL, prev.$id);
    loadPlanning();
  }
  // === NAVIGATION MOIS ===
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

  // === NAVIGATION SEMAINE ===
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

  // === JOURS DU MOIS ===
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

  // === JOURS DE LA SEMAINE ===
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

  // === CONTENU CELLULE ===
  function renderCellContent(cell) {
    if (!cell) return "—";

    return (
      <div style={{ fontSize: "12px" }}>
        <div style={{ fontWeight: "bold" }}>{cell.valeur || "—"}</div>

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

  // === MENU RAPIDE (clic gauche) ===
  function openQuickMenu(e, date, techId) {
    e.preventDefault();
    setQuickMenu({
      x: e.clientX,
      y: e.clientY,
      date,
      techId,
    });
  }

  // === MODALE SUPPLÉMENT (clic droit) ===
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

  // === RENDU VUE MENSUELLE ===
  function renderMonth() {
    const days = getMonthDays(currentDate);

    return (
      <div style={{ padding: 20 }}>
        {/* NAVIGATION */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevMonth}>◀</button>
          <h2>{currentDate.toLocaleString("fr-FR", { month: "long", year: "numeric" }).toUpperCase()}</h2>
          <button onClick={nextMonth}>▶</button>
        </div>

        {/* TABLEAU */}
        <table
          style={{
            width: "100%",
            marginTop: 20,
            borderCollapse: "separate",
            borderSpacing: "0 4px",
          }}
        >
          <thead>
            <tr>
              <th>Date</th>
              {techniciens.map((t) => (
                <th key={t.$id}>{t.nom}</th>
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
                    <td
                      style={{
                        padding: 8,
                        borderRight: "1px solid #ccc",
                        background: "rgba(255,255,255,0.8)",
                        backdropFilter: "blur(2px)",
                        borderRadius: "6px",
                      }}
                    >
                      <div>S{week}</div>
                      <div>{d.toLocaleDateString("fr-FR", { weekday: "short" })}</div>
                      <div>{pad(d.getDate())}/{pad(d.getMonth() + 1)}</div>
                    </td>

                    {/* COLONNES TECH → LIGNE */}
                    {techniciens.map((t) => {
                      const key = `${dateStr}-${t.$id}`;
                      const cell = planning[key];

                      return (
                        <td
                          key={t.$id}
                          style={{
                            padding: 6,
                            minWidth: "120px",
                            background: cell?.valeur
                              ? "rgba(240,240,240,0.8)"
                              : "rgba(255,255,255,0.7)",
                            borderRadius: "6px",
                            backdropFilter: "blur(2px)",
                            cursor: "pointer",
                          }}
                          onClick={(e) => openQuickMenu(e, dateStr, t.$id)}
                          onContextMenu={(e) => openModal(e, dateStr, t.$id)}
                        >
                          {renderCellContent(cell)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Ligne noire entre semaines */}
                  {(i === 0 || getISOWeek(d) !== getISOWeek(days[i - 1])) && (
                    <tr>
                      <td colSpan={1 + techniciens.length}>
                        <div
                          style={{
                            height: "3px",
                            background: "black",
                            opacity: 0.7,
                            margin: "6px 0",
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
    );
  }
  // === RENDU VUE HEBDOMADAIRE ===
  function renderWeek() {
    const days = getWeekDays(currentDate);

    return (
      <div style={{ padding: 20 }}>
        {/* NAVIGATION SEMAINE */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={prevWeek}>◀</button>
          <h2>
            Semaine {getISOWeek(currentDate)} —{" "}
            {days[0].toLocaleDateString("fr-FR")} au {days[4].toLocaleDateString("fr-FR")}
          </h2>
          <button onClick={nextWeek}>▶</button>
        </div>

        {/* TABLEAU */}
        <table
          style={{
            width: "100%",
            marginTop: 20,
            borderCollapse: "separate",
            borderSpacing: "0 4px",
          }}
        >
          <thead>
            <tr>
              <th>Technicien</th>
              {days.map((d) => (
                <th key={d}>
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
                <td
                  style={{
                    fontWeight: "bold",
                    background: "rgba(255,255,255,0.8)",
                    borderRadius: "6px",
                    padding: "6px",
                  }}
                >
                  {t.nom}
                </td>

                {days.map((d) => {
                  const dateStr = ymd(d);
                  const key = `${dateStr}-${t.$id}`;
                  const cell = planning[key];

                  return (
                    <td
                      key={dateStr}
                      style={{
                        padding: 6,
                        background: cell?.valeur
                          ? "rgba(240,240,240,0.8)"
                          : "rgba(255,255,255,0.7)",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                      onClick={(e) => openQuickMenu(e, dateStr, t.$id)}
                      onContextMenu={(e) => openModal(e, dateStr, t.$id)}
                    >
                      <select
                        style={{
                          width: "100%",
                          padding: "4px",
                          borderRadius: "4px",
                          marginBottom: "4px",
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

                      {renderCellContent(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // === RENDU COMPLET ===
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        backgroundImage: "url('/Fond.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        padding: "30px",
      }}
    >
      {/* Overlay sombre */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
          zIndex: 0,
        }}
      />

      {/* Contenu */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "95%",
          margin: "0 auto",
          background: "rgba(255,255,255,0.90)",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        }}
      >
        {/* Bouton retour Dashboard */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "8px 14px",
            background: "rgba(255,255,255,0.85)",
            borderRadius: "6px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          }}
        >
          Retour
        </button>

        {/* Boutons vue */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setViewMode("month")}>Vue mensuelle</button>
          <button onClick={() => setViewMode("week")}>Vue hebdomadaire</button>

          {/* Ajout technicien */}
          <button
            onClick={() => setShowTechModal(true)}
            style={{ marginLeft: "auto", background: "#2563eb", color: "white" }}
          >
            + Technicien
          </button>

          {/* Ajout chantier */}
          <button
            onClick={() => setShowChantierModal(true)}
            style={{ background: "#16a34a", color: "white" }}
          >
            + Chantier
          </button>
        </div>

        {/* Rendu vue */}
        {viewMode === "month" ? renderMonth() : renderWeek()}

        {/* QUICK MENU */}
        {quickMenu && (
          <div
            style={{
              position: "fixed",
              top: quickMenu.y,
              left: quickMenu.x,
              background: "rgba(30,30,30,0.95)",
              color: "white",
              padding: "10px",
              borderRadius: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              zIndex: 999,
            }}
          >
            <div
              style={{ padding: 4, cursor: "pointer" }}
              onClick={() => {
                savePlanningCell(quickMenu.date, quickMenu.techId, { valeur: "" });
                setQuickMenu(null);
              }}
            >
              —
            </div>

            {chantiers.map((c) => (
              <div
                key={c.$id}
                style={{ padding: 4, cursor: "pointer" }}
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
              style={{ padding: 4, cursor: "pointer", color: "#ccc" }}
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
              backdropFilter: "blur(3px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999,
            }}
            onClick={() => setModal(null)}
          >
            <div
              style={{
                background: "white",
                borderRadius: "10px",
                padding: "20px",
                width: "350px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: 10 }}>Supplément</h3>

              <p>
                <b>{techniciens.find((t) => t.$id === modal.techId)?.nom}</b> — {modal.date}
              </p>

              <label>
                <input
                  type="checkbox"
                  checked={modal.petit}
                  onChange={(e) => setModal({ ...modal, petit: e.target.checked })}
                />{" "}
                Petit déplacement
              </label>
              <br />

              <label>
                <input
                  type="checkbox"
                  checked={modal.grand}
                  onChange={(e) => setModal({ ...modal, grand: e.target.checked })}
                />{" "}
                Grand déplacement
              </label>
              <br />

              <label>
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
                  style={{ width: "100%", marginTop: 5 }}
                />
              )}

              <input
                type="text"
                placeholder="Secteur / lieu"
                value={modal.secteur}
                onChange={(e) => setModal({ ...modal, secteur: e.target.value })}
                style={{ width: "100%", marginTop: 10 }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button
                  style={{ flex: 1, background: "green", color: "white" }}
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

                <button style={{ flex: 1 }} onClick={() => setModal(null)}>
                  Annuler
                </button>

                <button
                  style={{ flex: 1, background: "red", color: "white" }}
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

