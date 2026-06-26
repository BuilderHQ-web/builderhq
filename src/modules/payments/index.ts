/**
 * @module payments
 *
 * Public surface for the payments module. Anything outside this folder
 * MUST import from `@/modules/payments` (this file) — never reach into
 * `./service`, `./schema`, or `./policies` directly. ESLint enforces it.
 */

export { payments, paymentStatusEnum, paymentPurposeEnum } from "./schema";
export type { PaymentRow, PaymentInsert } from "./schema";

export {
  createUnlockCheckout,
  handleStripeEvent,
  handleWebhookRequest,
  getPaymentById,
} from "./service";
export type { CreateCheckoutResult } from "./service";

export { isStripeConfigured } from "./stripe";
