const expertise = [
  {
    number: "/01",
    title: "Brand Partnerships",
    description:
      "Connecting ambitious brands with the right creative talent.",
    services: [
      "Creator Discovery",
      "Campaign Strategy",
      "Brand Collaborations",
      "Campaign Management",
    ],
  },
  {
    number: "/02",
    title: "Creator Network",
    description:
      "A curated network of creators, influencers and creative professionals.",
    services: [
      "Creator Profiles",
      "Portfolio Showcase",
      "Talent Discovery",
      "Paid Opportunities",
    ],
  },
  {
    number: "/03",
    title: "Campaign Execution",
    description:
      "Taking collaborations from the first brief to final delivery.",
    services: [
      "Campaign Coordination",
      "Creator Shortlisting",
      "Content Management",
      "Performance Reporting",
    ],
  },
];

export function ExpertiseSection() {
  return (
    <section
      id="services"
      className="border-t border-white/10 bg-[#151515] px-5 py-24 sm:px-8 lg:px-12 lg:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-16 grid gap-6 md:grid-cols-2 md:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">
              Expertise // 2026
            </p>

            <h2 className="mt-5 text-5xl font-semibold tracking-[-0.07em] sm:text-7xl">
              Built around
              <br />
              <span className="text-neutral-500">collaboration.</span>
            </h2>
          </div>

          <p className="max-w-md text-sm leading-7 text-neutral-400 md:justify-self-end">
            From discovering the right talent to managing complete
            collaborations, everything happens through one connected platform.
          </p>
        </div>

        <div className="border-t border-white/15">
          {expertise.map((item) => (
            <article
              key={item.number}
              className="grid gap-8 border-b border-white/15 py-10 md:grid-cols-[100px_1fr_1fr] lg:py-14"
            >
              <p className="text-xs tracking-widest text-neutral-500">
                {item.number}
              </p>

              <div>
                <h3 className="max-w-lg text-3xl font-medium tracking-[-0.05em] sm:text-4xl">
                  {item.title}
                </h3>

                <p className="mt-4 max-w-sm text-sm leading-7 text-neutral-400">
                  {item.description}
                </p>
              </div>

              <ul className="grid grid-cols-2 gap-x-5 gap-y-4 self-end text-xs text-neutral-400 md:justify-self-end lg:w-[340px]">
                {item.services.map((service) => (
                  <li key={service} className="flex items-center gap-2">
                    <span className="h-1 w-1 bg-neutral-500" />
                    {service}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}