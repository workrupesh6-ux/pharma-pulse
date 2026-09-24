import { AppHeader } from "@/components/watchdog/AppHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";

/**
 * Wraps a route that requires a signed-in user.
 *
 * Signed-out visitors see why they were stopped, on the page they asked for, and
 * sign-in returns them to it via `returnTo`. Pass `redirectImmediately` for a
 * route where the bounce really is the better experience.
 */
export function RequireAuth({
  children,
  title = "Sign in to open the console",
  description = "Prices, fundamentals and headlines are only served to signed-in readers.",
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
      <main className="texture-grid bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
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
      <main className="texture-grid bg-background text-foreground flex min-h-screen flex-col">
        <AppHeader size="compact" />
        <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
          <div className="border-border bg-card/60 w-full max-w-lg border">
            <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2.5">
              <p className="label text-foreground">access restricted</p>
              <p className="label-sm text-muted-foreground">auth required</p>
            </div>

            <div className="p-6 sm:p-8">
              <span className="border-border bg-muted/50 text-muted-foreground grid size-10 place-items-center border">
                <Lock className="size-4" />
              </span>
              <h2 className="mt-5 font-mono text-xl font-semibold tracking-[0.06em]">{title}</h2>
              <p className="text-muted-foreground mt-3 text-xs leading-6">{description}</p>
              <p className="border-border text-muted-foreground mt-5 border-t pt-4 font-mono text-xs leading-6">
                You will come straight back to{" "}
                <span className="text-foreground break-all">{location.pathname}</span> once you are
                signed in.
              </p>

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  className="h-11 w-full rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
                  onClick={() => navigate(signInHref)}
                >
                  Sign in
                </Button>
                <Button
                  variant="ghost"
                  className="h-11 w-full rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
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
