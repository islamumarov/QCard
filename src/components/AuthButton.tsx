// Header sign-in/out control. Server component: reads the session directly and
// uses inline server actions for sign-in/out so no client SessionProvider is
// needed. Renders nothing at all when Google OAuth is not configured.
import { auth, authConfigured, signIn, signOut } from "@/auth";

export default async function AuthButton() {
  if (!authConfigured) return null;

  const session = await auth();
  const user = session?.user;

  if (user) {
    const label = user.name || user.email || "Signed in";
    return (
      <>
        {/* History is only meaningful once signed in — sessions are tied to the user. */}
        <a href="/history" className="chip">
          History
        </a>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="chip gap-1.5" title={`Sign out${user.email ? ` (${user.email})` : ""}`}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-5 w-5 rounded-full" />
            ) : null}
            <span className="max-w-[10rem] truncate">{label}</span>
            <span className="text-slate-400">· sign out</span>
          </button>
        </form>
      </>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button type="submit" className="chip">Sign in with Google</button>
    </form>
  );
}
