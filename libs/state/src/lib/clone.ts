import { CanvasEdge, CanvasNode } from './models';

/**
 * Deep-copies a set of nodes and the edges between them with fresh ids.
 * Parent links are kept only when the parent is part of the copied set.
 */
export function cloneSubgraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  ids: Set<string>,
  offset: { x: number; y: number },
  newId: () => string,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const idMap = new Map<string, string>();
  const picked = nodes.filter((n) => ids.has(n.id));
  picked.forEach((n) => idMap.set(n.id, newId()));

  const clonedNodes = picked.map((n) => ({
    ...n,
    id: idMap.get(n.id) as string,
    x: n.x + offset.x,
    y: n.y + offset.y,
    ports: n.ports.map((p) => ({ ...p })),
    properties: { ...n.properties },
    parentId:
      n.parentId && idMap.has(n.parentId) ? idMap.get(n.parentId) : undefined,
  }));

  const clonedEdges = edges
    .filter((e) => idMap.has(e.sourceNodeId) && idMap.has(e.targetNodeId))
    .map((e) => ({
      ...e,
      id: newId(),
      sourceNodeId: idMap.get(e.sourceNodeId) as string,
      targetNodeId: idMap.get(e.targetNodeId) as string,
      properties: e.properties ? { ...e.properties } : undefined,
    }));

  return { nodes: clonedNodes, edges: clonedEdges };
}
