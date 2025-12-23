"use client";

import { motion } from "framer-motion";

export default function Background() {
  return (
    <div className="fixed inset-0 -z-10 bg-[#050505] overflow-hidden">
      {/* 1. The Blueprint Grid */}
      <div 
        className="absolute inset-0 opacity-[0.2]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #27272a 1px, transparent 1px),
            linear-gradient(to bottom, #27272a 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
        }}
      />

      {/* 2. Animated Path (The "Docs Engine" working) */}
      <svg className="absolute inset-0 w-full h-full opacity-30">
        {[...Array(4)].map((_, i) => (
          <motion.path
            key={i}
            d={`M ${-200} ${200 + i * 200} Q ${600} ${100 + i * 50} ${1400} ${300 + i * 150} T ${2000} ${200}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            initial={{ pathLength: 0, pathOffset: 0 }}
            animate={{ 
              pathLength: [0, 0.4, 0],
              pathOffset: [0, 1] 
            }}
            transition={{
              duration: 12 + i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </svg>

      {/* 3. Radial Glow (The "Depth" effect) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0%,#050505_70%)]" />
    </div>
  );
}