import Image from "next/image";
import type { MediaDTO } from "@/server/public-data";
import type { AppLocale } from "@/lib/i18n";

export function MediaImage({
  media,
  locale,
  className,
  sizes = "100vw",
  priority,
  fill = true,
  decorative,
}: {
  media: MediaDTO;
  locale: AppLocale;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  decorative?: boolean;
}) {
  const alt = decorative ? "" : (locale === "bn" ? media.altBn || media.altEn : media.altEn || media.altBn) ?? "";
  if (fill) return <Image src={media.url} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  return (
    <Image src={media.url} alt={alt} width={media.width ?? 800} height={media.height ?? 600} sizes={sizes} priority={priority} className={className} />
  );
}
