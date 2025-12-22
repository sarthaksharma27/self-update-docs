"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Senior Tip: Move types outside the component for cleaner code
type Repo = { id: string; owner: string; name: string };

function SetupContent() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");
  
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!installationId) return;

    // Use the Cloudflare URL directly for now to avoid ENV issues on Vercel
    const API_URL = `https://newfoundland-reliance-border-john.trycloudflare.com/api/github/setup?installation_id=${installationId}`;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        if (data.status === "ready") {
          setRepos(data.repositories || []);
          setLoading(false);
          clearInterval(poll);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [installationId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
          Syncing with GitHub (ID: {installationId})
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Select Repositories</h1>
        <p className="text-zinc-500 text-sm">Choose the source and docs for Manicule.</p>
      </div>
      
      <div className="space-y-4 text-sm font-mono text-zinc-400">
        <div>
          <label className="block mb-2 text-[10px] uppercase">Main Source</label>
          <select className="w-full bg-zinc-900 border border-zinc-800 p-3 rounded text-white">
            {repos.map(r => <option key={r.id}>{r.owner}/{r.name}</option>)}
          </select>
        </div>
      </div>

      <button className="w-full py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition-colors">
        Finish Setup
      </button>
    </div>
  );
}

export default function GitHubSetupPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-zinc-700 font-mono">Initializing...</div>}>
        <SetupContent />
      </Suspense>
    </div>
  );
}