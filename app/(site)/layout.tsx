import { SiteFooter, SiteNav } from '@/components/site';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="st">
      <SiteNav />
      <main className="st-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
