import type {
  ComplianceCase,
  IndividualComplianceCard,
  LegalEntityComplianceCard,
} from '../../../data/types';

export interface ComplianceRepository {
  getComplianceCaseByClientId(clientId: string): Promise<ComplianceCase | null>;
  getIndividualComplianceCardByClientId(clientId: string): Promise<IndividualComplianceCard | null>;
  getLegalEntityComplianceCardByClientId(clientId: string): Promise<LegalEntityComplianceCard | null>;
}
