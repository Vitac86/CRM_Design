import { reports as seedReports } from '../../../data/reports';
import type { Report } from '../../../data/types';
import type { ReportsRepository } from '../api/reportsRepository';

const cloneReport = (report: Report): Report => structuredClone(report);

export const createMockReportsRepository = (): ReportsRepository => {
  const reportsStore = seedReports.map(cloneReport);

  return {
    async listReports() {
      return reportsStore.map(cloneReport);
    },

    async listReportsByDepartment(department) {
      return reportsStore.filter((report) => report.department === department).map(cloneReport);
    },

    async getReportById(id) {
      const report = reportsStore.find((item) => item.id === id);
      return report ? cloneReport(report) : null;
    },
  };
};
