import type { Metadata } from 'next';
import { AdminUsers } from '@/components/admin/users';
export const metadata: Metadata = { title: 'Usuarios y roles' };
export default function UsersPage() { return <AdminUsers />; }
