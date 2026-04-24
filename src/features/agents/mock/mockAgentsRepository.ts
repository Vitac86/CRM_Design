import { agentClientLinks as seedAgentClientLinks, agents as seedAgents, type AgentClientLink, type AgentProfile } from '../../../data/agents';
import type { Client } from '../../../data/types';
import type { ClientsRepository } from '../../clients/api/clientsRepository';
import type { AgentsRepository } from '../api/agentsRepository';

type CreateMockAgentsRepositoryOptions = {
  clientsRepository: ClientsRepository;
};

const cloneAgent = (agent: AgentProfile): AgentProfile => structuredClone(agent);
const cloneAgentClientLink = (link: AgentClientLink): AgentClientLink => structuredClone(link);
const cloneClient = (client: Client): Client => structuredClone(client);

export const createMockAgentsRepository = ({ clientsRepository }: CreateMockAgentsRepositoryOptions): AgentsRepository => {
  const agentsStore = seedAgents.map(cloneAgent);
  const agentClientLinksStore = seedAgentClientLinks.map(cloneAgentClientLink);

  return {
    async listAgents() {
      return agentsStore.map(cloneAgent);
    },

    async getAgentBySubjectId(subjectId: string) {
      const agent = agentsStore.find((item) => item.subjectId === subjectId);
      return agent ? cloneAgent(agent) : null;
    },

    async createOrUpdateAgent(payload) {
      const { subjectId, contractNumber, commission } = payload;
      const existingAgentIndex = agentsStore.findIndex((item) => item.subjectId === subjectId);

      const nextAgent: AgentProfile = {
        subjectId,
        contractNumber,
        commission,
      };

      if (existingAgentIndex >= 0) {
        agentsStore[existingAgentIndex] = nextAgent;
      } else {
        agentsStore.push(nextAgent);
      }

      const client = await clientsRepository.getClientById(subjectId);
      if (client && !client.roles.includes('Агент')) {
        await clientsRepository.updateClient(subjectId, {
          roles: [...client.roles, 'Агент'],
        });
      }

      return cloneAgent(nextAgent);
    },

    async listAgentClientLinks() {
      return agentClientLinksStore.map(cloneAgentClientLink);
    },

    async listAgentClients(agentSubjectId: string) {
      const clientIds = agentClientLinksStore.filter((link) => link.agentSubjectId === agentSubjectId).map((link) => link.clientSubjectId);
      if (clientIds.length === 0) {
        return [];
      }

      const clients = await clientsRepository.listClients();
      return clients.filter((client) => clientIds.includes(client.id)).map(cloneClient);
    },

    async addAgentClient(agentSubjectId: string, clientSubjectId: string) {
      const existingLink = agentClientLinksStore.find((item) => item.agentSubjectId === agentSubjectId && item.clientSubjectId === clientSubjectId);
      if (existingLink) {
        return cloneAgentClientLink(existingLink);
      }

      const nextLink: AgentClientLink = {
        id: `agent-client-${Date.now()}`,
        agentSubjectId,
        clientSubjectId,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      agentClientLinksStore.push(nextLink);
      return cloneAgentClientLink(nextLink);
    },
  };
};
