// dashboard/DashboardClient.tsx
"use client";

import React, { useState } from "react";
import { 
  LayoutDashboard, 
  LogOut, 
  Github, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  GitPullRequest 
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { RepoTypeDropdown } from "../components/RepoActions";
import { startIndexingAction } from "@/app/actions/indexing";

interface Repository {
  id: string;
  owner: string;
  name: string;
  createdAt: string;
  type?: "MAIN" | "DOCS" | "IGNORE";
}

export default function DashboardClient({ 
  ghUser, 
  initialRepositories = [] 
}: { 
  ghUser: string, 
  initialRepositories: Repository[] 
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ 
    type: "success" | "error"; 
    message: string; 
    title?: string 
  } | null>(null);

  async function handleStart() {
    setLoading(true);
    setStatus(null);

    try {
      const result = await startIndexingAction();
      
      if (result?.error) {
        // SENIOR LOGIC: Check if it's a conflict (Already Indexed)
        if (result.status === 409) {
          setStatus({ 
            type: "success", // Emerald styling because "Already Indexed" is a positive state
            title: "Already Indexed",
            message: result.message || "This repository is already up to date in our system." 
          });
        } else {
          // Standard Configuration Error (400)
          setStatus({ 
            type: "error", 
            title: "Configuration Required",
            message: result.message || "Please mark exactly one repository as MAIN and one as DOCS." 
          });
        }
      } else {
        // Success State
        setStatus({ 
          type: "success", 
          title: "Pipeline Activated",
          message: "Manicule has begun indexing your source code. We will now monitor your main repository and automatically generate Pull Requests." 
        });
      }
    } catch (err) {
      setStatus({ 
        type: "error", 
        title: "System Error",
        message: "We encountered an issue connecting to the indexing service. Please refresh and try again." 
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-900/20 p-6 flex flex-col">
        <div className="font-bold tracking-tighter text-xl mb-12 italic">
          👉 MANICULE
        </div>

        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg text-white">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm font-medium">Overview</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-zinc-900">
          <p className="text-xs font-medium truncate mb-4 text-zinc-500">{ghUser}</p>
          <form action={signOut}>
            <button className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        
        {/* STATUS POPUP */}
        {status && (
          <div className={`mb-8 rounded-xl border p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500 ${
            status.type === "error" 
              ? "border-red-500/30 bg-red-500/5 text-red-400" 
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
          }`}>
            <div className="mt-1">
              {status.type === "error" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <GitPullRequest className="w-5 h-5" /> 
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm tracking-tight mb-1">
                {status.title}
              </h4>
              <p className="text-sm leading-relaxed opacity-80 max-w-2xl">
                {status.message}
              </p>
            </div>
            <button 
              onClick={() => setStatus(null)} 
              className="text-xs font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              [esc]
            </button>
          </div>
        )}

        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Connected Repositories</h1>
            <p className="text-zinc-500 mt-2 text-sm">
              Configure your source-to-docs pipeline settings
            </p>
          </div>

          <button 
            onClick={handleStart}
            disabled={loading}
            className="bg-white text-black px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? "Initializing..." : "Start Indexing"}
          </button>
        </header>

        {initialRepositories?.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {initialRepositories.map((repo) => (
              <div 
                key={repo.id} 
                className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 flex justify-between items-center hover:bg-zinc-900/20 hover:border-zinc-800 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-800/50 rounded-xl group-hover:bg-zinc-800 transition-colors">
                    <Github className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="font-medium">{repo.name}</h3>
                    <p className="text-zinc-500 text-xs font-mono">{repo.owner}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <RepoTypeDropdown
                    repoId={repo.id}
                    initialType={repo.type || "IGNORE"}
                  />
                  <a 
                    href={`https://github.com/${repo.owner}/${repo.name}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-zinc-600 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
              <Github className="w-8 h-8 text-zinc-700" />
            </div>
            <p className="text-zinc-500 max-w-xs">
              No repositories found. Connect your GitHub organization to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}