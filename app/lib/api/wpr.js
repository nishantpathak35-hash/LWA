import { WPRService } from '../../../src/modules/operations/services/WPRService';

export async function listSchedules(payload, session) {
  const { project } = payload || {};
  return await WPRService.listSchedules(project);
}

export async function saveSchedule(payload, session) {
  return await WPRService.saveSchedule(payload);
}

export async function getWPRAggregation(payload, session) {
  const { project, weekStart, weekEnd } = payload;
  if (!project || !weekStart || !weekEnd) {
    throw new Error("Missing required parameters project, weekStart, weekEnd");
  }
  return await WPRService.getWPRAggregation(project, weekStart, weekEnd);
}

export async function createWPRReport(payload, session) {
  return await WPRService.createWPRReport(payload, session);
}

export async function listWPRReports(payload, session) {
  const { filters = {} } = payload || {};
  return await WPRService.listWPRReports(filters);
}

export async function getWPRReport(payload, session) {
  const { id } = payload;
  return await WPRService.getWPRReport(id);
}

export async function deleteWPRReport(payload, session) {
  const { id } = payload;
  return await WPRService.deleteWPRReport(id, session);
}
