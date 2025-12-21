"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Repo = {
  id: string;
  owner: string;
  name: string;
};

export default function GitHubSetupPage() {
  const searchParams = useSearchParams();
  const installationId = searchParams.get("installation_id");

  const [repos, setRepos] = useState<Repo[]>([]);
  const [mainRepo, setMainRepo] = useState("");
  const [docsRepo, setDocsRepo] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!installationId) return;

    fetch(`/api/github/setup?installation_id=${installationId}`)
      .then(res => res.json())
      .then(data => {
        setRepos(data.repositories);
        setLoading(false);
      });
  }, [installationId]);

  if (!installationId) {
    return <div style={{ padding: 40 }}>Missing installation_id</div>;
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading repositories…</div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>GitHub App Setup</h1>

      <p>Select which repositories to use.</p>

      <div>
        <label>Main repository</label><br />
        <select value={mainRepo} onChange={e => setMainRepo(e.target.value)}>
          <option value="">Select</option>
          {repos.map(r => (
            <option key={r.id} value={r.id}>
              {r.owner}/{r.name}
            </option>
          ))}
        </select>
      </div>

      <br />

      <div>
        <label>Docs repository</label><br />
        <select value={docsRepo} onChange={e => setDocsRepo(e.target.value)}>
          <option value="">Select</option>
          {repos.map(r => (
            <option key={r.id} value={r.id}>
              {r.owner}/{r.name}
            </option>
          ))}
        </select>
      </div>

      <br />

      <button
        disabled={!mainRepo || !docsRepo}
        onClick={() => {
          console.log("MAIN:", mainRepo, "DOCS:", docsRepo);
          alert("Selections captured (not saved yet)");
        }}
      >
        Continue
      </button>
    </div>
  );
}
