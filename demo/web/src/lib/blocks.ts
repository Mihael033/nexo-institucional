import type { BlockDataMap, BlockType, Page } from "@/lib/api/types";

/** Primer bloque de un tipo dentro de una página del CMS (o null). */
export function findBlock<T extends BlockType>(page: Page | null, type: T): BlockDataMap[T] | null {
  const block = page?.blocks.find((b) => b.type === type);
  return block ? (block.data as BlockDataMap[T]) : null;
}
