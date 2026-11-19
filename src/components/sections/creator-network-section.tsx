import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const creators = [
  {
    name: "Fashion & Style",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Beauty & Lifestyle",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Fitness & Wellness",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85",
  },
];

export function CreatorNetworkSection() {
  return (
    <section id="campaigns" className="px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              The creator network
            </p>

            <h2 className="mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.07em] sm:text-7xl">
              Influence that
              <br />
              moves culture
              <br />
              <span className="text-neutral-500">and drives growth.</span>
            </h2>
          </div>

          <div>
            <p className="max-w-md text-sm leading-7 text-neutral-400">
              Discover creators across fashion, beauty, lifestyle, fitness,
              travel, UGC and more. Build your profile, showcase your work and
              connect with brands looking for your creative perspective.
            </p>

            <Link
              href="/for-creators"
              className="mt-8 inline-flex items-center gap-3 border-b border-white/50 pb-3 text-[10px] tracking-[0.18em] transition hover:border-white"
            >
              EXPLORE THE CREATOR NETWORK
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {creators.map((creator, index) => (
            <Link
              href="/for-creators"
              key={creator.name}
              className={`group relative block overflow-hidden bg-neutral-800 ${
                index === 1 ? "sm:mt-12" : ""
              }`}
            >
              <div className="relative aspect-[4/5]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${creator.image}')`,
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                  <div>
                    <p className="text-[9px] tracking-[0.2em] text-white/60">
                      CREATOR CATEGORY
                    </p>

                    <h3 className="mt-2 text-xl font-medium">
                      {creator.name}
                    </h3>
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}