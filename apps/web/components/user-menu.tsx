"use client";

import { useRef, useState } from "react";
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

  useClickOutside(menuRef, () => setIsOpen(false));

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <div className="h-5 w-5 rounded-full bg-primary text-xs font-bold text-white flex items-center justify-center">
          {fullName.charAt(0)}
        </div>
        {fullName}
        <ChevronDown size={16} className={`transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-white shadow-lg">
          <Link
            className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-50"
            href="/sesion"
            onClick={() => setIsOpen(false)}
          >
            <Settings size={16} />
            Página de sesión
          </Link>
          <button
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
            onClick={() => {
              setIsOpen(false);
              void signOut({ redirectUrl: "/bienvenida" });
            }}
            type="button"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
