import { getDb } from './connection.js';

export interface AgentDestination {
  agent_group_id: string;
  local_name: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

export function createDestination(row: AgentDestination): void {
  getDb()
    .prepare(
      `INSERT INTO agent_destinations (agent_group_id, local_name, target_type, target_id, created_at)
       VALUES (@agent_group_id, @local_name, @target_type, @target_id, @created_at)`,
    )
    .run(row);
}

export function getDestinations(agentGroupId: string): AgentDestination[] {
  return getDb()
    .prepare('SELECT * FROM agent_destinations WHERE agent_group_id = ? ORDER BY local_name')
    .all(agentGroupId) as AgentDestination[];
}

export function getDestinationByName(agentGroupId: string, localName: string): AgentDestination | undefined {
  return getDb()
    .prepare('SELECT * FROM agent_destinations WHERE agent_group_id = ? AND local_name = ?')
    .get(agentGroupId, localName) as AgentDestination | undefined;
}

export function getDestinationByTarget(targetType: string, targetId: string): AgentDestination[] {
  return getDb()
    .prepare('SELECT * FROM agent_destinations WHERE target_type = ? AND target_id = ?')
    .all(targetType, targetId) as AgentDestination[];
}

export function hasDestination(agentGroupId: string, localName: string): boolean {
  return !!getDb()
    .prepare('SELECT 1 FROM agent_destinations WHERE agent_group_id = ? AND local_name = ? LIMIT 1')
    .get(agentGroupId, localName);
}

export function deleteDestination(agentGroupId: string, localName: string): void {
  getDb()
    .prepare('DELETE FROM agent_destinations WHERE agent_group_id = ? AND local_name = ?')
    .run(agentGroupId, localName);
}
