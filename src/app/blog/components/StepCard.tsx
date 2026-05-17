interface Props {
  position: number;
  name: string;
  text: string;
  imageUrl?: string;
}

export default function StepCard({ position, name, text, imageUrl }: Props) {
  return (
    <section className="my-8">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[color:var(--primary)] text-black text-sm font-bold">
          {position}
        </span>
        <span>{name}</span>
      </h3>
      <div className="prose dark:prose-invert max-w-none text-[color:var(--foreground)]">
        <p>{text}</p>
      </div>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`Paso ${position}: ${name}`}
          className="mt-4 rounded-lg max-w-full h-auto border border-[color:var(--border)]"
          loading="lazy"
        />
      )}
    </section>
  );
}
