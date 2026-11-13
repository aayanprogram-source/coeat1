export const PAGE = 50;

export interface AuditRow {
  id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  before: unknown;
  after: unknown;
  created_at: string;
}

export interface ErrorRow {
  id: string;
  source: string;
  message: string;
  created_at: string;
}
