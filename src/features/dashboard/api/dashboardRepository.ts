import type { DashboardMetric, SubjectChange } from '../../../data/dashboard';

export interface DashboardRepository {
  listDashboardMetrics(): Promise<DashboardMetric[]>;
  listSubjectChanges(): Promise<SubjectChange[]>;
}
