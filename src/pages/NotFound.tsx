import { AppHeader } from "@/components/watchdog/AppHeader";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router";

export default function NotFound() {
  const location = useLocation();

  return (
    <div className="texture-grid bg-background text-foreground flex min-h-screen flex-col">
      <AppHeader size="compact" />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="mx-auto flex w-full max-w-[1500px] flex-1 items-center px-4 py-16 sm:px-6"
      >
        <div className="border-border bg-card/60 w-full max-w-2xl border">
          <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2.5">
            <p className="label text-foreground">route not found</p>
            <p className="label-sm text-muted-foreground">http 404</p>
          </div>

          <div className="p-6 sm:p-8">
            <p className="tabular font-mono text-5xl font-semibold tracking-tight">404</p>
            <p className="mt-5 font-mono text-xs leading-6">
              <span className="text-primary">$</span>{" "}
              <span className="text-foreground">watchdog resolve</span>{" "}
              <span className="text-loss break-all">{location.pathname}</span>
            </p>
            <p className="text-muted-foreground mt-4 text-xs leading-6">
              That path is not part of the console. It may have been removed, renamed, or never
              existed in the first place.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
              >
                <Link to="/">Back to the front page</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-none font-mono text-[0.68rem] tracking-[0.1em] uppercase"
              >
                <Link to="/dashboard">Open the catalog</Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
