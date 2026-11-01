import Image from "next/image";

type Scene = "entrance" | "stage" | "tables" | "lighting" | "florals" | "signature-moment";

function scenarioFor(city: string) {
  if (/pune/i.test(city)) return "pune-birthday";
  if (/thane/i.test(city)) return "thane-community";
  return "jaipur-wedding";
}

export function CelebrationVisual({
  city,
  scene,
  title,
  caption,
}: {
  city: string;
  scene: Scene;
  title: string;
  caption: string;
}) {
  const scenario = scenarioFor(city);

  return (
    <figure className="group relative isolate aspect-video w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-secondary shadow-lg shadow-primary/5">
      <Image
        src={`/demo/${scenario}/${scene}.svg`}
        alt={`${title} celebration inspiration`}
        fill
        sizes="(max-width: 1024px) 100vw, 40vw"
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transition-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden="true" />
      <figcaption className="absolute inset-x-0 bottom-0 min-w-0 p-3 text-white sm:p-5">
        <span className="inline-flex max-w-full truncate rounded-full border border-white/30 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm">
          {city} · celebration inspiration
        </span>
        <span className="mt-2 line-clamp-2 block font-heading text-lg font-semibold sm:text-2xl">{title}</span>
        <span className="mt-1 line-clamp-2 block max-w-sm text-xs leading-relaxed text-white/85 sm:text-sm">{caption}</span>
      </figcaption>
    </figure>
  );
}
