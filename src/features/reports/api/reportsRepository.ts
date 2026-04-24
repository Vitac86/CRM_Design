import type { Report } from '../../../data/types';

export interface ReportsRepository {
  listReports(): Promise<Report[]>;
  listReportsByDepartment(department: Report['department']): Promise<Report[]>;
  getReportById(id: string): Promise<Report | null>;
}
