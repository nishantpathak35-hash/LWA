// Domain: payments
import { queryAll, queryGet, queryRun } from '../../db.js';
import { AuthService } from '../../../../src/modules/core/services/AuthService';
import { bulkApprovePayments } from './other.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

export async function approvePaymentWithChain(paymentId, session) {
  requireAuth(session);
  return bulkApprovePayments([paymentId], {}, session);
}
