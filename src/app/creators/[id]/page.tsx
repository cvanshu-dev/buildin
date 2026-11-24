import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type CreatorPublicPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PublicCreatorProfilePage({
  params,
}: CreatorPublicPageProps) {
  const { id } = await params;

  const profile = await prisma.creatorProfile.findFirst({
    where: { id, isPublic: true },
    select: {
      id: true,
      displayName: true,
      bio: true,
      city: true,
      state: true,
      categories: true,
      specialties: true,
      languages: true,
      portfolioItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          mediaUrl: true,
          mediaType: true,
        },
      },
      socialAccounts: {
        select: {
          id: true,
          platform: true,
          handle: true,
          profileUrl: true,
          followers: true,
        },
      },
    },
  });

  if (!profile) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm uppercase tracking-[0.25em] text-blue-700">
          Creator profile
        </p>
        <h1 className="mt-4 text-4xl font-semibold">
          {profile.displayName || "Creator"}
        </h1>
        {(profile.city || profile.state) && (
          <p className="mt-2 text-slate-600">
            {[profile.city, profile.state].filter(Boolean).join(", ")}
          </p>
        )}
        {profile.bio && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">About</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap leading-7 text-slate-700">
              {profile.bio}
            </p>
          </section>
        )}
        {profile.categories.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.categories.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
        {profile.specialties.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Specialties</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.specialties.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}
        {profile.languages.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Languages</h2>
            <p className="mt-3 text-slate-700">{profile.languages.join(", ")}</p>
          </section>
        )}
        {profile.portfolioItems.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Portfolio</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.portfolioItems.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {item.mediaType === "IMAGE" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.mediaUrl} alt={item.title} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="flex aspect-[4/3] items-center justify-center text-blue-700">
                      View portfolio item
                    </a>
                  )}
                  <div className="p-4">
                    <h3 className="font-medium">{item.title}</h3>
                    {item.description && <p className="mt-2 text-sm text-slate-600">{item.description}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        {profile.socialAccounts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Social accounts</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.socialAccounts.map((account) => (
                <a key={account.id} href={account.profileUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-lime-300/50">
                  {account.platform} · {account.handle}
                  {typeof account.followers === "number" && (
                    <span className="ml-2 text-slate-600">{account.followers.toLocaleString()} followers</span>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
