import React from 'react';

// Senior Tip: Use a constant for repetitive data. 
// It keeps the JSX clean and makes it easy to switch to a CMS later.
const FEATURES = [
  {
    title: "Repo Sync",
    desc: "Connect your GitHub repo in two clicks. We handle the webhooks."
  },
  {
    title: "Auto-Analysis",
    desc: "Our engine parses every PR to understand code changes in real-time."
  },
  {
    title: "Live Docs",
    desc: "We commit documentation updates directly to your docs branch."
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 tracking-tighter font-bold text-xl uppercase">
          <div className="w-6 h-6 bg-white rounded-sm" />
          Manicule
        </div>
        <div className="flex gap-8 text-sm font-medium text-zinc-400">
          <a href="#" className="hover:text-white transition-colors">Product</a>
          <a href="#" className="hover:text-white transition-colors">Docs</a>
          <a href="https://github.com" className="hover:text-white transition-colors underline decoration-zinc-700 underline-offset-4">GitHub</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-24 pb-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-8xl font-medium tracking-tight leading-[0.9] mb-8">
            Documentation <br /> 
            <span className="text-zinc-500 italic font-light">on autopilot.</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 leading-relaxed mb-12 max-w-xl">
            Manicule installs on your GitHub repo and keeps your documentation perfectly in sync with your source code.
          </p>
          
          <div className="flex items-center gap-6">
            <button className="bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-zinc-200 transition-all">
              Get Started
            </button>
            <button className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors group">
              View Demo 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>

        {/* Feature Grid - Minimalist approach */}
        <section className="grid md:grid-cols-3 gap-12 mt-48 border-t border-zinc-800 pt-16">
          {FEATURES.map((f, i) => (
            <div key={i} className="space-y-4">
              <span className="text-xs font-mono text-zinc-600">0{i + 1} //</span>
              <h3 className="text-xl font-medium">{f.title}</h3>
              <p className="text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* Mockup - Raw CSS/HTML instead of an image */}
        <section className="mt-48">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
            <div className="rounded-lg border border-zinc-800 bg-black overflow-hidden">
              <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between bg-zinc-900/30">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Git Workflow</div>
                <div className="w-10" />
              </div>
              <div className="p-8 md:p-16 font-mono text-sm space-y-4">
                <div className="flex gap-4">
                  <span className="text-zinc-700">1</span>
                  <span className="text-blue-400">git</span> <span>push origin main</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-zinc-700">2</span>
                  <span className="text-zinc-500 italic"># Manicule triggers...</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-zinc-700">3</span>
                  <span className="text-green-400">✓</span> <span>Scanning components/Auth.tsx</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-zinc-700">4</span>
                  <span className="text-green-400">✓</span> <span>Updating docs/authentication.md</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Footer */}
        <footer className="mt-64 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-zinc-600 text-xs border-t border-zinc-900 pt-12">
          <div className="flex gap-8">
            <p>&copy; 2025 MANICULE LABS</p>
            <a href="#" className="hover:text-zinc-300">PRIVACY</a>
            <a href="#" className="hover:text-zinc-300">TERMS</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="uppercase tracking-widest">System Operational</span>
          </div>
        </footer>
      </main>
    </div>
  );
}