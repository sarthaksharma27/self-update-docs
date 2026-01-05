"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Loader2 } from "lucide-react";

// Senior Tip: Align these exactly with your Prisma Enum names
type RepoType = "MAIN" | "DOCS" | "IGNORE" | "HYBRID";

const OPTIONS: { id: RepoType; label: string }[] = [
  { id: "MAIN", label: "Main Project" },
  { id: "DOCS", label: "Documentation" },
  { id: "IGNORE", label: "Ignore / Private" },
  { id: "HYBRID", label: "Hybrid" },
];

export function RepoTypeDropdown({ repoId, initialType }: { repoId: string, initialType: string }) {
  const [isOpen, setIsOpen] = useState(false);
  // Ensure we normalize the initialType to uppercase
  const [currentType, setCurrentType] = useState<RepoType>(initialType.toUpperCase() as RepoType);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleUpdate = async (selectedType: RepoType) => {
    if (selectedType === currentType) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    setIsOpen(false);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${BACKEND_URL}/api/repositories/${repoId}/type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: selectedType }),
      });

      if (res.ok) {
        setCurrentType(selectedType);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Backend Error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="flex items-center justify-between w-40 px-3 py-2 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all"
      >
        <div className="flex items-center gap-2">
          {isUpdating ? (
            <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
          ) : (
            <div className={`w-1.5 h-1.5 rounded-full ${currentType === 'IGNORE' ? 'bg-zinc-600' : 'bg-blue-500'}`} />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
            {currentType.toLowerCase()}
          </span>
        </div>
        <ChevronDown className={`w-3 h-3 text-zinc-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[#0a0a0a] border border-zinc-800 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleUpdate(opt.id)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              {opt.label}
              {currentType === opt.id && <Check className="w-3 h-3 text-emerald-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}