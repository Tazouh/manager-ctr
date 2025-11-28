import { useState } from "react";
import { account } from "../appwrite";

// 🔹 Mapping erreur Appwrite → message lisible
const getLoginErrorMessage = (err) => {
  if (!err) return "Une erreur inconnue est survenue.";

  const msg = err.message || "";
  const code = err.code;

  if (msg.includes("session is active")) {
    return "Vous êtes déjà connecté.";
  }

  if (msg.includes("Rate limit")) {
    return "Trop de tentatives de connexion. Veuillez patienter quelques minutes avant de réessayer.";
  }

  if (code === 401) {
    return "Email ou mot de passe incorrect.";
  }

  if (code === 403) {
    return "Accès refusé. Vérifiez vos droits ou contactez l'administrateur.";
  }

  return "Une erreur technique est survenue. Réessayez plus tard.";
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginUser = async () => {
    try {
      await account.createEmailPasswordSession(email, password);

      // ✅ On prévient App.jsx que le login est ok
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      console.error("Erreur login Appwrite :", err);

      // Si une session existe déjà, on considère l'utilisateur comme connecté
      if (
        err?.message?.includes("session is active") ||
        err?.type === "user_session_already_exists"
      ) {
        if (onLoginSuccess) onLoginSuccess();
        return;
      }

      // 🔹 Message adapté au type d’erreur
      setError(getLoginErrorMessage(err));
    }
  };

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
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          padding: "2rem",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          width: "320px",
        }}
      >
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "1.5rem",
          }}
        >
          Connexion CTR
        </h1>

        <input
          type="email"
          placeholder="Email"
          style={{
            width: "100%",
            marginBottom: "0.75rem",
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
          }}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          style={{
            width: "100%",
            marginBottom: "0.75rem",
            padding: "0.5rem",
            borderRadius: "0.375rem",
            border: "1px solid #ccc",
          }}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
        />

        {error && (
          <p
            style={{
              color: "#dc2626",
              fontSize: "0.875rem",
              textAlign: "center",
              marginBottom: "0.5rem",
            }}
          >
            {error}
          </p>
        )}
        

        <button
          onClick={loginUser}
          style={{
            width: "100%",
            backgroundColor: "#2563eb",
            color: "#fff",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Se connecter
        </button>
      </div>
    </div>
  );
}
