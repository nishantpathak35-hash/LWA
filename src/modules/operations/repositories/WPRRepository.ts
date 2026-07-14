import { queryAll, queryGet, queryRun } from '../../../../app/lib/db.js';

export interface IWPRSchedule {
  id?: number | string;
  project: string;
  milestone_name: string;
  floor_zone?: string;
  planned_start?: string;
  planned_end?: string;
  planned_progress_curve?: string; // JSON string
  render_image_url?: string;
  created_at?: string;
}

export interface IWPRReport {
  id?: number | string;
  project: string;
  week_start: string;
  week_end: string;
  generated_by?: string;
  planned_progress: number;
  actual_progress: number;
  variance: number;
  render_image_url?: string;
  actual_image_url?: string;
  summary_text?: string;
  created_at?: string;
}

export class WPRRepository {
  // --- Schedules ---
  static async getSchedules(project?: string): Promise<IWPRSchedule[]> {
    let sql = `SELECT * FROM wpr_schedules`;
    const params: any[] = [];
    if (project) {
      sql += ` WHERE project = ?`;
      params.push(project);
    }
    sql += ` ORDER BY id DESC`;
    return queryAll(sql, params);
  }

  static async saveSchedule(sched: Omit<IWPRSchedule, 'id' | 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO wpr_schedules (project, milestone_name, floor_zone, planned_start, planned_end, planned_progress_curve, render_image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await queryRun(sql, [
      sched.project,
      sched.milestone_name,
      sched.floor_zone || '',
      sched.planned_start || '',
      sched.planned_end || '',
      sched.planned_progress_curve || '{}',
      sched.render_image_url || ''
    ]);
  }

  // --- WPR Reports ---
  static async createReport(wpr: Omit<IWPRReport, 'id' | 'created_at'>): Promise<void> {
    // Duplicate check
    const existing = await queryGet(
      `SELECT id FROM wpr_reports WHERE project = ? AND week_start = ? AND week_end = ?`,
      [wpr.project, wpr.week_start, wpr.week_end]
    );
    if (existing) {
      throw new Error(`A WPR report already exists for project ${wpr.project} for the week of ${wpr.week_start} to ${wpr.week_end}`);
    }

    const sql = `
      INSERT INTO wpr_reports (project, week_start, week_end, generated_by, planned_progress, actual_progress, variance, render_image_url, actual_image_url, summary_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await queryRun(sql, [
      wpr.project,
      wpr.week_start,
      wpr.week_end,
      wpr.generated_by || '',
      wpr.planned_progress,
      wpr.actual_progress,
      wpr.variance,
      wpr.render_image_url || '',
      wpr.actual_image_url || '',
      wpr.summary_text || ''
    ]);
  }

  static async getReports(filters: any = {}): Promise<IWPRReport[]> {
    let sql = `SELECT * FROM wpr_reports WHERE 1=1`;
    const params: any[] = [];

    if (filters.project) {
      sql += ` AND project = ?`;
      params.push(filters.project);
    }
    if (filters.week_start) {
      sql += ` AND week_start = ?`;
      params.push(filters.week_start);
    }

    sql += ` ORDER BY id DESC`;

    if (filters.limit) {
      sql += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }
    return queryAll(sql, params);
  }

  static async getReportById(id: string | number): Promise<IWPRReport | null> {
    return queryGet(`SELECT * FROM wpr_reports WHERE id = ?`, [id]);
  }

  static async deleteReport(id: string | number): Promise<void> {
    await queryRun(`DELETE FROM wpr_reports WHERE id = ?`, [id]);
  }
}
