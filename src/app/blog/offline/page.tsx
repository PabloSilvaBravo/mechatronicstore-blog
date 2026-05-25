export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <h1 className="text-3xl font-bold" style={{ color: "var(--text)", fontFamily: "Georgia, serif" }}>
        Sin conexión
      </h1>
      <p className="mt-4" style={{ color: "var(--text-muted)" }}>
        No tenés conexión a internet. Volvé a intentar cuando recuperes señal.
      </p>
    </main>
  );
}
