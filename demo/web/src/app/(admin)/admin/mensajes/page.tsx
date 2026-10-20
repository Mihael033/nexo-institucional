import type { Metadata } from 'next';
import { AdminMessages } from '@/components/admin/messages';
export const metadata: Metadata = { title: 'Mensajes' };
export default function MessagesPage() { return <AdminMessages />; }
