"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      setHasSession(Boolean(token));
    }
  }, []);

  const handleIngresar = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("token_type", data.token_type);
      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Error de conexión");
      setLoading(false);
    }
  };

  const handleGotoDashboard = () => {
    router.push("/dashboard");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_type");
    }
    setHasSession(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-900">Login Admin Paku</h1>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tu@email.com"
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
          />
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleIngresar}
            disabled={loading}
            className={`w-full px-4 py-2 rounded font-medium ${
              loading
                ? "bg-gray-400 cursor-not-allowed text-gray-700"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {hasSession && (
            <div className="flex gap-2">
              <button
                onClick={handleGotoDashboard}
                className="flex-1 px-4 py-2 rounded border border-gray-300 bg-white text-gray-900"
              >
                Ir al dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded bg-red-600 text-white"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
