export interface IAuditLog {
  id?: number;
  user: string;
  action_type: string;
  details: string;
  module: string;
  timestamp: string;
}
