import type { Metadata } from "next";
import { AdminShell } from '@/components/admin/shell';

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Nexo" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <AdminShell>{children}</AdminShell>;
}
