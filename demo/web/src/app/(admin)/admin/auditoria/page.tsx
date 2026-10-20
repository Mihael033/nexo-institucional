import type { Metadata } from 'next';
import { AdminAudit } from '@/components/admin/audit';
export const metadata: Metadata = { title: 'Bitácora' };
export default function AuditPage() { return <AdminAudit />; }
