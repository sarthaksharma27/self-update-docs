import { repoIndexQueue } from "./repoIndex.queue";

export async function enqueueRepoIndexingJob(data: {
  installationId: number;
  owner: string;
  repo: string;
  repoId: string;
  installationOwnerId: string
}) {
  console.log("Enqueueing job for", data.owner, data.repo);
  await repoIndexQueue.add(
    "index-repo",
    data,
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
}
