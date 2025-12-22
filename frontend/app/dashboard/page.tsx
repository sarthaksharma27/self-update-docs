import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LayoutDashboard, Settings, BookOpen, LogOut, Github, ExternalLink } from 'lucide-react';
import { signOut } from "@/app/actions/auth";

// Senior Tip: Define a type for your repository data
interface Repository {
  id: string;
  owner: string;
  name: string;
  createdAt: string;
}

export default async function Dashboard() {
  const cookieStore = await cookies();
  const ghUser = cookieStore.get("gh_user")?.value;
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  if (!ghUser) redirect("/");

  // Fetching data server-side
  // We pass the cookie manually because the server-to-server fetch doesn't include it by default
  const res = await fetch(`${BACKEND_URL}/api/user/repositories`, {
    headers: {
      Cookie: `gh_user=${ghUser}`
    },
    next: { revalidate: 0 } // Senior Tip: Disable caching for real-time dashboard data
  });

  const data = await res.json();
  const repositories: Repository[] = data.repositories || [];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-900 bg-zinc-900/20 p-6 flex flex-col">
        <div className="font-bold tracking-tighter text-xl mb-12 flex items-center gap-2">
           👉 MANICULE
        </div>
        
        <nav className="space-y-2 flex-1">
          <button className="w-full flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg text-white">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm font-medium">Overview</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all rounded-lg">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">My Docs</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-white hover:bg-white/5 transition-all rounded-lg">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500" />
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">{ghUser}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Pro Account</p>
            </div>
          </div>
          <form action={signOut}>
            <button type="submit" className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 transition-all rounded-lg">
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Connected Repositories</h1>
            <p className="text-zinc-500 mt-1">Manage the documentation sync for your GitHub projects.</p>
          </div>
          <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors">
            + New Repository
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/20">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Active Repos</p>
            <p className="text-2xl font-semibold">{repositories.length}</p>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/20">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Sync Status</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xl font-medium text-emerald-400">Healthy</p>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/20">
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">Total Documentation</p>
            <p className="text-xl font-medium">42 Files</p>
          </div>
        </div>

        {/* Repository List Section */}
        {repositories.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {repositories.map((repo) => (
              <div key={repo.id} className="group p-6 rounded-2xl border border-zinc-900 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">{repo.name}</h3>
                    <p className="text-zinc-500 text-sm">{repo.owner}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded uppercase tracking-widest font-bold">Sync Enabled</span>
                   <a 
                    href={`https://github.com/${repo.owner}/${repo.name}`} 
                    target="_blank" 
                    className="p-2 text-zinc-600 hover:text-white transition-colors"
                   >
                     <ExternalLink className="w-4 h-4" />
                   </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-2xl border border-zinc-900 bg-zinc-900/10 h-64 flex flex-col items-center justify-center border-dashed">
            <p className="text-zinc-500 mb-4">No active repositories connected.</p>
            <button className="text-sm text-blue-400 hover:underline">Install Manicule on a Repository</button>
          </div>
        )}
      </main>
    </div>
  );
}