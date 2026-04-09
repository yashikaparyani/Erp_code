import { redirect } from 'next/navigation';

export default function PaymentReceiptsRedirect() {
  redirect('/finance/payment-receipts');
}
