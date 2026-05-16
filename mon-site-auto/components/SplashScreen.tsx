"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SPLASH_KEY   = "autologgia-splash-v1";
const T_EXIT_START = 1_500; // ms — start fade-out
const T_UNMOUNT    = 2_000; // ms — remove from DOM (after 500ms fade)

export default function SplashScreen() {
  const [show, setShow]       = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const isDesktop     = window.matchMedia("(min-width: 1024px)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen          = localStorage.getItem(SPLASH_KEY);

    if (!isDesktop || reducedMotion || seen) return;

    localStorage.setItem(SPLASH_KEY, "1");
    setShow(true);
    document.body.style.overflow = "hidden";

    const t1 = setTimeout(() => setLeaving(true), T_EXIT_START);
    const t2 = setTimeout(() => {
      setShow(false);
      document.body.style.overflow = "";
    }, T_UNMOUNT);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = "";
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: "#0B1929",
        opacity: leaving ? 0 : 1,
        transition: leaving ? "opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        pointerEvents: leaving ? "none" : "all",
      }}
    >
      <style>{`
        @keyframes splash-logo {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0px)  scale(1);    }
        }
        @keyframes splash-line {
          from { transform: scaleX(0); opacity: 0; }
          to   { transform: scaleX(1); opacity: 1; }
        }
      `}</style>

      <div className="flex flex-col items-center gap-4">

        {/* Logo — enters with a cinematic rise + fade */}
        <div
          style={{
            animation: "splash-logo 0.72s cubic-bezier(0.16, 1, 0.3, 1) both",
            filter: "drop-shadow(0 0 52px rgba(201,168,76,0.09))",
          }}
        >
          <Image
            src="/logo.png"
            alt="Autologgia"
            width={260}
            height={260}
            priority
          />
        </div>

        {/* Gold separator — expands from center 70ms after logo finishes */}
        <div
          style={{
            width: "180px",
            height: "1px",
            background: "linear-gradient(90deg, transparent, #C9A84C 25%, #C9A84C 75%, transparent)",
            transformOrigin: "center",
            animation: "splash-line 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.72s both",
          }}
        />

      </div>
    </div>
  );
}
