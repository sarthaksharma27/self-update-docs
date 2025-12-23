import { cookies } from "next/headers";
import Link from 'next/link';
import { Github, Zap, RefreshCcw, FileText, ArrowRight, LayoutDashboard, MessageSquare } from 'lucide-react';
import Background from "./components/BackgroundPaths";
import ScrollTerminal from "./components/ScrollTerminal";

export default async function LandingPage() {
  const cookieStore = await cookies();
  const ghUser = cookieStore.get("gh_user")?.value;
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
  const AUTH_URL = `${BACKEND_URL}/auth/github`;

  return (
    <div className="relative min-h-screen bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      
      {/* 1. Background layer: FIXED so it stays behind everything */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Background />
      </div>

      {/* 2. UI Layer */}
      <div className="relative z-10 w-full">
        <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto sticky top-0 z-[100] backdrop-blur-sm">
          <div className="flex items-center gap-2 tracking-tighter font-bold text-xl uppercase italic">👉 Manicule</div>
          <div className="flex items-center gap-4 md:gap-8 text-sm font-medium">
            {ghUser ? (
              <Link href="/dashboard" className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-xs md:text-sm">
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </Link>
            ) : (
              <a href={AUTH_URL} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-zinc-200 text-xs md:text-sm hover:bg-zinc-800 transition-colors">
                <Github className="w-4 h-4" /> Continue with GitHub
              </a>
            )}
          </div>
        </nav>

        <main className="w-full">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-6 md:px-8 pt-24 pb-32">
            <div className="max-w-4xl">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-medium tracking-tight leading-[0.85] mb-12">
                Docs <br /> <span className="text-zinc-600 italic font-light">on autopilot.</span>
              </h1>
              <p className="text-xl md:text-3xl text-zinc-500 leading-tight mb-12 max-w-2xl tracking-tight">
                Manicule maps your codebase and syncs your documentation with every single commit.
              </p>
              <div className="flex gap-6">
                <a href={AUTH_URL} className="bg-white text-black px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform active:scale-95">Connect GitHub</a>
                <button className="text-zinc-400 hover:text-white flex items-center gap-2 group transition-colors">
                  Explore Sample <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform"/>
                </button>
              </div>
            </div>
          </section>

          {/* This is the Sticky Animation Section */}
          <ScrollTerminal />

          {/* Footer - Pushed down by the 400vh ScrollTerminal */}
          <footer className="relative z-20 max-w-7xl mx-auto px-6 pb-24 mt-48">
            
            {/* Discuss your docs CTA - Removed background box for integrated feel */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-12 py-24 border-t border-white/5">
              <div className="max-w-xl text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-blue-500 font-mono text-xs uppercase tracking-[0.3em]">Direct Access</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tighter text-white leading-[1.1]">
                  Ready to automate <br /> your documentation?
                </h2>
                <p className="text-zinc-500 text-lg md:text-xl leading-relaxed max-w-md italic">
                  Book a technical deep-dive to discuss your specific repository architecture.
                </p>
              </div>
              
              <div className="relative group">
                <div className="absolute -inset-4 bg-blue-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <a 
                  href="https://calendly.com/namban/30min" 
                  className="relative flex items-center gap-3 bg-white text-black px-10 py-5 rounded-full font-bold text-lg hover:scale-105 transition-all active:scale-95 shadow-2xl"
                >
                  <MessageSquare className="w-5 h-5 fill-current" />
                  Discuss Your Docs
                  <ArrowRight className="w-5 h-5 ml-1" />
                </a>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 text-[10px] tracking-[0.3em] text-zinc-600 uppercase font-mono border-t border-white/5">
              <div className="flex items-center gap-4">
                <p>&copy; 2025 MANICULE LABS / SYSTEMS</p>
              </div>
              <div className="flex gap-12">
                <a href="#" className="hover:text-white transition-colors">Security</a>
                <a href="#" className="hover:text-white transition-colors">API</a>
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}