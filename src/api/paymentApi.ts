import { authenticatedRequest } from '../api';
import type { PaymentQuoteResponse, PaymentResponse } from '../types';

export const getPaymentQuote = (orderId: string, couponCode?: string) =>
  authenticatedRequest<PaymentQuoteResponse>(`/orders/${encodeURIComponent(orderId)}/payment-quote`, {
    method: 'POST', body: JSON.stringify({ couponCode: couponCode?.trim() || null }),
  });

export const initiatePayment = (orderId: string, provider: string, couponCode?: string) =>
  authenticatedRequest<PaymentResponse>(`/orders/${encodeURIComponent(orderId)}/payments`, {
    method: 'POST', body: JSON.stringify({ provider, couponCode: couponCode?.trim() || null }),
  });

export const verifyRazorpayPayment = (
  paymentId: string,
  result: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) =>
  authenticatedRequest<PaymentResponse>(`/payments/${encodeURIComponent(paymentId)}/razorpay/verify`, {
    method: 'POST', body: JSON.stringify(result),
  });
