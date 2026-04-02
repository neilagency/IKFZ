"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
  };

  const colors = {
    success: "border-green-600 bg-green-50",
    error: "border-red-600 bg-red-50",
    info: "border-blue-600 bg-blue-50",
  };

  const textColors = {
    success: "text-green-900",
    error: "text-red-900",
    info: "text-blue-900",
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[t.type]} backdrop-blur-sm animate-slide-in max-w-sm`}
          >
            {icons[t.type]}
            <span className={`${textColors[t.type]} text-sm flex-1`}>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
