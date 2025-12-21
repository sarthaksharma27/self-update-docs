"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Repo = {
  id: string;
  owner: string;
  name: string;
};

// 1. SetupContent: Handles all the logic and UI
function SetupContent() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  const [repos, setRepos] = useState<Repo[]>([]);
  const [mainRepo, setMainRepo] = useState("");
  const [docsRepo, setDocsRepo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!installationId) return;

  const interval = setInterval(async () => {
    try {
        // const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
    // fetch(`${API_BASE}/api/github/setup?installation_id=${installationId}`);
      const res = await fetch(
        `http://localhost:8000/api/github/setup?installation_id=${installationId}`
      );
      const data = await res.json();

      if (data.status === "ready") {
        setRepos(data.repositories);
        setLoading(false);
        clearInterval(interval);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  }, 1000);

  return () => clearInterval(interval);
}, [installationId]);

  if (!installationId) {
    return (
      <div className="text-zinc-500 font-mono border border-zinc-800 p-6 rounded-lg">
        <span className="text-red-500 mr-2">!</span> 
        Missing installation_id. Please restart the GitHub installation.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-zinc-500 font-mono">
        <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
        fetching_repos...
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="mb-12">
        <h1 className="text-4xl font-medium tracking-tighter mb-2">Configure</h1>
        <p className="text-zinc-500 text-lg">Connect your source and documentation.</p>
      </header>

      <div className="space-y-10">
        {/* Main Repository Dropdown */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
            01. Source Code
          </label>
          <select 
            value={mainRepo} 
            onChange={e => setMainRepo(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-4 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-all cursor-pointer hover:border-zinc-700"
          >
            <option value="">Select repository...</option>
            {repos.map(r => (
              <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
            ))}
          </select>
        </div>

        {/* Docs Repository Dropdown */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold">
            02. Documentation
          </label>
          <select 
            value={docsRepo} 
            onChange={e => setDocsRepo(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 p-4 rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-white/20 transition-all cursor-pointer hover:border-zinc-700"
          >
            <option value="">Select repository...</option>
            {repos.map(r => (
              <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
            ))}
          </select>
        </div>

        <div className="pt-10">
          <button
            disabled={!mainRepo || !docsRepo}
            onClick={() => {
              console.log("MAIN:", mainRepo, "DOCS:", docsRepo);
              alert("Configuration saved successfully.");
            }}
            className="w-full py-5 bg-white text-black font-bold rounded-full disabled:bg-zinc-900 disabled:text-zinc-600 hover:bg-zinc-200 transition-all active:scale-[0.98]"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Main Page: The static wrapper that prevents the Prerender Error
export default function GitHubSetupPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 flex items-center justify-center p-8 selection:bg-white selection:text-black">
      {/* Senior Strategy: Wrapping in Suspense bails out of static generation 
          during 'npm run build', fixing the Vercel error. 
      */}
      <Suspense fallback={
        <div className="font-mono text-zinc-700 animate-pulse uppercase tracking-widest text-xs">
          Loading Environment...
        </div>
      }>
        <SetupContent />
      </Suspense>
    </div>
  );
}