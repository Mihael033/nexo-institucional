import { PageHero } from "@/components/layout/page-hero";
import { HeroCtas } from "./hero-ctas";
import type { Block } from "@/lib/api/types";
import { CtaBlock } from "./cta-block";
import { FeaturesGrid } from "./features-grid";
import { FeaturesSlides } from "./features-slides";
import { GalleryBlock, ImageBlock } from "./media";
import { RichText } from "./rich-text";
import { StatsBand } from "./stats-band";
import { Timeline } from "./timeline";

/**
 * Renderiza los bloques del CMS en orden. Tipos desconocidos se ignoran (contrato §3).
 * `contactInfo` lo resuelve la página de contacto con los datos de GET /site.
 */
export function BlockRenderer({ blocks, features = "slides" }: { blocks: Block[]; features?: "slides" | "grid" }) {
  return blocks.map((block) => {
    switch (block.type) {
      case "hero":
        return (
          <PageHero
            key={block.id}
            eyebrow={block.data.eyebrow}
            title={block.data.title}
            subtitle={block.data.subtitle}
            image={block.data.image}
          >
            {(block.data.primaryCta || block.data.secondaryCta) && (
              <HeroCtas primary={block.data.primaryCta} secondary={block.data.secondaryCta} />
            )}
          </PageHero>
        );
      case "richText":
        return <RichText key={block.id} data={block.data} />;
      case "features":
        return features === "grid" ? (
          <FeaturesGrid key={block.id} data={block.data} />
        ) : (
          <FeaturesSlides key={block.id} data={block.data} />
        );
      case "stats":
        return <StatsBand key={block.id} data={block.data} />;
      case "timeline":
        return <Timeline key={block.id} data={block.data} />;
      case "image":
        return <ImageBlock key={block.id} data={block.data} />;
      case "gallery":
        return <GalleryBlock key={block.id} data={block.data} />;
      case "cta":
        return <CtaBlock key={block.id} data={block.data} />;
      default:
        return null;
    }
  });
}
