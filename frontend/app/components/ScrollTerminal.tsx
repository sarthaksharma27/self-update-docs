"use client";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Terminal, GitBranch, GitPullRequest, Code2, CheckCircle } from 'lucide-react';

const STEPS = [
  { 
    id: 1, 
    title: "Commit Tracking", 
    desc: "Every time you push to main or merge a feature branch, Manicule's scanner triggers a deep-code review.",
    log: { type: "HOOK", msg: "intercepting_push: [branch: main] [origin: github]", color: "text-blue-400", icon: <GitBranch className="w-3 h-3"/> }
  },
  { 
    id: 2, 
    title: "Impact Discovery", 
    desc: "We analyze your code changes and automatically identify every documentation file that is now outdated.",
    log: { type: "TRACE", msg: "identifying_stale_docs: [impact_score: 0.94]", color: "text-purple-400", icon: <Code2 className="w-3 h-3"/> }
  },
  { 
    id: 3, 
    title: "Automated Drafting", 
    desc: "Manicule writes the updates for you, ensuring your API docs and tutorials reflect the new reality of your code.",
    log: { type: "SYNTH", msg: "generating_patch: docs/api-reference.md", color: "text-yellow-400", icon: <Terminal className="w-3 h-3"/> }
  },
  { 
    id: 4, 
    title: "The Perfect PR", 
    desc: "We open a Pull Request against your docs repo. Review, click merge, and you're officially back in sync.",
    log: { type: "DEPLOY", msg: "pr_dispatched: [repo: docs] [id: #402]", color: "text-emerald-400", icon: <GitPullRequest className="w-3 h-3"/> }
  }
];

export default function ScrollTerminal() {
  const targetRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, { 
    stiffness: 80, 
    damping: 25 
  });

  const currentTime = mounted 
    ? new Date().toLocaleTimeString([], { hour12: false }) 
    : "00:00:00";

  return (
    <div ref={targetRef} className="relative h-[400vh] w-full">
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        <div className="max-w-6xl w-full px-6 grid md:grid-cols-2 gap-16 items-center">
          
          {/* Hybrid Copy Side */}
          <div className="relative h-[400px]">
            {STEPS.map((step, i) => {
              const start = i / STEPS.length;
              const end = (i + 1) / STEPS.length;
              
              const opacity = useTransform(smoothProgress, [start, start + 0.1, end - 0.1, end], [0, 1, 1, 0]);
              const x = useTransform(smoothProgress, [start, start + 0.1], [-20, 0]);

              return (
                <motion.div 
                  key={step.id} 
                  style={{ opacity, x }} 
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <div className="inline-flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-widest mb-4">
                    <span className="w-2 h-2 rounded-full bg-blue-500/50 animate-pulse" />
                    Automation Pipeline 0{step.id}
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tighter">
                    {step.title}
                  </h2>
                  <p className="text-zinc-400 text-lg md:text-xl leading-relaxed max-w-sm">
                    {step.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Technical Visualization */}
          <div className="relative w-full max-w-lg mx-auto md:mr-0">
            <div className="absolute -inset-1 bg-blue-500/10 blur-3xl opacity-30" />
            <div className="relative rounded-xl border border-white/5 bg-zinc-950/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
              <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">manicule_cli v1.4.0</div>
              </div>

              <div className="p-8 font-mono text-xs md:text-sm space-y-6 min-h-[380px]">
                {STEPS.map((step, i) => {
                  const start = i / STEPS.length;
                  const opacity = useTransform(smoothProgress, [start, start + 0.05], [0, 1]);

                  return (
                    <motion.div key={step.id} style={{ opacity }} className="flex gap-4 items-start">
                      <span className="text-zinc-700 select-none">[{currentTime}]</span>
                      <div className={`flex items-center gap-2 ${step.log.color} font-bold`}>
                        {step.log.icon}
                        <span className="uppercase tracking-tighter text-[10px]">{step.log.type}</span>
                      </div>
                      <span className="text-zinc-300 leading-snug">{step.log.msg}</span>
                    </motion.div>
                  );
                })}
                
                {/* Simulated Success State */}
                <motion.div 
                   style={{ opacity: useTransform(smoothProgress, [0.9, 0.95], [0, 1]) }}
                   className="pt-4 border-t border-white/5 flex items-center gap-2 text-emerald-500 text-[10px]"
                >
                   <CheckCircle className="w-3 h-3" />
                   WORKFLOW_READY_FOR_MERGE
                </motion.div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}