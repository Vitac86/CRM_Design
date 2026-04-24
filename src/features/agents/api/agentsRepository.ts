import type { Client } from '../../../data/types';
import type { AgentClientLink, AgentProfile } from '../../../data/agents';

export interface AgentsRepository {
  listAgents(): Promise<AgentProfile[]>;
  getAgentBySubjectId(subjectId: string): Promise<AgentProfile | null>;
  createOrUpdateAgent(payload: {
    subjectId: string;
    contractNumber: string;
    commission: string;
  }): Promise<AgentProfile>;
  listAgentClientLinks(): Promise<AgentClientLink[]>;
  listAgentClients(agentSubjectId: string): Promise<Client[]>;
  addAgentClient(agentSubjectId: string, clientSubjectId: string): Promise<AgentClientLink>;
}
