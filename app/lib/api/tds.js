// Domain: tds
import { AuthService } from '../../../src/modules/core/services/AuthService';
import { TDSService } from '../../../src/modules/core/services/TDSService';
import { GlobalConfigService } from '../../../src/modules/core/services/GlobalConfigService';
import { logAudit } from './core.js';

function requireAuth(session) {
  AuthService.requireAuth(session);
}

function requireAdmin(session) {
  AuthService.requireAdminConsole(session);
}

export async function getTDSSections(session) {
  requireAuth(session);
  return TDSService.getActiveSections();
}

export async function getAllTDSSections(session) {
  requireAuth(session);
  return TDSService.getAllSections();
}

export async function createTDSSection(payload, session) {
  requireAdmin(session);
  const result = await TDSService.createSection(payload);
  await logAudit(session.email, 'Create TDS Section', `Created TDS section "${payload.section_code}" (${payload.rate}%)`, 'System');
  return result;
}

export async function updateTDSSection(sectionId, payload, session) {
  requireAdmin(session);
  const result = await TDSService.updateSection(sectionId, payload);
  await logAudit(session.email, 'Update TDS Section', `Updated TDS section #${sectionId}`, 'System');
  return result;
}

export async function deleteTDSSection(sectionId, session) {
  requireAdmin(session);
  const result = await TDSService.deleteSection(sectionId);
  await logAudit(session.email, 'Delete TDS Section', `Archived TDS section #${sectionId}`, 'System');
  return result;
}

export async function setDefaultTDS(sectionId, session) {
  requireAdmin(session);
  const result = await TDSService.setDefault(sectionId);
  await logAudit(session.email, 'Set Default TDS', `Set TDS section #${sectionId} as default`, 'System');
  return result;
}

export async function toggleTDSStatus(sectionId, session) {
  requireAdmin(session);
  const result = await TDSService.toggleStatus(sectionId);
  await logAudit(session.email, 'Toggle TDS Status', `Toggled TDS section #${sectionId} active=${result.is_active}`, 'System');
  return result;
}

export async function getDefaultTDSConfig(session) {
  requireAuth(session);
  const defaultSection = await GlobalConfigService.getDefaultTDS();
  return defaultSection;
}

export async function setDefaultTDSConfig(sectionCode, session) {
  requireAdmin(session);
  const result = await GlobalConfigService.setDefaultTDS(sectionCode);
  await logAudit(session.email, 'Set Global Default TDS', `Set global default TDS to "${sectionCode}"`, 'System');
  return result;
}
