import { prisma } from "@/lib/prisma";

type Raw = Record<string, unknown>;
const numberOrNull = (...values: unknown[]): number | null => {
  for (const value of values) {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return null;
};
const str = (...values: unknown[]) => values.find((v): v is string => typeof v === "string" && v.length > 0) ?? null;

async function runActor(token: string, actor: string, input: Raw): Promise<Raw[]> {
  const response = await fetch(`https://api.apify.com/v2/acts/${actor.replace("/", "~")}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=240`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), cache: "no-store",
    signal: AbortSignal.timeout(250_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Instagram data provider returned ${response.status}: ${detail}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Instagram data provider returned an unexpected response.");
  return data.filter((item): item is Raw => Boolean(item) && typeof item === "object");
}

export async function refreshInstagramAnalytics(socialAccountId: string) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("Instagram analytics is not configured. Add APIFY_API_TOKEN to the server environment.");
  const actor = process.env.APIFY_INSTAGRAM_ACTOR_ID || "apify/instagram-scraper";
  const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account || account.platform !== "INSTAGRAM") throw new Error("Instagram account not found.");
  const username = account.handle.replace(/^@/, "").trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) throw new Error("Enter a valid Instagram username.");

  const [profileRows, postRows] = await Promise.all([
    runActor(token, actor, { directUrls: [`https://www.instagram.com/${username}/`], resultsType: "details", resultsLimit: 1 }),
    runActor(token, actor, { directUrls: [`https://www.instagram.com/${username}/`], resultsType: "posts", resultsLimit: 12, addParentData: true }),
  ]);
  const profile = profileRows.find(row => str(row.username, row.ownerUsername, row.owner_username)) ?? profileRows[0] ?? {};
  const posts = postRows.filter(row => {
    const owner = str(row.ownerUsername, row.username, row.owner_username);
    return !owner || owner.toLowerCase() === username.toLowerCase();
  }).slice(0, 12);
  const followers = numberOrNull(profile.followersCount, profile.followers, profile.followerCount, profile.followers_count);
  const following = numberOrNull(profile.followsCount, profile.followingCount, profile.following, profile.follows_count);
  const likes = posts.map(p => numberOrNull(p.likesCount, p.likes, p.likeCount)).filter((n): n is number => n !== null);
  const comments = posts.map(p => numberOrNull(p.commentsCount, p.comments, p.commentCount)).filter((n): n is number => n !== null);
  const views = posts.map(p => numberOrNull(p.videoPlayCount, p.videoViewCount, p.views, p.playCount)).filter((n): n is number => n !== null);
  const average = (values: number[]) => values.length ? Math.round(values.reduce((a,b)=>a+b,0)/values.length) : null;
  const avgLikes = average(likes), avgComments = average(comments), avgViews = average(views);
  const engagementTotal = (avgLikes ?? 0) + (avgComments ?? 0);
  const hasEngagementData = avgLikes !== null || avgComments !== null;
  const engagementRate = followers && followers > 0 && hasEngagementData
    ? Number(((engagementTotal / followers) * 100).toFixed(2)) : null;
  const recentPosts = posts.map(p => ({
    url: str(p.url, p.postUrl, p.inputUrl),
    type: str(p.type, p.productType),
    caption: str(p.caption)?.slice(0, 220) ?? null,
    likes: numberOrNull(p.likesCount, p.likes, p.likeCount),
    comments: numberOrNull(p.commentsCount, p.comments, p.commentCount),
    views: numberOrNull(p.videoPlayCount, p.videoViewCount, p.views, p.playCount),
    publishedAt: str(p.timestamp, p.takenAt, p.date),
  }));
  const snapshot = await prisma.socialAccountMetricSnapshot.create({
    data: {
      socialAccountId: account.id,
      followers: followers ?? account.followers,
      followingCount: following,
      averageLikes: avgLikes,
      averageComments: avgComments,
      averageViews: avgViews,
      engagementRate,
      postsAnalyzed: posts.length,
      recentPosts,
      source: "APIFY_PUBLIC_DATA",
    },
  });
  await prisma.socialAccount.update({
    where: { id: account.id },
    data: { followers: followers ?? account.followers, following, source: "PUBLIC_DATA_PROVIDER" },
  });
  return snapshot;
}
