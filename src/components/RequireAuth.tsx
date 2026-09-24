import { Button } from "@/components/ui/button";
import { Masthead } from "@/components/gazette/Masthead";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

/**
 * Wraps a route that requires a signed-in user.
 *
 * Signed-out visitors used to be bounced straight to `/auth`, which left them
 * on a bare sign-in form with no idea which page they had asked for or why they
 * were moved. The block is now stated on the page they landed on, and sign-in
 * still returns them to it via `returnTo`. Pass `redirectImmediately` for a
 * route where the bounce really is the better experience.
 */
export function RequireAuth({
  children,
  title = "Sign in to continue",
  description = "This page is only available to signed-in users.",
  redirectImmediately = false,
}: {
  children: ReactNode;
  /** Headline on the blocked screen. */
  title?: string;
  /** Says what the visitor gets by signing in. */
  description?: string;
  /** Skip the explanation and go straight to `/auth`. */
  redirectImmediately?: boolean;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="bg-background texture-newsprint flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    const signInHref = `/auth?returnTo=${encodeURIComponent(returnTo)}`;

    if (redirectImmediately) {
      return <Navigate to={signInHref} replace />;
    }

    return (
      <main className="bg-background texture-newsprint text-foreground flex min-h-screen flex-col p-4 sm:p-8">
        <Masthead size="compact" date={new Date()} className="mb-12 border-t-4" />
        <div className="flex flex-1 items-center justify-center">
          <div className="border-foreground bg-card w-full max-w-md border-2">
            <div className="border-foreground border-b-2 px-5 py-2.5">
              <p className="kicker text-center">Hold the front page</p>
            </div>
            <div className="px-6 py-8 text-center">
              <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
                <Lock className="text-muted-foreground size-5" />
              </div>
              <h2 className="font-masthead mt-5 text-2xl font-black tracking-tight">{title}</h2>
              <p className="text-muted-foreground mt-2 font-serif text-sm leading-6 italic">
                {description}
              </p>
              <p className="text-muted-foreground border-border mt-5 border-t pt-4 font-serif text-sm leading-6">
                You will come straight back to this page once you are signed in.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  className="font-mono h-11 w-full rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
                  onClick={() => navigate(signInHref)}
                >
                  Sign in
                </Button>
                <Button
                  variant="ghost"
                  className="font-mono h-11 w-full rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
                  onClick={() => navigate("/")}
                >
                  Back to the front page
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
