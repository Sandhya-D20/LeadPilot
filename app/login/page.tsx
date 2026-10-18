"use client";

import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }

      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        const errorCode = (err as { code?: string }).code;

        switch (errorCode) {
          case "auth/email-already-in-use":
            setError("This email is already registered. Please sign in.");
            break;
          case "auth/invalid-email":
            setError("Please enter a valid email address.");
            break;
          case "auth/weak-password":
            setError("Please choose a password with at least 6 characters.");
            break;
          case "auth/invalid-credential":
          case "auth/user-not-found":
          case "auth/wrong-password":
            setError("Invalid email or password.");
            break;
          default:
            setError("Something went wrong. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-cyan-400">
            LeadPilot
          </h1>

          <p className="mt-3 text-slate-400">
            {isSignup
              ? "Create your sales workspace account"
              : "Welcome back to your sales workspace"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete={
                isSignup ? "new-password" : "current-password"
              }
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-900 bg-red-950 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isSignup
            ? "Already have an account?"
            : "New to LeadPilot?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            className="font-semibold text-cyan-400 hover:text-cyan-300"
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </main>
  );
}