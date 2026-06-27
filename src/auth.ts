// Auth.js (NextAuth v5) — Google sign-in, made gracefully optional.
//
// Mirrors the LLM-key fallback pattern (see src/lib/llm/index.ts): when the
// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars are absent the Google
// provider is simply not registered, `authConfigured` is false, and the UI
// hides every sign-in affordance. The app still runs end-to-end without auth.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// True only when both Google OAuth credentials are present. Everything
// auth-related keys off this so the feature is invisible until configured.
export const authConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  // No providers => NextAuth routes exist but offer nothing to sign in with.
  providers: authConfigured
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : [],
  // Trust the deployment host header (Auth.js needs this behind proxies and
  // keeps local dev / preview deploys working without extra config).
  trustHost: true,
});
