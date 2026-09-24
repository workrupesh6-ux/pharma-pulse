import { Masthead } from "@/components/gazette/Masthead";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="texture-newsprint bg-background text-foreground flex min-h-screen flex-col"
    >
      <Masthead size="compact" date={new Date()} className="border-t-4" />

      <main className="mx-auto flex w-full max-w-[1400px] flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-xl text-center">
          <p className="kicker text-primary">Correction — page not filed</p>
          <h1 className="font-masthead mt-4 text-6xl leading-none font-black tracking-tight sm:text-7xl">
            404
          </h1>
          <p className="border-foreground mt-6 border-y py-4 font-serif text-lg leading-7 italic">
            This column does not exist in the edition. The page you asked for has either been spiked
            or never went to press.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="font-mono rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
            >
              <Link to="/">Back to the front page</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="font-mono rounded-none text-[0.68rem] tracking-[0.14em] uppercase"
            >
              <Link to="/dashboard">Open the live board</Link>
            </Button>
          </div>
        </div>
      </main>
    </motion.div>
  );
}
