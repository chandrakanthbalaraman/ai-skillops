import { Nav } from '@/components/nav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
