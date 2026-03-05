"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMe, AdminProfile } from "@/lib/me";
import { logout } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.role !== "admin") {
          handleLogout();
        } else {
          setUser(u);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          handleLogout();
        }
        // otros errores: dejar que el middleware proteja
      })
      .finally(() => setLoading(false));
  }, [handleLogout]);

  return { user, loading, logout: handleLogout };
}
