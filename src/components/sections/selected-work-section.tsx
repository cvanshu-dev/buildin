import Link from "next/link";
import { ArrowUpRight, MoveUpRight } from "lucide-react";

const projects = [
  {
    name: "THE BEAUTY EDIT",
    category: "BEAUTY / CREATOR CAMPAIGN",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=85",
    number: "01",
  },
  {
    name: "CULTURE IN MOTION",
    category: "FASHION / BRAND CAMPAIGN",
    image:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=85",
    number: "02",
  },
  {
    name: "EVERYDAY ICONS",
    category: "LIFESTYLE / UGC",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
    number: "03",
  },
  {
    name: "THE NEW STANDARD",
    category: "COMMERCIAL / CREATIVE",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
    number: "04",
  },
];

export function SelectedWorkSection() {
  return (
    <section
      id="work"
      className="bg-slate-50 px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
              Campaigns / Creative / Collaborations
            </p>

            <h2 className="mt-5 text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">
              Selected
              <br />
              <span className="text-slate-500">work.</span>
            </h2>
          </div>

          <p className="max-w-xs text-sm leading-7 text-slate-600">
            A glimpse into the worlds, stories and creative possibilities brands
            can build with the right talent.
          </p>
        </div>

        <div className="mt-16 grid gap-x-6 gap-y-14 md:grid-cols-2">
          {projects.map((project, index) => (
            <article
              key={project.number}
              className={index % 2 === 1 ? "md:mt-24" : ""}
            >
              <Link href="/sign-up" className="group block">
                <div className="relative aspect-[1.18/1] overflow-hidden bg-slate-200">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage: `url('${project.image}')`,
                    }}
                  />

                  <span className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/50 text-slate-900 transition group-hover:bg-white group-hover:text-white">
                    <MoveUpRight size={17} />
                  </span>
                </div>

                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-medium tracking-tight">
                      {project.name}
                    </h3>

                    <p className="mt-2 text-[9px] tracking-[0.18em] text-slate-500">
                      {project.category}
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    /{project.number}
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-20 border-t border-slate-200 pt-8">
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-4 text-xs tracking-[0.18em]"
          >
            START YOUR CAMPAIGN
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