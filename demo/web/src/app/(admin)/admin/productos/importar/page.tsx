import type { Metadata } from 'next';
import { AdminImportProducts } from '@/components/admin/import-products';
export const metadata: Metadata = { title: 'Importar catálogo' };
export default function ImportPage() { return <AdminImportProducts />; }
