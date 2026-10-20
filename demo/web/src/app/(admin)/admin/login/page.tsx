import type { Metadata } from 'next';
import { AdminLogin } from '@/components/admin/login';
export const metadata: Metadata = { title: 'Acceso seguro' };
export default function LoginPage() { return <AdminLogin />; }
