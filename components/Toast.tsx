'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Toast = { id: number; mesaj: string; tip: 'basari' | 'hata' | 'bilgi' };
type ToastCtx = { goster: (mesaj: string, tip?: Toast['tip']) => void };

const Ctx = createContext<ToastCtx>({ goster: () => {} });
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toastlar, setToastlar] = useState<Toast[]>([]);

  const goster = useCallback((mesaj: string, tip: Toast['tip'] = 'bilgi') => {
    const id = Date.now() + Math.random();
    setToastlar((t) => [...t, { id, mesaj, tip }]);
    setTimeout(() => setToastlar((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={{ goster }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toastlar.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg border shadow-2xl text-sm backdrop-blur-sm ${
              t.tip === 'basari'
                ? 'bg-green-950/90 border-green-700 text-green-100'
                : t.tip === 'hata'
                ? 'bg-red-950/90 border-red-700 text-red-100'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-100'
            }`}
          >
            <span className="mr-1">
              {t.tip === 'basari' ? '✓' : t.tip === 'hata' ? '✕' : 'ℹ'}
            </span>
            {t.mesaj}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}