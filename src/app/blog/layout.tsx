import Link from "next/link";
import BlogHeader from "./components/BlogHeader";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BlogHeader />

      <main className="mx-auto max-w-5xl px-4 py-12">{children}</main>

      <footer
        className="border-t mt-24"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="mx-auto max-w-5xl px-4 py-6 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          © 2026 MechatronicStore · Tutoriales de electrónica, robótica y DIY ·{" "}
          <Link
            href="https://www.mechatronicstore.cl"
            className="hover:underline"
          >
            Tienda online
          </Link>
        </div>
      </footer>
    </>
  );
}
