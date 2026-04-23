export interface AgentProfile {
  subjectId: string;
  contractNumber: string;
  commission: string;
}

export interface AgentClientLink {
  id: string;
  agentSubjectId: string;
  clientSubjectId: string;
  createdAt: string;
}

export const agents: AgentProfile[] = [
  {
    subjectId: 'c-003',
    contractNumber: 'AG-2041',
    commission: '1.25%',
  },
  {
    subjectId: 'c-005',
    contractNumber: 'AG-1988',
    commission: '2.00%',
  },
  {
    subjectId: 'c-014',
    contractNumber: 'AG-1760',
    commission: '0.90%',
  },
];

export const agentClientLinks: AgentClientLink[] = [
  {
    id: 'agent-client-1',
    agentSubjectId: 'c-003',
    clientSubjectId: 'c-001',
    createdAt: '2026-03-18',
  },
  {
    id: 'agent-client-2',
    agentSubjectId: 'c-003',
    clientSubjectId: 'c-006',
    createdAt: '2026-04-06',
  },
  {
    id: 'agent-client-3',
    agentSubjectId: 'c-005',
    clientSubjectId: 'c-010',
    createdAt: '2026-02-22',
  },
];
