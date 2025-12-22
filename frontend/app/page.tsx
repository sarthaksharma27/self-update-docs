'use client';

import React from 'react';
import { Github, Zap, RefreshCcw, FileText, ArrowRight, Terminal } from 'lucide-react';

const FEATURES = [
  {
    title: "Repo Sync",
    desc: "Connect your GitHub repo in two clicks. We handle the webhooks automatically.",
    icon: <RefreshCcw className="w-5 h-5" />,
    color: "group-hover:text-blue-400"
  },
  {
    title: "Auto-Analysis",
    desc: "Our engine parses every PR to understand code changes in real-time.",
    icon: <Zap className="w-5 h-5" />,
    color: "group-hover:text-yellow-400"
  },
  {
    title: "Live Docs",
    desc: "We commit documentation updates directly to your docs branch.",
    icon: <FileText className="w-5 h-5" />,
    color: "group-hover:text-emerald-400"
  }
];

export default function LandingPage() {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  const handleGithubInstall = () => {
    if (typeof window !== "undefined") {
      window.location.href = `${BACKEND_URL}/auth/github`;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-white selection:text-black overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto sticky top-0 z-50 backdrop-blur-sm">
        <div className="flex items-center gap-2 tracking-tighter font-bold text-xl uppercase">
          👉 Manicule
        </div>
        <div className="flex items-center gap-4 md:gap-8 text-sm font-medium">
          <a href="https://calendly.com/namban/30min" className="hidden md:block text-zinc-400 hover:text-white transition-colors">Request Early Access</a>
          <button 
            onClick={handleGithubInstall}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-all text-zinc-200 text-xs md:text-sm"
          >
            <Github className="w-4 h-4" />
            <span>Install GitHub App</span>
          </button>
        </div>
      </nav>

      {/* ... (Rest of the JSX remains the same) ... */}
      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-16 md:pt-24 pb-32">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-[10px] md:text-xs text-zinc-400 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Last Doc Sync: 2m ago
          </div>
          
          <h1 className="text-5xl md:text-8xl lg:text-9xl font-medium tracking-tight leading-[0.9] mb-8">
            Documentation <br /> 
            <span className="text-zinc-600 italic font-light">on autopilot.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-zinc-500 leading-relaxed mb-12 max-w-2xl">
            Manicule installs on your GitHub repo and keeps your <span className="text-zinc-200">documentation</span> perfectly in sync with your source code.
          </p>
          
          <div className="flex flex-wrap items-center gap-6">
            <button 
              onClick={handleGithubInstall}
              className="bg-white text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform active:scale-95"
            >
              Start Building Free
            </button>
            <button className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors group">
              View Demo 
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="grid md:grid-cols-3 gap-4 md:gap-6 mt-48">
          {FEATURES.map((f, i) => (
            <div key={i} className="group relative p-8 rounded-2xl border border-zinc-900 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-800 transition-all duration-300">
              <div className={`mb-6 transition-colors duration-300 ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
                {f.desc}
              </p>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </section>

        {/* GitHub Workflow Mockup */}
        <section className="mt-32 relative">
          <div className="absolute -inset-4 md:-inset-24 bg-blue-500/10 blur-[80px] md:blur-[120px] rounded-full pointer-events-none opacity-50" />
          
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm p-1 shadow-2xl">
            <div className="rounded-xl border border-zinc-800 bg-black overflow-hidden">
              <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between bg-zinc-900/50">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <Terminal className="w-3 h-3" />
                  Manicule-Core-Scanner
                </div>
                <div className="w-12" />
              </div>
              <div className="p-6 md:p-12 font-mono text-xs md:text-sm space-y-4 overflow-x-auto">
                <div className="flex gap-4 min-w-fit">
                  <span className="text-zinc-700">01</span>
                  <span className="text-blue-400">git</span> <span>push origin main</span>
                </div>
                <div className="flex gap-4 min-w-fit animate-pulse">
                  <span className="text-zinc-700">02</span>
                  <span className="text-zinc-500 italic"># Syncing with GitHub webhooks...</span>
                </div>
                <div className="flex gap-4 min-w-fit">
                  <span className="text-zinc-700">03</span>
                  <span className="text-emerald-500">✔</span> <span>Extracted 12 component definitions</span>
                </div>
                <div className="flex gap-4 min-w-fit">
                  <span className="text-zinc-700">04</span>
                  <span className="text-emerald-500">✔</span> <span>Generated <code className="text-zinc-300">API_REFERENCE.md</code></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="mt-64 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-zinc-600 text-[10px] tracking-widest border-t border-zinc-900 pt-12 uppercase pb-12">
          <div className="flex gap-8">
            <p>&copy; 2025 MANICULE LABS</p>
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span>Engine Status: Online</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}