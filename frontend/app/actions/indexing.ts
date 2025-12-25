// app/actions/indexing.ts
"use server";
import { cookies } from "next/headers";

export async function startIndexingAction() {
  const cookieStore = await cookies();
  const ghUser = cookieStore.get("gh_user")?.value;
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!ghUser) return { error: "User session not found. Please log in again." };

  try {
    const res = await fetch(`${BACKEND_URL}/api/indexing/start`, {
      method: "POST",
      headers: {
        Cookie: `gh_user=${ghUser}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return { 
        error: data.error || "Invalid configuration", 
        details: data.details 
      };
    }

    return { success: true, message: data.message };
  } catch (e) {
    return { error: "Failed to connect to the indexing service." };
  }
}