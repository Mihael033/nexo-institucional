import type { Metadata } from 'next';
import { AdminProducts } from '@/components/admin/products';
export const metadata: Metadata = { title: 'Productos' };
export default function ProductsPage() { return <AdminProducts />; }
