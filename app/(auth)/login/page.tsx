import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/jwt";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Already signed in (and still ACTIVE)? Skip the form.
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));

  // requireUser() sends people here with ?session=ended
  const { session } = await searchParams;
  const notice =
    session === "ended" ? "Your session has ended. Please sign in again." : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <LoginForm notice={notice} />
    </main>
  );
}
