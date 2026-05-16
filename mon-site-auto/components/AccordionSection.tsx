"use client";

import { useState } from "react";

interface Props {
  title: string;
  preview?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function AccordionSection({
  title,
  preview,
  defaultOpen = false,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#071A2D]/20">
      {/* Bannière titre — toujours navy */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 bg-[#071A2D] px-8 py-6 text-left transition hover:bg-[#0c2540]"
        aria-expanded={isOpen}
      >
        <h2 className="font-heading text-xl font-light text-white">{title}</h2>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-[#C9A84C] transition-transform duration-300 ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
      </button>

      {/* Contenu — animé via grid-template-rows (supporte height:auto) */}
      <div
        aria-hidden={!isOpen}
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div
            className="bg-white px-8 pb-8 pt-6 text-[#071A2D]"
            style={{
              opacity: isOpen ? 1 : 0,
              transition: isOpen ? "opacity 0.28s ease 0.1s" : "opacity 0.18s ease",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
