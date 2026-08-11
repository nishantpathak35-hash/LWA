import { InvoiceService } from '../../../src/modules/invoices/services/InvoiceService.ts';
import { VendorPortalAuthService } from '../../../src/modules/vendor-portal/services/VendorPortalAuthService.ts';
import { VendorOnboardingService } from '../../../src/modules/vendors/services/VendorOnboardingService.ts';

export async function vendorLogin(email, password, meta = {}) {
  return VendorPortalAuthService.loginVendor(email, password, meta);
}

export async function getVendorPortalSession(token) {
  return VendorPortalAuthService.getVendorSession(token);
}

export async function getVendorPortalPOs(vendorSession) {
  return InvoiceService.getVendorPortalPOs(vendorSession);
}

export async function getVendorPortalPO(poNo, vendorSession) {
  return InvoiceService.getVendorPortalPO(poNo, vendorSession);
}

export async function submitVendorInvoice(payload, vendorSession) {
  return InvoiceService.submitVendorInvoice(payload, vendorSession);
}

export async function getVendorPortalInvoices(vendorSession) {
  return InvoiceService.getVendorPortalInvoices(vendorSession);
}

export async function getVendorPortalInvoice(invoiceId, vendorSession) {
  return InvoiceService.getInvoice(invoiceId, vendorSession);
}

export async function listInvoices(filters = {}, session) {
  return InvoiceService.listInvoices(filters, session);
}

export async function getInvoice(invoiceId, session) {
  return InvoiceService.getInvoice(invoiceId, session);
}

export async function uploadInternalInvoice(payload, session) {
  return InvoiceService.submitInternalInvoice(payload, session);
}

export async function updateInvoiceStatus(invoiceId, status, rejectionReason, session) {
  return InvoiceService.updateInvoiceStatus(invoiceId, status, rejectionReason, session);
}

export async function getPOInvoices(poNo, session) {
  return InvoiceService.getPOInvoices(poNo, session);
}

export async function inviteVendorPortalUserAdmin(payload, session) {
  return VendorPortalAuthService.inviteVendorUser(payload);
}

// ── Vendor Onboarding RPC Gateway ────────────────────────────────────────────
export async function createVendorInvitation(email, session) {
  return VendorOnboardingService.createInvitation(email, session);
}

export async function resendVendorInvitation(invitationId, session) {
  return VendorOnboardingService.resendInvitation(invitationId, session);
}

export async function getVendorOnboardingByToken(token) {
  return VendorOnboardingService.getOnboardingByToken(token);
}

export async function submitVendorOnboarding(payload) {
  return VendorOnboardingService.submitOnboarding(payload);
}

export async function listPendingOnboardings(session) {
  return VendorOnboardingService.listPendingOnboardings(session);
}

export async function getOnboardingDetails(submissionId, session) {
  return VendorOnboardingService.getOnboardingDetails(submissionId, session);
}

export async function approveVendorOnboarding(submissionId, grantPortalAccess, session) {
  return VendorOnboardingService.approveOnboarding(submissionId, grantPortalAccess, session);
}

export async function rejectVendorOnboarding(submissionId, reason, session) {
  return VendorOnboardingService.rejectOnboarding(submissionId, reason, session);
}

export async function toggleVendorPortalAccess(vendorCode, enable, session) {
  return VendorOnboardingService.togglePortalAccess(vendorCode, enable, session);
}

export async function deleteInvoice(invoiceId, session) {
  return InvoiceService.deleteInvoice(invoiceId, session);
}

