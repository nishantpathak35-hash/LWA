import { WPRRepository, IWPRReport, IWPRSchedule } from '../repositories/WPRRepository';
import { DPRRepository } from '../repositories/DPRRepository';
import { AuthService } from '../../core/services/AuthService';

export class WPRService {
  // --- Schedules ---
  static async listSchedules(project?: string): Promise<IWPRSchedule[]> {
    const list = await WPRRepository.getSchedules(project);
    return list.map(s => ({
      ...s,
      planned_progress_curve: s.planned_progress_curve ? JSON.parse(s.planned_progress_curve) : {}
    }));
  }

  static async saveSchedule(sched: any): Promise<void> {
    if (sched.planned_progress_curve && typeof sched.planned_progress_curve === 'object') {
      sched.planned_progress_curve = JSON.stringify(sched.planned_progress_curve);
    }
    await WPRRepository.saveSchedule(sched);
  }

  // --- WPR Reports ---
  static async getWPRAggregation(project: string, weekStart: string, weekEnd: string): Promise<any> {
    // 1. Get all DPR reports for project in this range
    const dprs = await DPRRepository.getReports({
      project,
      dateFrom: weekStart,
      dateTo: weekEnd
    });

    if (dprs.length === 0) {
      return {
        dprsCount: 0,
        suggestedActualProgress: 0,
        suggestedPlannedProgress: 0,
        photos: [],
        warning: "No DPRs found for this project in the selected week. Please verify the dates."
      };
    }

    // 2. Parse DPR data and aggregate actual progress
    let totalProgressSum = 0;
    let totalTasksCount = 0;
    const photos: any[] = [];

    dprs.forEach(dpr => {
      const parsedData = typeof dpr.data === 'string' ? JSON.parse(dpr.data) : (dpr.data || {});
      
      // Aggregate progress from floors
      const floors = parsedData.floors || [];
      floors.forEach((floor: any) => {
        const workDone = floor.workDone || [];
        workDone.forEach((w: any) => {
          if (w.task) {
            const prog = parseFloat(w.progress);
            if (!isNaN(prog)) {
              totalProgressSum += prog;
              totalTasksCount++;
            }
          }
        });
      });

      // Gather photos
      const dprPhotos = parsedData.photos || [];
      dprPhotos.forEach((ph: any) => {
        photos.push({
          url: ph.url,
          caption: ph.caption || '',
          floor: ph.floor || ''
        });
      });
    });

    const suggestedActualProgress = totalTasksCount > 0 ? Math.round(totalProgressSum / totalTasksCount) : 0;

    // 3. Find matching WPR Schedule milestone to compute planned progress
    const schedules = await WPRRepository.getSchedules(project);
    let suggestedPlannedProgress = 0;
    let renderImageUrl = '';

    // Find a schedule whose planned date range overlaps or matches the week
    const matchingSchedule = schedules.find(s => {
      // Very basic overlap check
      const start = s.planned_start || '';
      const end = s.planned_end || '';
      return (start <= weekEnd && end >= weekStart);
    });

    if (matchingSchedule) {
      renderImageUrl = matchingSchedule.render_image_url || '';
      const curve = matchingSchedule.planned_progress_curve ? JSON.parse(matchingSchedule.planned_progress_curve) : {};
      
      // Get planned percentage for the end of the week, or fallback to 100%
      // Assume curve is mapped by date string "YYYY-MM-DD" or similar, or just take the maximum value
      const dates = Object.keys(curve).sort();
      if (dates.length > 0) {
        // find closest date before or equal to weekEnd
        const targetDate = dates.filter(d => d <= weekEnd).pop() || dates[0];
        suggestedPlannedProgress = parseFloat(curve[targetDate]) || 0;
      } else {
        // Simple linear interpolation fallback if start/end exist
        const startMs = new Date(matchingSchedule.planned_start || '').getTime();
        const endMs = new Date(matchingSchedule.planned_end || '').getTime();
        const curMs = new Date(weekEnd).getTime();

        if (endMs > startMs && curMs > startMs) {
          const ratio = (curMs - startMs) / (endMs - startMs);
          suggestedPlannedProgress = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        }
      }
    }

    return {
      dprsCount: dprs.length,
      suggestedActualProgress,
      suggestedPlannedProgress,
      renderImageUrl,
      photos,
      dprIds: dprs.map(d => d.id)
    };
  }

  static async createWPRReport(wpr: Omit<IWPRReport, 'id' | 'created_at'>, user: any): Promise<void> {
    wpr.generated_by = user?.email || user?.name || 'System';
    wpr.variance = wpr.actual_progress - wpr.planned_progress;
    await WPRRepository.createReport(wpr);
  }

  static async listWPRReports(filters: any = {}): Promise<IWPRReport[]> {
    return await WPRRepository.getReports(filters);
  }

  static async getWPRReport(id: string | number): Promise<IWPRReport | null> {
    return await WPRRepository.getReportById(id);
  }

  static async deleteWPRReport(id: string | number, user: any): Promise<void> {
    // Auth Check
    const roles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    const isApprover = AuthService.isSuperAdmin(user?.email) || user?.is_admin || roles.some((r: string) => ['admin', 'director', 'approver', 'manager', 'finance'].includes(String(r).toLowerCase()));
    if (!isApprover) {
      throw new Error("Only an approver or admin can delete WPR reports.");
    }
    await WPRRepository.deleteReport(id);
  }
}
