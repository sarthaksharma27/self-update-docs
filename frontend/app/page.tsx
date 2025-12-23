import { cookies } from "next/headers";
import Link from 'next/link';
import { Github, Zap, RefreshCcw, FileText, ArrowRight, LayoutDashboard } from 'lucide-react';
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
          <div className="flex items-center gap-2 tracking-tighter font-bold text-xl uppercase">👉 Manicule</div>
          <div className="flex items-center gap-4 md:gap-8 text-sm font-medium">
            {ghUser ? (
              <Link href="/dashboard" className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-xs md:text-sm">
                <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
              </Link>
            ) : (
              <a href={AUTH_URL} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-lg text-zinc-200 text-xs md:text-sm">
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
                <button className="text-zinc-400 hover:text-white flex items-center gap-2">Explore Sample <ArrowRight className="w-4 h-4"/></button>
              </div>
            </div>
          </section>

          {/* This is the Sticky Animation Section */}
          <ScrollTerminal />

          {/* Footer - Pushed down by the 400vh ScrollTerminal */}
          <footer className="max-w-7xl mx-auto px-6 py-24 border-t border-zinc-900 text-[10px] tracking-[0.3em] text-zinc-600 uppercase">
            <div className="flex justify-between">
              <p>&copy; 2025 MANICULE LABS / SYSTEMS</p>
              <div className="flex gap-8">
                <a href="#">Security</a>
                <a href="#">API</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}