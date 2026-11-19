
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { SignOutButton } from "@/components/sign-out-button";

const links = [
  { label: "OUR WORK", href: "/how-it-works" },
  { label: "FOR BRANDS", href: "/for-brands" },
  { label: "FOR CREATORS", href: "/for-creators" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="relative z-50 border-b border-white/10 bg-[#101010] text-white">
      <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-5 sm:px-8 lg:min-h-[88px] lg:px-12">

        {/* Logo */}
        <Link
          href="/"
          aria-label="Brand Studio home"
          className="group flex shrink-0 flex-col"
        >
          <span className="whitespace-nowrap text-[19px] font-black tracking-[-0.08em] sm:text-2xl">
            BRAND<span className="font-light text-neutral-500">/</span>STUDIO
          </span>

          <span className="mt-0.5 hidden text-[8px] uppercase tracking-[0.28em] text-neutral-500 sm:block">
            Creator network
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-7 lg:flex xl:gap-10"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative py-2 text-[10px] font-medium tracking-[0.18em] text-neutral-400 transition-colors duration-300 hover:text-white after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-6 lg:flex">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-[10px] font-medium tracking-[0.16em] text-neutral-300 transition hover:text-white"
              >
                DASHBOARD
              </Link>

              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-[10px] font-medium tracking-[0.16em] text-neutral-300 transition hover:text-white"
              >
                LOG IN
              </Link>

              <Link
                href="/sign-up"
                className="group inline-flex min-h-11 items-center gap-3 bg-white px-5 text-[10px] font-semibold tracking-[0.14em] text-black transition-colors duration-300 hover:bg-neutral-200"
              >
                GET STARTED

                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Actions */}
        <div className="flex items-center gap-2 lg:hidden">
          {!user && (
            <Link
              href="/sign-up"
              className="group inline-flex min-h-10 items-center gap-2 bg-white px-3.5 text-[9px] font-semibold tracking-[0.1em] text-black transition hover:bg-neutral-200 sm:px-5 sm:text-[10px]"
            >
              GET STARTED

              <ArrowUpRight
                size={13}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          )}

          {/* Mobile Navigation */}
          <details className="group relative">
            <summary
              aria-label="Open navigation menu"
              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center border border-white/15 text-white transition hover:bg-white/10 [&::-webkit-details-marker]:hidden"
            >
              <Menu size={20} strokeWidth={1.6} />
            </summary>

            {/* Dropdown */}
            <div className="absolute right-0 top-[calc(100%+16px)] w-[min(88vw,340px)] border border-white/10 bg-[#171717] p-5 shadow-2xl shadow-black/40 sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-neutral-500">
                  Navigation
                </p>

                <span className="text-[9px] tracking-widest text-neutral-600">
                  MENU / 01
                </span>
              </div>

              <nav aria-label="Mobile navigation" className="flex flex-col">
                {links.map((link, index) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex min-h-14 items-center justify-between border-b border-white/10 text-[11px] font-medium tracking-[0.16em] text-neutral-300 transition hover:text-white"
                  >
                    <span>{link.label}</span>

                    <span className="text-[9px] text-neutral-600">
                      0{index + 1}
                    </span>
                  </Link>
                ))}
              </nav>

              <div className="mt-6 flex flex-col gap-4">
                {user ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex min-h-11 items-center justify-between bg-white px-4 text-[10px] font-semibold tracking-[0.15em] text-black transition hover:bg-neutral-200"
                    >
                      GO TO DASHBOARD
                      <ArrowUpRight size={15} />
                    </Link>

                    <div className="text-[10px] text-neutral-400">
                      <SignOutButton />
                    </div>
                  </>
                ) : (
                  <Link
                    href="/sign-in"
                    className="flex min-h-11 items-center justify-between border border-white/15 px-4 text-[10px] font-medium tracking-[0.15em] text-white transition hover:bg-white/5"
                  >
                    LOG IN
                    <ArrowUpRight size={15} />
                  </Link>
                )}
              </div>

              <p className="mt-7 text-[8px] uppercase tracking-[0.2em] text-neutral-600">
                Built for meaningful collaborations.
              </p>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
