"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TOUR_STEPS } from "./tour-steps";

interface TourCtx {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  presentationMode: boolean;
  start: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
  startPresentation: () => void;
  stopPresentation: () => void;
}

const Ctx = createContext<TourCtx | null>(null);
const LS_KEY = "atlas_tour_completed";
const PRESENTATION_INTERVAL = 7000;

export function TourProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const totalSteps = TOUR_STEPS.length;

  const goToStep = useCallback((idx: number) => {
    const step = TOUR_STEPS[idx];
    if (!step) return;
    setStepIndex(idx);
    if (step.route && pathname !== step.route) {
      router.push(step.route);
    }
  }, [pathname, router]);

  const start = useCallback(() => {
    setActive(true);
    setStepIndex(0);
    setPresentationMode(false);
    goToStep(0);
  }, [goToStep]);

  const next = useCallback(() => {
    if (stepIndex >= totalSteps - 1) {
      setActive(false);
      setPresentationMode(false);
      localStorage.setItem(LS_KEY, "true");
      return;
    }
    goToStep(stepIndex + 1);
  }, [stepIndex, totalSteps, goToStep]);

  const prev = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  const close = useCallback(() => {
    setActive(false);
    setPresentationMode(false);
    localStorage.setItem(LS_KEY, "true");
  }, []);

  const startPresentation = useCallback(() => {
    setActive(true);
    setStepIndex(0);
    setPresentationMode(true);
    goToStep(0);
  }, [goToStep]);

  const stopPresentation = useCallback(() => {
    setPresentationMode(false);
  }, []);

  // ESC handler
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, next, prev]);

  // Presentation auto-advance
  useEffect(() => {
    if (!active || !presentationMode) return;
    const t = setTimeout(() => next(), PRESENTATION_INTERVAL);
    return () => clearTimeout(t);
  }, [active, presentationMode, stepIndex, next]);

  return (
    <Ctx.Provider value={{
      active, stepIndex, totalSteps, presentationMode,
      start, next, prev, close, startPresentation, stopPresentation,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTour(): TourCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTour must be used inside TourProvider");
  return c;
}

export function hasCompletedTour(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(LS_KEY) === "true";
}
