// Domain: number-series
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { NumberSeriesService } from '../../../src/modules/core/services/NumberSeriesService';
import { logAudit } from './core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

function requireAdmin(session) {
  AuthService.requireAdminConsole(session);
}

export async function getNumberSeriesConfig(moduleType, session) {
  requireAuth(session);
  const config = await NumberSeriesService.getConfig(moduleType || 'purchase_order');
  if (!config) return null;
  return {
    ...config,
    preview: NumberSeriesService.preview(config)
  };
}

export async function getAllNumberSeriesConfigs(session) {
  requireAuth(session);
  const configs = await NumberSeriesService.getAllConfigs();
  return configs.map(c => ({
    ...c,
    preview: NumberSeriesService.preview(c)
  }));
}

export async function updateNumberSeriesConfig(moduleType, payload, session) {
  requireAdmin(session);
  const result = await NumberSeriesService.updateConfig(moduleType, payload);
  await logAudit(session.email, 'Update Number Series', `Updated number series for ${moduleType}: prefix="${payload.prefix || ''}"`, 'System');
  return result;
}

export async function previewNumberSeries(payload, session) {
  requireAuth(session);
  return { preview: NumberSeriesService.preview(payload) };
}

export async function getNextSeriesNumber(moduleType, session) {
  requireAuth(session);
  const number = await NumberSeriesService.getNextNumber(moduleType || 'purchase_order', session.email);
  return { number };
}
