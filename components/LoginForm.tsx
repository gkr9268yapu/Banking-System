"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BANK_NAME } from "@/lib/config";

type LoginFormProps = {
  // Optional message shown above the form, for example "Your session ended".
  notice?: string;
};

export default function LoginForm({ notice }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Go to the page for this role. refresh() makes Next.js re-read the
      // server data now that the login cookie exists.
      router.replace(data.redirectTo);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl bg-surface px-4 py-3 text-sm text-ink outline-none ring-1 ring-transparent focus:ring-ink";

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-8 sm:p-10">
      <p className="text-[22px] text-ink">{BANK_NAME}</p>
      <h1 className="mt-8 text-[22px] font-bold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Enter your email and password.</p>

      {notice && (
        <p className="mt-6 rounded-xl bg-pastel-blue/40 px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="email" className="text-xs text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            maxLength={100}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="text-xs text-muted">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* role="alert" makes screen readers announce the error */}
        {error && (
          <p role="alert" className="rounded-xl bg-pastel-orange/30 px-4 py-3 text-sm text-sent">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-ink py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
