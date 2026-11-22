import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function CTASection() {
  return (
    <section
      id="contact"
      className="bg-blue-600 px-5 py-24 text-white sm:px-8 lg:px-12 lg:py-36"
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
          Your next collaboration starts here
        </p>

        <h2 className="mt-8 max-w-6xl text-5xl font-black leading-[0.9] tracking-[-0.08em] sm:text-7xl lg:text-[110px]">
          LET&apos;S BUILD
          <br />
          SOMETHING
          <br />
          IMPOSSIBLE TO IGNORE.
        </h2>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-8 border-t border-white/20 pt-8">
          <p className="max-w-sm text-sm leading-7 text-blue-100">
            Whether you are building a brand campaign or growing as a creator,
            the right collaboration begins here.
          </p>

          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-5 bg-white px-7 py-5 text-[10px] font-semibold tracking-[0.18em] text-blue-700 transition hover:bg-blue-50"
          >
            START A PROJECT
            <ArrowUpRight
              size={16}
              className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}