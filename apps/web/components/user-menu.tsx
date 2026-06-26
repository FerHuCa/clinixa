"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useClickOutside } from "@/lib/use-click-outside";

type UserMenuProps = {
  fullName: string;
};

export function UserMenu({ fullName }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useClickOutside(menuRef, () => setIsOpen(false));

  // Close on Escape and return focus to the trigger button
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Menú de usuario: ${fullName}`}
        className="flex items-center gap-2 rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div aria-hidden="true" className="h-5 w-5 rounded-full bg-primary text-xs font-bold text-white flex items-center justify-center">
          {fullName.charAt(0)}
        </div>
        <span>{fullName}</span>
        <ChevronDown aria-hidden="true" className={`transition ${isOpen ? "rotate-180" : ""}`} size={16} />
      </button>

      {isOpen && (
        <div
          aria-label="Opciones de usuario"
          className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-white shadow-lg"
          role="menu"
        >
          <Link
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            href="/sesion"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            <Settings aria-hidden="true" size={16} />
            Página de sesión
          </Link>
          <button
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
            onClick={() => {
              setIsOpen(false);
              void signOut({ redirectUrl: "/bienvenida" });
            }}
            role="menuitem"
            type="button"
          >
            <LogOut aria-hidden="true" size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
