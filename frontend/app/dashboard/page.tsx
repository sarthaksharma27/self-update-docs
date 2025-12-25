import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const ghUser = cookieStore.get("gh_user")?.value;
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

  if (!ghUser) redirect("/");

  let repositories = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/user/repositories`, {
      headers: {
        Cookie: `gh_user=${ghUser}`,
      },
      next: { revalidate: 0 },
    });

    if (res.ok) {
      const data = await res.json();
      repositories = data.repositories || [];
    }
  } catch (error) {
    console.error("Failed to fetch repos:", error);
  }

  return <DashboardClient ghUser={ghUser} initialRepositories={repositories} />;
}