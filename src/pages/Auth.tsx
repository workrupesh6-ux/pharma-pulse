import { AppHeader } from "@/components/watchdog/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(returnTo: string | null, fallback = "/dashboard") {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(searchParams.get("returnTo"), redirectAfterAuth);
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (error) {
      console.error("Email sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (error) {
      console.error("OTP verification error:", error);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest login error:", error);
      setError(
        `Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="texture-grid bg-background text-foreground min-h-screen">
      <AppHeader size="compact" />

      <main className="mx-auto flex w-full max-w-[1500px] flex-col items-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="border-border bg-card/60 border">
            <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2.5">
              <p className="label text-foreground">watchdog access</p>
              <p className="label-sm text-muted-foreground">
                {step === "signIn" ? "step 1 / 2" : "step 2 / 2"}
              </p>
            </div>

            <div className="px-5 py-6 sm:px-6 sm:py-7">
              {step === "signIn" ? (
                <>
                  <h1 className="font-mono text-xl font-semibold tracking-[0.06em]">
                    Sign in to start the tape
                  </h1>
                  <p className="text-muted-foreground mt-3 text-xs leading-6">
                    Enter your email and a six-digit code will be sent to it. New users are enrolled
                    on the spot — there is no separate registration step.
                  </p>

                  <form onSubmit={handleEmailSubmit} className="mt-6">
                    <label className="label-sm text-muted-foreground" htmlFor="email">
                      email address
                    </label>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          required
                          disabled={isLoading}
                          className="focus-visible:border-primary h-11 rounded-none border pl-9 font-mono text-xs shadow-none"
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        size="icon"
                        disabled={isLoading}
                        aria-label="Send verification code"
                        className="size-11 rounded-none"
                      >
                        {isLoading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowRight className="size-4" />
                        )}
                      </Button>
                    </div>

                    {error ? (
                      <p className="text-loss mt-3 font-mono text-xs">
                        <span className="opacity-70">error:</span> {error}
                      </p>
                    ) : null}

                    <div className="border-border mt-6 border-t pt-5">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
                        onClick={handleGuestLogin}
                        disabled={isLoading}
                      >
                        <UserX className="size-3.5" />
                        Continue as guest
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <h1 className="font-mono text-xl font-semibold tracking-[0.06em]">
                    Enter the six-digit code
                  </h1>
                  <p className="text-muted-foreground mt-3 text-xs leading-6">
                    Sent to <span className="text-foreground">{step.email}</span>. The code expires
                    shortly, so enter it as soon as it arrives.
                  </p>

                  <form onSubmit={handleOtpSubmit} className="mt-6">
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />

                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && otp.length === 6 && !isLoading) {
                            const form = (event.target as HTMLElement).closest("form");
                            if (form) form.requestSubmit();
                          }
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="border-border size-11 rounded-none border-y border-r font-mono first:border-l"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error ? (
                      <p className="text-loss mt-3 text-center font-mono text-xs">
                        <span className="opacity-70">error:</span> {error}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      className="mt-6 h-11 w-full rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Verifying
                        </>
                      ) : (
                        <>
                          Verify the code
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-foreground mt-4 w-full font-mono text-xs underline underline-offset-4"
                    >
                      Use a different email
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="border-border bg-muted/40 border-t px-4 py-3 text-center">
              <p className="label-sm text-muted-foreground">
                secured by{" "}
                <a
                  href="https://freebuff.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground underline"
                >
                  freebuff.com
                </a>
              </p>
            </div>
          </div>

          <p className="text-muted-foreground mt-5 text-center font-mono text-xs">
            <Link to="/" className="hover:text-foreground underline underline-offset-4">
              ← Back to the front page
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
