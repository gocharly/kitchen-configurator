export type OrderStatusId = 'new' | 'awaiting_payment' | 'paid' | 'canceled';

export interface PublicOrderLine {
  sku: string;
  title: string;
  width: number;
  price: number;
}

export interface PublicOrder {
  number: number;
  status: OrderStatusId;
  total: number;
  lines: PublicOrderLine[];
  countertopPrice: number;
  kitchenToken: string;
  customerName: string | null;
  hasQr: boolean;
  createdAt: string;
}
