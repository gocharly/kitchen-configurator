import type { ReactNode } from 'react';
import { AnnouncementBar } from './AnnouncementBar';
import { ShopHeader } from './ShopHeader';
import { SiteFooter } from './SiteFooter';

export function ShopLayout({ children, isCompact = false }: { children: ReactNode; isCompact?: boolean }) {
  return (
    <div className="shop">
      <AnnouncementBar />
      <div className="shop-frame">
        <ShopHeader isCompact={isCompact} />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
