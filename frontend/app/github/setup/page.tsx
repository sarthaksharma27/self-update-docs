"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// 1. Move the logic into a separate sub-component
function SetupContent() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">GitHub App Setup</h1>
      <p className="text-zinc-400">
        Installation ID: <b className="text-white font-mono">{installationId ?? "missing"}</b>
      </p>
      <p className="text-zinc-500">
        If you can see this page after installing the GitHub App,
        the redirect is working correctly.
      </p>
    </div>
  );
}

// 2. Wrap it in Suspense in the main export
export default function GitHubSetupPage() {
  return (
    <div className="p-10 bg-black min-h-screen text-white">
      <Suspense fallback={<div className="font-mono text-zinc-600">Loading installation data...</div>}>
        <SetupContent />
      </Suspense>
    </div>
  );
}