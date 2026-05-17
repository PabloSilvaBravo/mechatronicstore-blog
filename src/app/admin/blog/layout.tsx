import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin/blog", label: "📊 Dashboard" },
  { href: "/admin/blog/queue", label: "⏳ Queue" },
  { href: "/admin/blog/tutorials", label: "📚 Tutoriales" },
  { href: "/admin/blog/sources", label: "📰 Sources" },
  { href: "/admin/blog/rejected", label: "❌ Rejected" },
];

export default function AdminBlogLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 border-b md:border-b-0 md:border-r border-[color:var(--border)] p-4 bg-[color:var(--background)]">
        <Link href="/admin/blog" className="block mb-6 font-bold text-sm uppercase tracking-wider">
          Admin · Blog
        </Link>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="text-sm px-3 py-2 rounded hover:bg-[color:var(--border)] whitespace-nowrap"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 text-xs text-[color:var(--muted)]">
          <Link href="/blog" className="hover:underline">← Volver al blog</Link>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
