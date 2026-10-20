import Image from "next/image";
import { ProductVisual } from "@/components/visuals/product-visual";
import { isPlaceholderImage } from "@/lib/visuals";

export type CategoryEntry = { slug: string; name: string; count: number; description: string | null; image: string };

/** Imagen real de la categoría o, si es un placeholder del seed, la ilustración generada. */
export function CategoryThumb({ entry, sizes }: { entry: CategoryEntry; sizes: string }) {
  if (!isPlaceholderImage(entry.image)) return <Image src={entry.image} alt="" fill sizes={sizes} className="object-cover" />;
  return <ProductVisual name={entry.name} categorySlug={entry.slug} categoryName={entry.name} className="absolute inset-0" />;
}
