import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { databases, ID, Query, account, storage } from "../appwrite";
import JSZip from "jszip";

// === Appwrite IDs ===
const DB_ID = "692950f300288c67303a";
const TECH_COL = "techniciens";
const CHAT_COL = "conversationkey";
const BUCKET_ID = "chatFiles"; // ton bucket Storage

// Construit une clé de conversation unique pour une combinaison de techniciens
function buildConversationKey(ids) {
  return ids.slice().sort().join("_");
}

// Format durée vocale (en secondes -> mm:ss)
function formatDuration(sec) {
  if (!sec && sec !== 0) return "";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export default function Chat() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null); // compte Appwrite
  const [currentTech, setCurrentTech] = useState(null); // doc dans "techniciens"
  const [techniciens, setTechniciens] = useState([]);
  const [selectedTechIds, setSelectedTechIds] = useState([]); // destinataires
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  // Fichier attaché (photo / vidéo / audio / autre)
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedFileType, setAttachedFileType] = useState(null); // "image" | "video" | "audio" | "file"
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  // Vocaux
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Emojis
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const EMOJIS = ["😀", "😂", "😅", "😍", "😎", "👍", "🙏", "🚀", "💬", "❤️"];

  const messagesEndRef = useRef(null);

  // Sélection multiple de médias (images + vidéos + vocaux)
  const [selectedImages, setSelectedImages] = useState([]);

  function handleImageSelect(e, msg) {
    // Ctrl ou Cmd pour sélectionner / désélectionner
    if (e.ctrlKey || e.metaKey) {
      setSelectedImages((prev) => {
        if (prev.includes(msg)) {
          return prev.filter((m) => m !== msg);
        } else {
          return [...prev, msg];
        }
      });
    }
  }

  // === 1) Récupérer l'utilisateur connecté + technicien associé ===
  useEffect(() => {
    async function init() {
      try {
        const user = await account.get();
        setCurrentUser(user);

        // Tous les techniciens
        const resTech = await databases.listDocuments(DB_ID, TECH_COL);
        setTechniciens(resTech.documents);

        // On trouve le technicien lié à l'email du compte Appwrite
        const me = resTech.documents.find((t) => t.email === user.email);
        setCurrentTech(me || null);
      } catch (err) {
        console.error("Erreur init Chat:", err);
        setError("Impossible de charger les données du chat.");
      }
    }

    init();
  }, []);

  // === 2) Clé de conversation en fonction des techniciens sélectionnés ===
  const conversationKey = useMemo(() => {
    if (!currentTech) return null;
    const all = [currentTech.$id, ...selectedTechIds];
    if (all.length < 2) return null; // il faut au moins toi + 1 autre
    return buildConversationKey(all);
  }, [currentTech, selectedTechIds]);

  // === 3) Charger les messages quand la conversation change ===
  useEffect(() => {
    if (!conversationKey) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      setError(null);
      try {
        const res = await databases.listDocuments(DB_ID, CHAT_COL, [
          Query.equal("conversationKey", conversationKey),
          Query.orderAsc("$createdAt"),
        ]);

        if (!cancelled) {
          setMessages(res.documents);
        }
      } catch (err) {
        console.error("Erreur loadMessages :", err);
        if (!cancelled) {
          setError("Erreur lors du chargement des messages.");
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationKey]);

  // === 4) Scroll automatique en bas quand les messages changent ===
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // === 5) Sélection / désélection des techniciens destinataires ===
  function toggleTechSelection(id) {
    setSelectedTechIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // === 6) Gestion fichier (photo / vidéo / autre) ===
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";

    setAttachedFile(file);
    setAttachedFileType(type);

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(URL.createObjectURL(file));
  }

  function clearAttachment() {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setAttachedFile(null);
    setAttachedFileType(null);
    setFilePreviewUrl(null);
    setRecordingDuration(0);
  }

  // === 7) Vocaux : start / stop recording ===
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "voice-message.webm", {
          type: "audio/webm",
        });

        setAttachedFile(file);
        setAttachedFileType("audio");

        if (filePreviewUrl) {
          URL.revokeObjectURL(filePreviewUrl);
        }
        setFilePreviewUrl(URL.createObjectURL(file));

        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      };

      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      const start = Date.now();
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        const diffSec = (Date.now() - start) / 1000;
        setRecordingDuration(diffSec);
      }, 300);
    } catch (err) {
      console.error("Erreur accès micro :", err);
      setError("Impossible d'accéder au micro (autorisations ?).");
    }
  }

  function stopRecording() {
    if (!recorderRef.current) return;
    recorderRef.current.stop();
    recorderRef.current.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setIsRecording(false);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }

  // === 8) Envoi d'un message (texte + éventuel fichier) ===
  async function handleSendMessage(e) {
    e.preventDefault();

    if (!newMessage.trim() && !attachedFile) return;
    if (!currentTech || !conversationKey) return;

    try {
      setError(null);

      let fileId = null;
      let fileType = attachedFileType;
      let duration = null;

      // Upload fichier si présent
      if (attachedFile) {
        const uploaded = await storage.createFile(
          BUCKET_ID,
          ID.unique(),
          attachedFile
        );
        fileId = uploaded.$id;

        if (fileType === "audio" && recordingDuration) {
          duration = Math.round(recordingDuration);
        }
      }

      const allParticipants = [currentTech.$id, ...selectedTechIds];

      await databases.createDocument(DB_ID, CHAT_COL, ID.unique(), {
        conversationKey,
        senderId: currentTech.$id,
        senderName: `${currentTech.prenom || ""} ${
          currentTech.nom || ""
        }`.trim(),
        text: newMessage.trim(),
        participants: allParticipants,
        fileId,
        fileType,
        duration,
      });

      setNewMessage("");
      clearAttachment();

      // On recharge les messages
      const res = await databases.listDocuments(DB_ID, CHAT_COL, [
        Query.equal("conversationKey", conversationKey),
        Query.orderAsc("$createdAt"),
      ]);
      setMessages(res.documents);
    } catch (err) {
      console.error("Erreur handleSendMessage :", err);
      setError("Impossible d'envoyer le message.");
    }
  }

  // === 9) Export sélection (images + vidéos + vocaux) ===
  async function handleExportSelected() {
    if (selectedImages.length === 0) return;

    try {
      const zip = new JSZip();

      for (const msg of selectedImages) {
        if (!msg.fileId) continue;
        if (!["image", "video", "audio"].includes(msg.fileType)) continue;

        const downloadUrl = storage.getFileDownload(BUCKET_ID, msg.fileId);
        const response = await fetch(downloadUrl);
        const blob = await response.blob();

        let ext = "bin";
        if (msg.fileType === "image") ext = "jpg";
        if (msg.fileType === "video") ext = "mp4";
        if (msg.fileType === "audio") ext = "webm";

        const filename = `${msg.$id}_${msg.fileType}.${ext}`;
        zip.file(filename, blob);
      }

      const zipContent = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(zipContent);
      link.download = "export_chat_medias.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Erreur export ZIP :", err);
      setError("Erreur lors de l'export des médias.");
    }
  }

  // === 10) Affichage du titre de la conversation ===
  const conversationTitle = useMemo(() => {
    if (!currentTech) return "";
    const others = techniciens.filter((t) => selectedTechIds.includes(t.$id));
    if (others.length === 0) return "Sélectionne 1 ou plusieurs techniciens";

    const names = others.map((t) => t.nom || t.email || t.$id);
    return `Discussion avec : ${names.join(", ")}`;
  }, [currentTech, techniciens, selectedTechIds]);

  // === RENDU ===
  if (!currentUser || !currentTech) {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: "url('/Fond.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.9)",
            padding: "20px 30px",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          }}
        >
          Chargement du chat...
        </div>
      </div>
    );
  }

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

      {/* Contenu principal */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "95%",
          margin: "0 auto",
          background: "rgba(242,242,247,0.98)", // fond iOS gris clair
          borderRadius: "28px",
          padding: "20px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          height: "85vh",
        }}
      >
        {/* Bouton Retour */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            position: "absolute",
            top: 16,
            right: 20,
            padding: "6px 12px",
            background: "rgba(255,255,255,0.9)",
            borderRadius: "999px",
            boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
            border: "1px solid e5e7eb",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Retour
        </button>

        {/* Header */}
        <div style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Chat entre techniciens</h2>
          <div style={{ fontSize: 13, color: "#4b5563" }}>
            Connecté en tant que{" "}
            <b>
              {currentTech.prenom} {currentTech.nom}
            </b>{" "}
            ({currentUser.email})
          </div>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 10,
              padding: "6px 10px",
              background: "#fee2e2",
              color: "#b91c1c",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {/* Layout : colonne gauche = liste des techniciens, droite = chat */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Liste des techniciens */}
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              Techniciens
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 8,
              }}
            >
              Coche 1 ou plusieurs techniciens avec qui discuter.
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 6,
                background: "#f9fafb",
              }}
            >
              {techniciens
                .filter((t) => t.$id !== currentTech.$id)
                .map((t) => {
                  const checked = selectedTechIds.includes(t.$id);
                  return (
                    <div
                      key={t.$id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        marginBottom: 4,
                        borderRadius: 10,
                        background: checked ? "#dbeafe" : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleTechSelection(t.$id)}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {t.prenom} {t.nom}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          {t.email}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        style={{ pointerEvents: "none" }}
                      />
                    </div>
                  );
                })}

              {techniciens.filter((t) => t.$id !== currentTech.$id).length ===
                0 && <div>Aucun autre technicien.</div>}
            </div>
          </div>

          {/* Zone de chat style iMessage */}
          <div
            style={{
              background: "white",
              borderRadius: 28,
              padding: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {/* Titre conversation */}
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 16,
                background: "#eff6ff",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              {conversationTitle}
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                borderRadius: 24,
                padding: "10px 8px",
                overflowY: "auto",
                background: "#f2f2f7", // fond iOS
                fontSize: 14,
                border: "1px solid #e5e7eb",
              }}
            >
              {!conversationKey && (
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  Sélectionne au moins un technicien à gauche pour commencer une
                  discussion.
                </div>
              )}

              {conversationKey && loadingMessages && messages.length === 0 && (
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  Chargement des messages...
                </div>
              )}

              {conversationKey && !loadingMessages && messages.length === 0 && (
                <div style={{ color: "#6b7280", fontSize: 13 }}>
                  Aucun message pour cette conversation. Écris le premier !
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.senderId === currentTech.$id;

                // URL pour les fichiers
                let fileViewUrl = null;
                if (msg.fileId) {
                  try {
                    fileViewUrl = storage.getFileView(
                      BUCKET_ID,
                      msg.fileId
                    );
                  } catch (e) {
                    console.error("Erreur génération URL fichier :", e);
                  }
                }

                const selected = selectedImages.includes(msg);

                return (
                  <div
                    key={msg.$id}
                    style={{
                      display: "flex",
                      justifyContent: isMe ? "flex-end" : "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "6px 10px",
                        borderRadius: 18,
                        borderBottomRightRadius: isMe ? 4 : 18,
                        borderBottomLeftRadius: isMe ? 18 : 4,
                        backgroundColor: isMe ? "#0a84ff" : "#e5e5ea",
                        color: isMe ? "white" : "black",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        wordBreak: "break-word",
                      }}
                    >
                      {!isMe && (
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.7,
                            marginBottom: 2,
                          }}
                        >
                          {msg.senderName || "?"}
                        </div>
                      )}

                      {msg.text && (
                        <div style={{ whiteSpace: "pre-wrap" }}>
                          {msg.text}
                        </div>
                      )}

                      {/* Image */}
                      {msg.fileId &&
                        msg.fileType === "image" &&
                        fileViewUrl && (
                          <div
                            style={{
                              marginTop: msg.text ? 6 : 0,
                              cursor: "pointer",
                              display: "inline-block",
                              border: selected
                                ? "3px solid #0a84ff"
                                : "none",
                              borderRadius: 12,
                              padding: selected ? 2 : 0,
                            }}
                            onClick={(e) => handleImageSelect(e, msg)}
                            onDoubleClick={() =>
                              window.open(fileViewUrl, "_blank")
                            }
                          >
                            <img
                              src={fileViewUrl}
                              alt="image"
                              style={{
                                maxWidth: "220px",
                                borderRadius: 10,
                                display: "block",
                              }}
                            />
                          </div>
                        )}

                      {/* Vidéo */}
                      {msg.fileId &&
                        msg.fileType === "video" &&
                        fileViewUrl && (
                          <div
                            style={{
                              marginTop: msg.text ? 6 : 0,
                              cursor: "pointer",
                              display: "inline-block",
                              border: selected
                                ? "3px solid #0a84ff"
                                : "none",
                              borderRadius: 12,
                              padding: selected ? 2 : 0,
                            }}
                            onClick={(e) => handleImageSelect(e, msg)}
                            onDoubleClick={() =>
                              window.open(fileViewUrl, "_blank")
                            }
                          >
                            <video
                              src={fileViewUrl}
                              controls
                              style={{
                                maxWidth: "220px",
                                borderRadius: 10,
                                display: "block",
                              }}
                            />
                          </div>
                        )}

                      {/* Audio / vocal */}
                      {msg.fileId &&
                        msg.fileType === "audio" &&
                        fileViewUrl && (
                          <div
                            style={{
                              marginTop: msg.text ? 6 : 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              border: selected
                                ? "3px solid #0a84ff"
                                : "none",
                              borderRadius: 12,
                              padding: selected ? 4 : 0,
                            }}
                            onClick={(e) => handleImageSelect(e, msg)}
                          >
                            <audio
                              src={fileViewUrl}
                              controls
                              style={{ width: "180px" }}
                            />
                            {msg.duration != null && (
                              <span
                                style={{
                                  fontSize: 12,
                                  opacity: 0.8,
                                }}
                              >
                                {formatDuration(msg.duration)}
                              </span>
                            )}
                          </div>
                        )}

                      {/* Autres fichiers */}
                      {msg.fileId &&
                        !["image", "video", "audio"].includes(
                          msg.fileType
                        ) &&
                        fileViewUrl && (
                          <div style={{ marginTop: msg.text ? 6 : 0 }}>
                            <a
                              href={fileViewUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 12,
                                textDecoration: "underline",
                                color: isMe ? "white" : "#2563eb",
                              }}
                            >
                              Télécharger le fichier
                            </a>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Preview pièce jointe (avant envoi) */}
            {attachedFile && (
              <div
                style={{
                  marginTop: 6,
                  marginBottom: 4,
                  padding: "4px 8px",
                  borderRadius: 12,
                  background: "#e5e7eb",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>
                  Pièce jointe :{" "}
                  <b>
                    {attachedFile.name ||
                      (attachedFileType === "audio"
                        ? "Message vocal"
                        : "Fichier")}
                  </b>{" "}
                  {attachedFileType === "audio" &&
                    `(${formatDuration(recordingDuration)})`}
                </span>
                {filePreviewUrl && attachedFileType === "image" && (
                  <img
                    src={filePreviewUrl}
                    alt="preview"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      objectFit: "cover",
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={clearAttachment}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ❌
                </button>
              </div>
            )}

            {/* Emojis picker simple */}
            {showEmojiPicker && (
              <div
                style={{
                  marginBottom: 4,
                  padding: 6,
                  background: "white",
                  borderRadius: 16,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  maxWidth: 260,
                }}
              >
                {EMOJIS.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() =>
                      setNewMessage((prev) => prev + emo)
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: 20,
                      cursor: "pointer",
                    }}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            )}

            {/* Bouton Exporter si des médias sont sélectionnés */}
            {selectedImages.length > 0 && (
              <button
                onClick={handleExportSelected}
                style={{
                  marginTop: 8,
                  marginBottom: 4,
                  background: "#0a84ff",
                  color: "white",
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  alignSelf: "flex-start",
                  fontSize: 13,
                }}
              >
                Exporter {selectedImages.length} média(s)
              </button>
            )}

            {/* Formulaire d'envoi style iMessage */}
            <form
              onSubmit={handleSendMessage}
              style={{
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {/* Bouton emoji */}
              <button
                type="button"
                onClick={() =>
                  setShowEmojiPicker((prev) => !prev)
                }
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                😀
              </button>

              {/* Bouton pièce jointe (photo / vidéo / fichier / audio) */}
              <label
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                }}
              >
                📎
                <input
                  type="file"
                  accept="image/*,video/*,audio/*"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </label>

              {/* Bouton micro (vocaux) */}
              <button
                type="button"
                onClick={() =>
                  isRecording ? stopRecording() : startRecording()
                }
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 22,
                  cursor: "pointer",
                  color: isRecording ? "#dc2626" : "inherit",
                }}
              >
                {isRecording ? "⏹️" : "🎤"}
              </button>

              <input
                type="text"
                placeholder={
                  conversationKey
                    ? "iMessage…"
                    : "Sélectionne des techniciens pour écrire…"
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={!conversationKey && !attachedFile}
                style={{
                  flex: 1,
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 15,
                  background: "#e5e5ea",
                  outline: "none",
                }}
              />

              <button
                type="submit"
                disabled={
                  (!conversationKey && !attachedFile) ||
                  (!newMessage.trim() && !attachedFile)
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "none",
                  cursor:
                    (!conversationKey && !attachedFile) ||
                    (!newMessage.trim() && !attachedFile)
                      ? "not-allowed"
                      : "pointer",
                  background:
                    (!conversationKey && !attachedFile) ||
                    (!newMessage.trim() && !attachedFile)
                      ? "#9ca3af"
                      : "#0a84ff",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
