import { useEffect, useState } from 'react';
import type { OrderStatusId, PublicOrder } from '../domain/publicOrder';
import { formatPrice } from '../ui/formatPrice';
import { OrderApiError, buildQrUrl, fetchOrder } from './orderApi';

const POLL_INTERVAL_MS = 10_000;
const FINAL_STATUSES: OrderStatusId[] = ['paid', 'canceled'];

const STATUS_TEXTS: Record<OrderStatusId, string> = {
  new: 'Заказ принят',
  awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  canceled: 'Отменён',
};

const STATUS_HINTS: Record<OrderStatusId, string> = {
  new: 'Менеджер свяжется с вами и пришлёт QR для оплаты.',
  awaiting_payment: 'Отсканируйте QR в приложении банка. После оплаты статус изменится сам.',
  paid: 'Оплата получена. Спасибо за заказ.',
  canceled: 'Заказ отменён. Если это ошибка, свяжитесь с менеджером.',
};

type LoadState = { kind: 'loading' } | { kind: 'missing' } | { kind: 'failed' } | { kind: 'ready'; order: PublicOrder };

function useOrder(token: string): LoadState {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let isActive = true;
    let timer: number | undefined;
    const load = async () => {
      try {
        const order = await fetchOrder(token);
        if (!isActive) return;
        setState({ kind: 'ready', order });
        if (!FINAL_STATUSES.includes(order.status)) timer = window.setTimeout(load, POLL_INTERVAL_MS);
      } catch (error) {
        if (!isActive) return;
        console.error('Order was not loaded', error);
        const isMissing = error instanceof OrderApiError && error.status === 404;
        setState(isMissing ? { kind: 'missing' } : { kind: 'failed' });
        if (!isMissing) timer = window.setTimeout(load, POLL_INTERVAL_MS);
      }
    };
    load();
    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [token]);

  return state;
}

function OrderDetails({ token, order }: { token: string; order: PublicOrder }) {
  return (
    <>
      <h1 className="order-title">Заказ №{order.number}</h1>
      <p className="order-status">{STATUS_TEXTS[order.status]}</p>
      <p className="order-hint">{STATUS_HINTS[order.status]}</p>
      {order.status === 'awaiting_payment' && order.hasQr && (
        <div className="order-payment">
          <p className="order-amount">Сумма к оплате {formatPrice(order.total)}</p>
          <img className="order-qr" src={buildQrUrl(token, order.createdAt)} alt="QR для оплаты" />
        </div>
      )}
      <h2>Состав</h2>
      <ul className="estimate-lines">
        {order.lines.map((line, index) => (
          <li key={index} className="estimate-line">
            <span>{line.width > 0 ? `${line.title} ${line.width}` : line.title}</span>
            <span className="estimate-price">{formatPrice(line.price)}</span>
          </li>
        ))}
        {order.countertopPrice > 0 && (
          <li className="estimate-line">
            <span>Столешница</span>
            <span className="estimate-price">{formatPrice(order.countertopPrice)}</span>
          </li>
        )}
      </ul>
      <div className="estimate-total">
        <span>Итого</span>
        <span className="estimate-price">{formatPrice(order.total)}</span>
      </div>
      {order.kitchenToken && (
        <a className="catalog-button order-link" href={`/#k=${order.kitchenToken}`}>
          Открыть кухню в конструкторе
        </a>
      )}
    </>
  );
}

export function OrderPage({ token }: { token: string }) {
  const state = useOrder(token);
  return (
    <main className="order-page">
      <div className="order-card">
        {state.kind === 'loading' && <p className="order-hint">Загружаем заказ</p>}
        {state.kind === 'missing' && <h1 className="order-title">Заказ не найден</h1>}
        {state.kind === 'failed' && <p className="order-hint">Не удалось загрузить заказ. Пробуем снова.</p>}
        {state.kind === 'ready' && <OrderDetails token={token} order={state.order} />}
      </div>
    </main>
  );
}
