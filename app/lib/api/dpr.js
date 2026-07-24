import { DPRService } from '../../../src/modules/operations/services/DPRService';

export async function submitDPR(dpr, session) {
  return await DPRService.submitDPR(dpr, session);
}

export async function listDPRs(filters = {}, session) {
  return await DPRService.listDPRs(filters);
}

export async function getDPR(id, session) {
  return await DPRService.getDPR(id);
}

export async function updateDPR(id, updates, session) {
  return await DPRService.updateDPR(id, updates, session);
}

export async function deleteDPR(id, session) {
  const targetId = typeof id === 'object' && id !== null ? (id.id || id.dprId) : id;
  return await DPRService.deleteDPR(targetId, session);
}

export async function listTemplates(session) {
  return await DPRService.listTemplates();
}

export async function createTemplate(template, session) {
  return await DPRService.createTemplate(template);
}

export async function updateTemplate(payload, session) {
  const { id, updates } = payload;
  return await DPRService.updateTemplate(id, updates, session);
}

export async function deleteTemplate(payload, session) {
  const { id } = payload;
  return await DPRService.deleteTemplate(id, session);
}

export async function getDPRSettings(payload, session) {
  return await DPRService.getDPRSettings();
}

export async function saveDPRSettings(payload, session) {
  return await DPRService.saveDPRSettings(payload);
}
