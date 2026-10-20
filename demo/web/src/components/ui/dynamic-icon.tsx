import {
  Building2,
  ClipboardList,
  Eye,
  FileText,
  Hammer,
  Lightbulb,
  MapPin,
  Package,
  FileCheck,
  Handshake,
  Headset,
  Leaf,
  type LucideIcon,
  type LucideProps,
  PackageCheck,
  Recycle,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";

/** Íconos permitidos para los bloques `features` del CMS (nombre Lucide en kebab-case). */
const ICONS: Record<string, LucideIcon> = {
  "package-check": PackageCheck,
  "file-check": FileCheck,
  truck: Truck,
  "shield-check": ShieldCheck,
  wrench: Wrench,
  recycle: Recycle,
  handshake: Handshake,
  headset: Headset,
  leaf: Leaf,
  "building-2": Building2,
  "file-text": FileText,
  eye: Eye,
  lightbulb: Lightbulb,
  "map-pin": MapPin,
  "clipboard-list": ClipboardList,
  package: Package,
  hammer: Hammer,
};

export function DynamicIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}
