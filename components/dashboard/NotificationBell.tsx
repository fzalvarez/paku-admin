"use client";

// Campana de avisos (spec: specs/features/0004-campana-avisos).
// Solo el contador se consulta periódicamente, cada 2 min y únicamente con la pestaña visible;
// la lista se pide al abrir la campana.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  noticeTarget,
  type AdminNotification,
} from "@/lib/services/notifications";

const POLL_MS = 2 * 60 * 1000;

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

// "hace 5 minutos", "ayer"…
function timeAgo(iso: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relative.format(seconds, "second");
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86400), "day");
}

export function NotificationBell() {
  const router = useRouter();
  // null = desconocido (aún no cargó o falló): no se muestra número.
  const [unread, setUnread] = useState<number | null>(null);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [listState, setListState] = useState<"idle" | "loading" | "error">("idle");

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await getUnreadCount());
    } catch {
      setUnread(null); // silencioso: se reintenta en la siguiente vuelta
    }
  }, []);

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    if (visible()) refreshCount();
    const timer = setInterval(() => {
      if (visible()) refreshCount();
    }, POLL_MS);
    const onVisibility = () => {
      if (visible()) refreshCount();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshCount]);

  const loadList = async () => {
    setListState("loading");
    try {
      setItems(await listNotifications(20));
      setListState("idle");
    } catch {
      setListState("error");
    }
  };

  const open = async (n: AdminNotification) => {
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => (c ? c - 1 : c));
      markRead(n.id).catch(() => refreshCount());
    }
    const target = noticeTarget(n);
    if (target) router.push(target);
  };

  const readAll = async () => {
    const pending = items.filter((n) => !n.is_read);
    if (pending.length === 0) return;
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    try {
      await markAllRead(pending);
    } finally {
      refreshCount();
    }
  };

  const badge = unread && unread > 0 ? (unread > 9 ? "9+" : String(unread)) : null;

  return (
    <DropdownMenu onOpenChange={(isOpen) => isOpen && loadList()}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={badge ? `Avisos: ${unread} sin leer` : "Avisos"}
          title="Avisos"
        >
          <Bell className="size-5" />
          {badge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0">Avisos</DropdownMenuLabel>
          {items.some((n) => !n.is_read) && (
            <button
              type="button"
              className="text-xs text-primary underline-offset-4 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                readAll();
              }}
            >
              Marcar todo como leído
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-96 overflow-y-auto py-1">
          {listState === "loading" && items.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">Cargando…</p>
          )}
          {listState === "error" && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No se pudieron cargar los avisos.</p>
          )}
          {listState !== "loading" && listState !== "error" && items.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No tienes avisos.</p>
          )}
          {items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={() => open(n)}
              className={`mx-1 flex items-start gap-2 px-2 py-2 ${n.is_read ? "" : "bg-primary/5"}`}
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-primary"}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.is_read ? "" : "font-semibold"}`}>{n.title}</span>
                <span className="block text-xs text-muted-foreground whitespace-normal">{n.body}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
