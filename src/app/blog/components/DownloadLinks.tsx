import type { TutorialPublished } from "@/lib/db/queries";

interface Props {
  githubUrl: string | null;
  downloads: TutorialPublished["download_urls"];
}

export default function DownloadLinks({ githubUrl, downloads }: Props) {
  if (!githubUrl && downloads.length === 0) return null;

  return (
    <div className="my-8 rounded-lg border border-[color:var(--border)] p-5 bg-[color:var(--background)]">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span>🔗</span>
        <span>Descargas</span>
      </h2>
      <ul className="space-y-2">
        {githubUrl && (
          <li>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener"
              className="text-[color:var(--primary)] hover:underline font-medium"
            >
              💻 Código completo en GitHub
            </a>
          </li>
        )}
        {downloads.map((d, i) => (
          <li key={i}>
            <a
              href={d.url}
              target="_blank"
              rel="noopener"
              className="text-[color:var(--primary)] hover:underline font-medium"
            >
              📦 {d.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
