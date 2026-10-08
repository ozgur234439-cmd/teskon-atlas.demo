'use client';
import { useEffect, useState, useLayoutEffect } from 'react';
import { useTour } from './TourContext';
import { TOUR_STEPS } from './tour-steps';

interface Rect { top: number; left: number; width: number; height: number; }

export function TourOverlay() {
  const { active, stepIndex, totalSteps, next, prev, close, presentationMode, stopPresentation } = useTour();
  const step = TOUR_STEPS[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);
  const [vh, setVh] = useState(0);
  const [vw, setVw] = useState(0);

  // Pencere boyutu
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => { setVh(window.innerHeight); setVw(window.innerWidth); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Hedefi ölç
  useLayoutEffect(() => {
    if (!active) return;
    if (!step?.target) { setRect(null); return; }

    let cancelled = false;
    let attempts = 0;
    const MAX = 10;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector('[data-tour="' + step.target + '"]') as HTMLElement | null;
      if (!el) {
        attempts += 1;
        if (attempts < MAX) setTimeout(measure, 150);
        else setRect(null);
        return;
      }
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch {}
      setTimeout(() => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 300);
    };

    measure();

    const recompute = () => {
      const el = document.querySelector('[data-tour="' + step.target + '"]') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      cancelled = true;
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [active, step, stepIndex]);

  if (!active || !step) return null;

  const isCenter = !step.target || !rect;

  const PAD = 8;
  const spot = rect ? {
    top: Math.max(0, rect.top - PAD),
    left: Math.max(0, rect.left - PAD),
    width: Math.min(vw, rect.width + PAD * 2),
    height: Math.min(vh, rect.height + PAD * 2),
  } : null;

  const panelStyle = (top: number, left: number, right: number, bottom: number, h: number): React.CSSProperties => ({
    position: 'fixed',
    top, left, right, bottom,
    width: '100vw',
    height: h,
    backgroundColor: 'rgba(0,0,0,0.62)',
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    zIndex: 9998,
    transition: 'all 220ms ease-out',
    pointerEvents: 'auto',
  });

  // Tooltip konumu — hedefi ÖRTMEZ
  const tooltipStyle: React.CSSProperties = (() => {
    const W = 400, H = 230, GAP = 18;
    if (isCenter) {
      return {
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: W,
        zIndex: 10000,
      };
    }
    const placement = step.placement || 'right';

    if (placement === 'right') {
      const top = Math.max(20, Math.min(spot!.top + spot!.height / 2 - H / 2, vh - H - 20));
      const left = spot!.left + spot!.width + GAP;
      if (left + W < vw - 20) {
        return { position: 'fixed', top, left, width: W, zIndex: 10000 };
      }
      // sığmazsa alta düş
      return {
        position: 'fixed',
        top: Math.min(spot!.top + spot!.height + GAP, vh - H - 20),
        left: Math.max(20, Math.min(spot!.left, vw - W - 20)),
        width: W, zIndex: 10000,
      };
    }
    if (placement === 'left') {
      const top = Math.max(20, Math.min(spot!.top + spot!.height / 2 - H / 2, vh - H - 20));
      const right = vw - spot!.left + GAP;
      if (right + W < vw - 20) {
        return { position: 'fixed', top, right, width: W, zIndex: 10000 };
      }
      return {
        position: 'fixed',
        top: Math.min(spot!.top + spot!.height + GAP, vh - H - 20),
        left: Math.max(20, Math.min(spot!.left, vw - W - 20)),
        width: W, zIndex: 10000,
      };
    }
    if (placement === 'top') {
      const bottom = vh - spot!.top + GAP;
      if (vh - spot!.top > H + GAP) {
        return {
          position: 'fixed',
          bottom,
          left: Math.max(20, Math.min(spot!.left, vw - W - 20)),
          width: W, zIndex: 10000,
        };
      }
      return {
        position: 'fixed',
        top: Math.min(spot!.top + spot!.height + GAP, vh - H - 20),
        left: Math.max(20, Math.min(spot!.left, vw - W - 20)),
        width: W, zIndex: 10000,
      };
    }
    // bottom
    const top = spot!.top + spot!.height + GAP;
    if (top + H < vh - 20) {
      return {
        position: 'fixed',
        top,
        left: Math.max(20, Math.min(spot!.left, vw - W - 20)),
        width: W, zIndex: 10000,
      };
    }
    return {
      position: 'fixed',
      top: Math.max(20, spot!.top - H - GAP),
      left: Math.max(20, Math.min(spot!.left, vw - W - 20)),
      width: W, zIndex: 10000,
    };
  })();

  return (
    <>
      {isCenter ? (
        // Center modu: tek tam ekran panel
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.62)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9998,
            pointerEvents: 'auto',
          }}
        />
      ) : (
        <>
          {/* ==== 4 PANEL OVERLAY ==== */}
          {/* Üst panel: hedefin üstünü kaplar */}
          <div style={panelStyle(0, 0, 0, vh - spot!.top, spot!.top)} />

          {/* Alt panel: hedefin altını kaplar */}
          <div
            style={panelStyle(
              spot!.top + spot!.height,
              0,
              0,
              0,
              vh - (spot!.top + spot!.height)
            )}
          />

          {/* Sol panel: sol bant (hedef yüksekliği kadar) */}
          <div
            style={panelStyle(
              spot!.top,
              0,
              vw - spot!.left,
              vh - (spot!.top + spot!.height),
              spot!.height
            )}
          />

          {/* Sağ panel: sağ bant (hedef yüksekliği kadar) */}
          <div
            style={panelStyle(
              spot!.top,
              spot!.left + spot!.width,
              0,
              vh - (spot!.top + spot!.height),
              spot!.height
            )}
          />

          {/* Cyan çerçeve — blur yok, hedefin tam üstünde */}
          <div
            style={{
              position: 'fixed',
              top: spot!.top,
              left: spot!.left,
              width: spot!.width,
              height: spot!.height,
              borderRadius: 10,
              border: '1px solid #22D3EE',
              boxShadow: '0 0 0 4px rgba(34,211,238,0.14), 0 0 24px rgba(34,211,238,0.22)',
              zIndex: 9999,
              transition: 'all 220ms ease-out',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ==== TOOLTIP — her zaman net ve en üstte ==== */}
      <div
        className="rounded-[12px] bg-[#111827] border border-[#334155] shadow-2xl p-5"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="text-[10.5px] uppercase tracking-wider font-medium text-[#22D3EE]">
            ADIM {stepIndex + 1} / {totalSteps}
          </div>
          <button
            onClick={close}
            className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors text-[18px] leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <h3 className="text-[15px] font-semibold text-[#F8FAFC] mb-2">{step.title}</h3>
        <p className="text-[13px] text-[#CBD5E1] leading-relaxed mb-4">{step.description}</p>

        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-[#64748B]">
            {presentationMode ? 'Otomatik ilerliyor' : 'ESC · ← →'}
          </div>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="h-8 px-3 rounded-[6px] border border-[#334155] text-[#CBD5E1]
                           text-[12.5px] hover:bg-[#1F2937] transition-colors"
              >
                ← Geri
              </button>
            )}
            <button
              onClick={stepIndex >= totalSteps - 1 ? close : next}
              className="h-8 px-4 rounded-[6px] bg-[#0891B2] text-white
                         text-[12.5px] font-medium hover:bg-[#06B6D4] transition-colors"
            >
              {stepIndex >= totalSteps - 1 ? 'Bitir' : 'İleri →'}
            </button>
          </div>
        </div>

        {presentationMode && (
          <button
            onClick={stopPresentation}
            className="mt-3 w-full h-7 rounded-[6px] border border-[#334155]
                       text-[11.5px] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            Otomatik ilerlemeyi durdur
          </button>
        )}
      </div>
    </>
  );
}
