import type { MetadataRoute } from "next";
export default function sitemap():MetadataRoute.Sitemap{
 const base=(process.env.BETTER_AUTH_URL||"http://localhost:3000").replace(/\/$/,"");
 const paths=["","/about","/for-brands","/for-creators","/how-it-works","/managed-campaigns","/marketplace","/pricing","/faq","/contact"];
 return paths.map(path=>({url:`${base}${path}`,lastModified:new Date(),changeFrequency:"monthly",priority:path===""?1:0.7}));
}