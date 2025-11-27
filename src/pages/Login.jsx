import { useState } from "react";
import { account } from "../appwrite";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginUser = async () => {
    try {
      await account.createEmailSession(email, password);
      window.location.href = "/"; // redirection après login
    } catch (err) {
      setError("Identifiants incorrects");
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-black relative">

      {/* Image de fond depuis /public */}
      <div className="absolute inset-0">
  {/* Image de fond */}
  <div
    className="absolute inset-0 bg-cover bg-center"
    style={{ backgroundImage: "url('/Fond.png')" }}
  ></div>

  {/* Overlay assombrissant */}
  <div className="absolute inset-0 bg-black/40"></div>
</div>


      {/* Zone de connexion */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md p-8 rounded-xl shadow-xl w-80">
        <h1 className="text-2xl font-bold text-center mb-6">
          Connexion CTR
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 rounded border"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full mb-3 p-2 rounded border"
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="text-red-600 text-sm text-center mb-2">{error}</p>
        )}

        <button
          onClick={loginUser}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg"
        >
          Se connecter
        </button>
      </div>
    </div>
  );
}
