import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const capabilities = [
  ["01", "BRAND DISCOVERY"],
  ["02", "CREATOR NETWORK"],
  ["03", "CAMPAIGN WORKSPACE"],
  ["04", "COLLABORATION TRACKING"],
];

export function ImpactSection() {
  return (
    <section className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 md:grid-cols-2 md:items-end">
          <h2 className="text-5xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-7xl">
            Collaboration
            <br />
            <span className="text-slate-500">with purpose.</span>
          </h2>

          <p className="max-w-md text-sm leading-7 text-slate-600 md:justify-self-end">
            Better partnerships start with better connections. Our platform
            brings brands and creative talent into one organised workspace.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-2 border-y border-slate-200 py-10 md:grid-cols-4">
          {capabilities.map(([number, label]) => (
            <div
              key={number}
              className="px-4 py-5 md:border-r md:border-slate-200 md:first:pl-0 md:last:border-0"
            >
              <p className="text-xs text-slate-500">{number}</p>

              <p className="mt-5 max-w-[150px] text-sm font-medium leading-6 tracking-wide">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
          <p className="text-[9px] uppercase tracking-[0.22em] text-slate-500">
            A connected ecosystem for creative partnerships
          </p>

          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-3 text-[10px] tracking-[0.18em] transition hover:text-slate-600"
          >
            EXPLORE HOW IT WORKS
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}