import { useEffect, useState } from 'react';
import { Link } from '../site/Link';
import { navigateTo, replaceTo } from '../site/routes';
import { buildShopHref } from './shopQuery';
import { BRAND_NAME } from './siteConfig';
import { useShopQuery } from './useShopQuery';
import { ChatIcon, WhatsAppLink } from './WhatsAppLink';
import { GENERAL_MESSAGE } from './whatsapp';

export function ShopHeader({ isCompact = false }: { isCompact?: boolean }) {
  const query = useShopQuery();
  const [text, setText] = useState(query.query);

  useEffect(() => setText(query.query), [query.query]);

  const changeText = (value: string) => {
    setText(value);
    const href = buildShopHref({ ...query, query: value });
    if (window.location.pathname === '/') replaceTo(href);
    else navigateTo(href);
  };

  return (
    <header className={isCompact ? 'shop-header is-compact' : 'shop-header'}>
      <Link to="/" className="site-brand">
        {BRAND_NAME}
      </Link>
      <input
        className="search-field"
        type="search"
        value={text}
        placeholder="Поиск по названию или размеру"
        aria-label="Поиск"
        onChange={(event) => changeText(event.target.value)}
      />
      <WhatsAppLink message={GENERAL_MESSAGE} className="wa-button header-contact">
        <ChatIcon />
        <span>Написать</span>
      </WhatsAppLink>
    </header>
  );
}
