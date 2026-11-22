import Link from "next/link";
import { ArrowRight } from "lucide-react";

const groups = [
  { title: "Explore", links: [["How it works","/how-it-works"],["For brands","/for-brands"],["For creators","/for-creators"],["Managed campaigns","/managed-campaigns"],["Discover talent","/discover"]] },
  { title: "Your account", links: [["Log in","/sign-in"],["Create account","/sign-up"],["Pricing","/pricing"],["FAQ","/faq"]] },
  { title: "Company", links: [["About Buildin","/about"],["Contact","/contact"],["Privacy","/privacy"],["Terms","/terms"]] },
];
export function FooterSection() {
  return <footer className="border-t border-slate-200 bg-white px-5 py-14 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-10 border-b border-slate-200 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div><Link href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white">b.</span><span className="text-xl font-bold tracking-[-.055em]">buildin</span></Link><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">A clearer way for brands and creators to build meaningful partnerships.</p><Link href="/contact" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">Talk to our team <ArrowRight size={15}/></Link></div>
        {groups.map(group=><div key={group.title}><h2 className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">{group.title}</h2><div className="mt-5 flex flex-col gap-3">{group.links.map(([label,href])=><Link key={href} href={href} className="text-sm text-slate-600 transition hover:text-blue-700">{label}</Link>)}</div></div>)}
      </div>
      <div className="flex flex-col justify-between gap-3 pt-6 text-xs text-slate-400 sm:flex-row"><p>© {new Date().getFullYear()} Buildin. All rights reserved.</p><p>Better partnerships. Clearer work.</p></div>
    </div>
  </footer>;
}
