import { dashboardMetrics as seedDashboardMetrics, subjectChanges as seedSubjectChanges } from '../../../data/dashboard';
import type { DashboardMetric, SubjectChange } from '../../../data/dashboard';
import type { DashboardRepository } from '../api/dashboardRepository';

const cloneDashboardMetric = (metric: DashboardMetric): DashboardMetric => ({ ...metric });
const cloneSubjectChange = (subjectChange: SubjectChange): SubjectChange => ({ ...subjectChange });

export const createMockDashboardRepository = (): DashboardRepository => ({
  async listDashboardMetrics() {
    return seedDashboardMetrics.map(cloneDashboardMetric);
  },

  async listSubjectChanges() {
    return seedSubjectChanges.map(cloneSubjectChange);
  },
});
