import {
  complianceCases as seedComplianceCases,
  individualComplianceCards as seedIndividualComplianceCards,
  legalEntityComplianceCards as seedLegalEntityComplianceCards,
} from '../../../data/compliance';
import type {
  ComplianceCase,
  IndividualComplianceCard,
  LegalEntityComplianceCard,
} from '../../../data/types';
import type { ComplianceRepository } from '../api/complianceRepository';

const cloneComplianceCase = (complianceCase: ComplianceCase): ComplianceCase => structuredClone(complianceCase);
const cloneIndividualCard = (card: IndividualComplianceCard): IndividualComplianceCard => structuredClone(card);
const cloneLegalCard = (card: LegalEntityComplianceCard): LegalEntityComplianceCard => structuredClone(card);

export const createMockComplianceRepository = (): ComplianceRepository => {
  const complianceCasesStore = seedComplianceCases.map(cloneComplianceCase);
  const individualCardsStore = seedIndividualComplianceCards.map(cloneIndividualCard);
  const legalCardsStore = seedLegalEntityComplianceCards.map(cloneLegalCard);

  return {
    async getComplianceCaseByClientId(clientId: string) {
      const complianceCase = complianceCasesStore.find((item) => item.clientId === clientId);
      return complianceCase ? cloneComplianceCase(complianceCase) : null;
    },

    async getIndividualComplianceCardByClientId(clientId: string) {
      const card = individualCardsStore.find((item) => item.clientId === clientId);
      return card ? cloneIndividualCard(card) : null;
    },

    async getLegalEntityComplianceCardByClientId(clientId: string) {
      const card = legalCardsStore.find((item) => item.clientId === clientId);
      return card ? cloneLegalCard(card) : null;
    },
  };
};
