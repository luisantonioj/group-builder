import type { Candidate, Connection, Conflict } from "@/types";

// Build an adjacency map from a connection list for O(1) lookup
export function buildAdjacencyMap(
  connections: Connection[]
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const conn of connections) {
    if (!map.has(conn.fromId)) map.set(conn.fromId, new Set());
    if (!map.has(conn.toId)) map.set(conn.toId, new Set());
    map.get(conn.fromId)!.add(conn.toId);
    map.get(conn.toId)!.add(conn.fromId); // bidirectional
  }
  return map;
}

// Check if two candidates are directly connected
export function areConnected(
  a: string,
  b: string,
  adjacency: Map<string, Set<string>>
): boolean {
  return adjacency.get(a)?.has(b) ?? false;
}

// Detect all conflicts in a set of groups
export function detectGroupConflicts(
  groups: { id: string; candidates: Candidate[] }[],
  adjacency: Map<string, Set<string>>
): Omit<Conflict, "id" | "createdAt">[] {
  const conflicts: Omit<Conflict, "id" | "createdAt">[] = [];

  for (const group of groups) {
    const members = group.candidates;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (areConnected(members[i].id, members[j].id, adjacency)) {
          conflicts.push({
            candidateAId: members[i].id,
            candidateBId: members[j].id,
            groupId: group.id,
            roomId: null,
            status: "ACTIVE",
            shepherdNote: null,
            dismissedBy: null,
            dismissedAt: null,
            candidateAName: members[i].fullName,
            candidateBName: members[j].fullName,
            location: group.id,
          });
        }
      }
    }
  }

  return conflicts;
}

// Detect all conflicts in a set of rooms
export function detectRoomConflicts(
  rooms: { id: string; candidates: Candidate[] }[],
  adjacency: Map<string, Set<string>>
): Omit<Conflict, "id" | "createdAt">[] {
  const conflicts: Omit<Conflict, "id" | "createdAt">[] = [];

  for (const room of rooms) {
    const members = room.candidates;
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (areConnected(members[i].id, members[j].id, adjacency)) {
          conflicts.push({
            candidateAId: members[i].id,
            candidateBId: members[j].id,
            groupId: null,
            roomId: room.id,
            status: "ACTIVE",
            shepherdNote: null,
            dismissedBy: null,
            dismissedAt: null,
            candidateAName: members[i].fullName,
            candidateBName: members[j].fullName,
            location: room.id,
          });
        }
      }
    }
  }

  return conflicts;
}

// Find all connected components (clusters) via DFS
export function findClusters(
  candidates: Candidate[],
  adjacency: Map<string, Set<string>>
): Candidate[][] {
  const visited = new Set<string>();
  const clusters: Candidate[][] = [];
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));

  function dfs(id: string, cluster: Candidate[]) {
    visited.add(id);
    const candidate = candidateMap.get(id);
    if (candidate) cluster.push(candidate);
    for (const neighborId of adjacency.get(id) ?? []) {
      if (!visited.has(neighborId) && candidateMap.has(neighborId)) {
        dfs(neighborId, cluster);
      }
    }
  }

  for (const candidate of candidates) {
    if (!visited.has(candidate.id)) {
      const cluster: Candidate[] = [];
      dfs(candidate.id, cluster);
      if (cluster.length > 1) {
        // Only return actual clusters (size ≥ 2)
        clusters.push(cluster);
      }
    }
  }

  return clusters.sort((a, b) => b.length - a.length);
}

// Auto-distribute candidates into groups, minimising conflicts
export function autoDistribute(
  candidates: Candidate[],
  groups: { id: string; capacity: number; candidates: Candidate[] }[],
  adjacency: Map<string, Set<string>>
): Map<string, string> {
  // Returns a Map of candidateId → groupId
  const assignments = new Map<string, string>();

  // Sort candidates by connection degree descending (high-conflict first)
  const sorted = [...candidates].sort(
    (a, b) =>
      (adjacency.get(b.id)?.size ?? 0) - (adjacency.get(a.id)?.size ?? 0)
  );

  // Track current member sets for conflict checking
  const groupMembers = new Map<string, Set<string>>(
    groups.map((g) => [g.id, new Set(g.candidates.map((c) => c.id))])
  );

  for (const candidate of sorted) {
    // Find the group with fewest conflicts and most remaining space
    let bestGroupId: string | null = null;
    let bestScore = Infinity;

    for (const group of groups) {
      const members = groupMembers.get(group.id)!;
      if (members.size >= group.capacity) continue;

      // Count conflicts this candidate would create in this group
      let conflictCount = 0;
      for (const memberId of members) {
        if (areConnected(candidate.id, memberId, adjacency)) conflictCount++;
      }

      // Prefer gender balance (soft)
      const score = conflictCount * 100 + members.size;
      if (score < bestScore) {
        bestScore = score;
        bestGroupId = group.id;
      }
    }

    if (bestGroupId) {
      assignments.set(candidate.id, bestGroupId);
      groupMembers.get(bestGroupId)!.add(candidate.id);
    }
  }

  return assignments;
}
