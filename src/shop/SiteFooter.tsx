import { Link } from '../site/Link';
import { SHAPES, SHAPE_TITLES } from './productCatalog';
import { buildShopHref } from './shopQuery';
import { BRAND_NAME, WHATSAPP_PHONE } from './siteConfig';
import { WhatsAppLink } from './WhatsAppLink';
import { GENERAL_MESSAGE } from './whatsapp';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-columns">
        <div className="footer-brand">{BRAND_NAME}</div>
        <nav className="footer-column" aria-label="Каталог">
          <h2 className="footer-title">Каталог</h2>
          <Link to="/">Все кухни</Link>
          {SHAPES.map((shape) => (
            <Link key={shape} to={buildShopHref({ shape })}>
              {SHAPE_TITLES[shape]}
            </Link>
          ))}
        </nav>
        {WHATSAPP_PHONE && (
          <div className="footer-column">
            <h2 className="footer-title">Связаться</h2>
            <WhatsAppLink message={GENERAL_MESSAGE} className="footer-whatsapp">
              WhatsApp
            </WhatsAppLink>
          </div>
        )}
      </div>
      <p className="footer-copy">
        © {new Date().getFullYear()} {BRAND_NAME}
      </p>
    </footer>
  );
}
