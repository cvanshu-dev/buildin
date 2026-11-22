import Link from "next/link";
export default function NotFound() { return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center text-slate-900"><p className="text-sm text-blue-700">404</p><h1 className="mt-3 text-4xl font-semibold">Page not found</h1><Link href="/" className="mt-6 text-blue-700 underline">Return home</Link></main>; }
