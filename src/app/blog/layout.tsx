import Link from "next/link";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-[color:var(--border)]">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link
            href="/blog"
            className="font-bold text-lg hover:opacity-80"
          >
            MechatronicStore Blog
          </Link>
          <nav className="text-sm text-[color:var(--muted)]">
            <Link href="https://www.mechatronicstore.cl" className="hover:underline">
              ← Tienda
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">{children}</main>

      <footer className="border-t border-[color:var(--border)] mt-24">
        <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-[color:var(--muted)]">
          © 2026 MechatronicStore · Blog de tutoriales · v0.1.0 dummy
        </div>
      </footer>
    </>
  );
}
