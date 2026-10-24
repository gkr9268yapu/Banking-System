import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/jwt";

// The home page only decides where to send you.
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(user ? homeFor(user.role) : "/login");
}
