interface Props {
  sourceUrl: string;
  sourceName?: string;
}

export default function AttributionFooter({ sourceUrl, sourceName }: Props) {
  return (
    <div className="my-8 pt-6 border-t border-[color:var(--border)] text-sm text-[color:var(--muted)]">
      <p>
        Tutorial adaptado al español chileno desde el original en{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener"
          className="text-[color:var(--primary)] hover:underline"
        >
          {sourceName || "fuente original"}
        </a>
        . Hicimos reescritura editorial + adaptación de precios CLP + linkeo con
        productos disponibles en MechatronicStore.
      </p>
    </div>
  );
}
