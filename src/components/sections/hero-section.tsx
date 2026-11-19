import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="mx-auto max-w-[1600px] px-5 pb-20 pt-24 sm:px-8 sm:pt-32 lg:px-12 lg:pb-28 lg:pt-40">
      <div className="mb-8 flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-white" />

        <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
          The creator collaboration platform / 2026
        </p>
      </div>

      <h1 className="text-[clamp(4.5rem,16vw,15rem)] font-black leading-[0.78] tracking-[-0.095em]">
        INFLUENCE<span className="text-neutral-600">.</span>
      </h1>

      <div className="mt-9 grid gap-8 lg:grid-cols-[1fr_390px] lg:items-end">
        <p className="text-2xl font-medium leading-tight tracking-[-0.04em] text-neutral-300 sm:text-4xl lg:text-5xl">
          WE CONNECT BRANDS
          <br />
          WITH PEOPLE WHO
          <br />
          <span className="text-white">MOVE CULTURE.</span>
        </p>

        <div className="max-w-sm lg:pb-2">
          <p className="text-sm leading-7 text-neutral-400">
            A platform built for meaningful brand collaborations. Discover
            creators, launch campaigns and turn creative partnerships into
            measurable work.
          </p>

          <div className="mt-7 flex flex-wrap gap-5">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-3 border-b border-white pb-2 text-[10px] font-semibold tracking-[0.18em] transition hover:border-neutral-400"
            >
              JOIN THE PLATFORM
              <ArrowUpRight
                size={15}
                className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
              />
            </Link>

            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 pb-2 text-[10px] tracking-[0.18em] text-neutral-400 transition hover:text-white"
            >
              DISCOVER MORE
              <ArrowDown size={13} />
            </Link>
          </div>
        </div>
      </div>

      <div className="relative mt-20 h-[360px] overflow-hidden bg-neutral-800 sm:h-[500px] lg:h-[650px]">
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-[1.03]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=2200&q=90')",
          }}
        />

        <div className="absolute inset-0 bg-black/25" />

        <div className="absolute bottom-7 left-7 right-7 flex items-end justify-between sm:bottom-10 sm:left-10 sm:right-10">
          <div>
            <p className="text-[9px] tracking-[0.2em] text-white/70">
              PEOPLE. CREATIVITY. COLLABORATION.
            </p>

            <p className="mt-2 text-xl font-semibold tracking-tight sm:text-3xl">
              Make the right connection.
            </p>
          </div>

          <span className="hidden text-xs tracking-[0.2em] text-white/70 sm:block">
            SCROLL TO EXPLORE ↓
          </span>
        </div>
      </div>
    </section>
  );
}