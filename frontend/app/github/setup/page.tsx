"use client";

import { useSearchParams } from "next/navigation";

export default function GitHubSetupPage() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  return (
    <div style={{ padding: 40 }}>
      <h1>GitHub App Setup</h1>

      <p>
        Installation ID: <b>{installationId ?? "missing"}</b>
      </p>

      <p>
        If you can see this page after installing the GitHub App,
        the redirect is working correctly.
      </p>
    </div>
  );
}
