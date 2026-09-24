import { Masthead } from "@/components/gazette/Masthead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";

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
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
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
    <div className="texture-newsprint bg-background text-foreground min-h-screen">
      <Masthead size="compact" date={new Date()} className="border-t-4" />

      <main className="mx-auto flex w-full max-w-[1400px] flex-col items-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[420px]">
          <div className="border-foreground bg-card border-2">
            <div className="border-foreground border-b-2 px-5 py-2.5">
              <p className="kicker text-center">Subscriber access</p>
            </div>

            <div className="px-6 py-7">
              {step === "signIn" ? (
                <>
                  <h1 className="font-masthead text-center text-3xl leading-tight font-black tracking-tight">
                    Sign in to the tape
                  </h1>
                  <p className="text-muted-foreground mt-2 text-center font-serif text-sm leading-6 italic">
                    Enter your email and we will send a six-digit code. New readers are enrolled on
                    the spot.
                  </p>

                  <form onSubmit={handleEmailSubmit} className="mt-6">
                    <label className="kicker text-muted-foreground" htmlFor="email">
                      Email address
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          required
                          disabled={isLoading}
                          className="focus-visible:border-foreground h-11 rounded-none border pl-9 font-serif shadow-none"
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
                      <p className="text-destructive mt-3 font-serif text-sm">{error}</p>
                    ) : null}

                    <div className="border-border mt-6 border-t pt-5">
                      <Button
                        type="button"
                        variant="outline"
                        className="font-mono h-11 w-full rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
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
                  <h1 className="font-masthead text-center text-3xl leading-tight font-black tracking-tight">
                    Check your post
                  </h1>
                  <p className="text-muted-foreground mt-2 text-center font-serif text-sm leading-6 italic">
                    We sent a six-digit code to {step.email}
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
                              className="border-foreground/40 size-11 rounded-none border-y border-r font-mono first:border-l"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {error ? (
                      <p className="text-destructive mt-3 text-center font-serif text-sm">{error}</p>
                    ) : null}

                    <Button
                      type="submit"
                      className="font-mono mt-6 h-11 w-full rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
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
                      className="text-muted-foreground mt-4 w-full font-serif text-sm underline underline-offset-4 hover:text-foreground"
                    >
                      Use a different email
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="border-border bg-muted border-t px-6 py-3 text-center">
              <p className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.14em] uppercase">
                Secured by{" "}
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

          <p className="text-muted-foreground mt-6 text-center font-serif text-sm">
            <Link to="/" className="hover:text-foreground underline underline-offset-4">
              Back to the front page
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
