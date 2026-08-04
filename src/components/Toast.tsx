"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  text: string;
}

let toastListener: ((toast: ToastMessage) => void) | null = null;

export const showToast = {
  success: (text: string) => {
    if (toastListener) {
      toastListener({ id: Math.random().toString(), type: "success", text });
    }
  },
  error: (text: string) => {
    if (toastListener) {
      toastListener({ id: Math.random().toString(), type: "error", text });
    }
  },
  info: (text: string) => {
    if (toastListener) {
      toastListener({ id: Math.random().toString(), type: "info", text });
    }
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toastListener = (newToast: ToastMessage) => {
      setToasts((prev) => [...prev, newToast]);

      // Tự động xóa sau 3.5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    return () => {
      toastListener = null;
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "360px",
        width: "calc(100vw - 40px)",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: "auto",
              padding: "12px 16px",
              borderRadius: "12px",
              background: isSuccess
                ? "rgba(17, 24, 39, 0.95)"
                : isError
                ? "rgba(239, 68, 68, 0.95)"
                : "rgba(30, 41, 59, 0.95)",
              border: isSuccess
                ? "1px solid rgba(34, 197, 94, 0.4)"
                : isError
                ? "1px solid rgba(248, 113, 113, 0.4)"
                : "1px solid var(--border)",
              boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.85rem",
              fontWeight: 600,
              animation: "slideInRight 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {isSuccess && <CheckCircle2 size={18} color="#22c55e" style={{ flexShrink: 0 }} />}
            {isError && <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0 }} />}
            <span style={{ flex: 1, minWidth: 0 }}>{toast.text}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted-foreground)",
                cursor: "pointer",
                padding: "2px",
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
