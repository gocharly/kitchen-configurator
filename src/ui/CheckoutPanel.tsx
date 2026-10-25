import { useState } from 'react';
import { calculateEstimate, listPlacedModules, type Kitchen } from '../domain/kitchen';
import { encodeKitchenLink } from '../domain/kitchenLink';
import { OrderApiError, createOrder } from '../order/orderApi';
import { formatPrice } from './formatPrice';
import { KitchenPreview } from './KitchenPreview';
import { TextField } from './TextField';

const MIN_PHONE_DIGITS = 10;
const MAX_NAME_LENGTH = 80;
const MAX_COMMENT_LENGTH = 500;

const ERROR_TEXTS: Record<string, string> = {
  invalid_contact: 'Проверьте имя и телефон.',
  too_many_orders: 'Слишком много заказов с этого адреса. Попробуйте позже.',
  empty_kitchen: 'Добавьте в кухню хотя бы один модуль.',
};
const FALLBACK_ERROR_TEXT = 'Не удалось отправить заказ. Попробуйте ещё раз.';

interface CheckoutPanelProps {
  kitchen: Kitchen;
}

export function CheckoutPanel({ kitchen }: CheckoutPanelProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const moduleCount = listPlacedModules(kitchen).length;
  const hasModules = moduleCount > 0;
  const hasContact = name.trim().length > 0 && phone.replace(/\D/g, '').length >= MIN_PHONE_DIGITS;

  const submitOrder = async () => {
    setIsSending(true);
    setErrorText(null);
    try {
      const created = await createOrder({ kitchen: encodeKitchenLink(kitchen), name, phone, comment });
      window.location.assign(`/order/${created.token}`);
    } catch (error) {
      console.error('Order was not created', error);
      const code = error instanceof OrderApiError ? error.code : '';
      setErrorText(ERROR_TEXTS[code] ?? FALLBACK_ERROR_TEXT);
      setIsSending(false);
    }
  };

  return (
    <div className="panel-stack">
      <div className="order-summary">
        <KitchenPreview kitchen={kitchen} />
        <div className="order-summary-text">
          <span className="module-title">{formatPrice(calculateEstimate(kitchen).total)}</span>
          <span className="module-caption">Модулей: {moduleCount}</span>
        </div>
      </div>
      <TextField label="Имя" value={name} onChange={setName} maxLength={MAX_NAME_LENGTH} />
      <TextField label="Телефон" value={phone} onChange={setPhone} type="tel" />
      <TextField label="Комментарий" value={comment} onChange={setComment} multiline maxLength={MAX_COMMENT_LENGTH} />
      <button
        type="button"
        className="catalog-button submit-order"
        disabled={!hasModules || !hasContact || isSending}
        onClick={submitOrder}
      >
        Отправить заказ
      </button>
      {errorText && (
        <p className="form-error" role="alert">
          {errorText}
        </p>
      )}
    </div>
  );
}
