"use client";
import { useEffect } from "react";
import { useTour, hasCompletedTour } from "./TourContext";

export function TourTrigger() {
  const { start, startPresentation } = useTour();

  // İlk ziyaret için otomatik göster
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasCompletedTour()) {
      // kullanıcı rahatsız olmasın diye 800ms gecikme
      const t = setTimeout(() => {
        const flag = localStorage.getItem("atlas_tour_auto_shown");
        if (!flag) {
          localStorage.setItem("atlas_tour_auto_shown", "1");
          // start(); // Otomatik başlatma istenirse açılır
        }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [start]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={start}
        data-tour="tour-start"
        className="h-8 px-3.5 rounded-[var(--radius-atlas-sm)]
                   border border-[var(--color-atlas-border-2)]
                   text-[12.5px] text-[var(--color-atlas-text-2)]
                   hover:bg-[var(--color-atlas-surface-2)]
                   hover:border-[var(--color-atlas-cyan)]
                   hover:text-[var(--color-atlas-cyan)]
                   transition-colors"
      >
        ATLAS'ı Keşfet
      </button>
      <button
        onClick={startPresentation}
        data-tour="presentation-start"
        className="h-8 px-3.5 rounded-[var(--radius-atlas-sm)]
                   bg-[var(--color-atlas-cyan-dark)] text-white
                   text-[12.5px] font-medium
                   hover:bg-[var(--color-atlas-cyan-hover)]
                   transition-colors"
      >
        Sunum Modu
      </button>
    </div>
  );
}
