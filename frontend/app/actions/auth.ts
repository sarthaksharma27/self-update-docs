'use server'

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signOut() {
  const cookieStore = await cookies();
  // Delete the session cookie
  cookieStore.delete("gh_user");
  // Redirect to landing page
  redirect("/");
}