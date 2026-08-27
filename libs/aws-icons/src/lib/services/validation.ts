import { CanvasEdge, CanvasNode } from '@infra-builder/state';

export interface DiagramIssue {
  level: 'error' | 'warning';
  message: string;
  nodeId?: string;
}

/** Checks the diagram for things that make the exported template invalid or incomplete. */
export function validateDiagram(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): DiagramIssue[] {
  const issues: DiagramIssue[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ancestor = (node: CanvasNode, type: string): CanvasNode | undefined => {
    let current = node.parentId ? byId.get(node.parentId) : undefined;
    while (current && current.type !== type) {
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return current;
  };
  const incoming = (node: CanvasNode, type: string) =>
    edges.some(
      (e) =>
        e.targetNodeId === node.id && byId.get(e.sourceNodeId)?.type === type,
    );
  const outgoing = (node: CanvasNode, type: string) =>
    edges.some(
      (e) =>
        e.sourceNodeId === node.id && byId.get(e.targetNodeId)?.type === type,
    );
  const subnetsIn = (vpc: CanvasNode | undefined) =>
    vpc
      ? nodes.filter((n) => n.type === 'subnet' && ancestor(n, 'vpc') === vpc)
      : [];
  const gatewayAttached = (vpc: CanvasNode) =>
    edges.some(
      (e) =>
        e.targetNodeId === vpc.id &&
        byId.get(e.sourceNodeId)?.type === 'internet-gateway',
    );

  nodes.forEach((node) => {
    const add = (level: DiagramIssue['level'], message: string) =>
      issues.push({ level, message, nodeId: node.id });
    const vpc = ancestor(node, 'vpc');
    const subnet = ancestor(node, 'subnet');

    switch (node.type) {
      case 'subnet':
        if (!vpc) add('error', `${node.label} must be inside a VPC`);
        break;
      case 'security-group':
        if (!vpc) add('warning', `${node.label} is not inside a VPC`);
        break;
      case 'ec2':
        if (!subnet) add('error', `${node.label} must be inside a subnet`);
        break;
      case 'nat-gateway':
        if (!subnet) add('error', `${node.label} must be inside a subnet`);
        else if (vpc && !gatewayAttached(vpc))
          add('warning', `${node.label} needs an Internet Gateway on its VPC`);
        break;
      case 'rds':
        if (!subnet) add('warning', `${node.label} has no subnet group`);
        else if (subnetsIn(vpc).length < 2)
          add('error', `${node.label} needs two subnets in its VPC`);
        if (!incoming(node, 'security-group'))
          add('warning', `${node.label} has no security group`);
        break;
      case 'alb':
        if (!subnet) add('error', `${node.label} must be inside a subnet`);
        else if (subnetsIn(vpc).length < 2)
          add('error', `${node.label} needs two subnets in its VPC`);
        if (!outgoing(node, 'ec2') && !outgoing(node, 'lambda'))
          add('warning', `${node.label} has no targets`);
        break;
      case 'internet-gateway':
        if (!outgoing(node, 'vpc'))
          add('warning', `${node.label} is not attached to a VPC`);
        break;
      case 'lambda':
        if (!incoming(node, 'iam-role'))
          add('warning', `${node.label} will use a generated execution role`);
        if (subnet && !incoming(node, 'security-group'))
          add('warning', `${node.label} will get a generated security group`);
        break;
      case 'api-gateway':
        if (!outgoing(node, 'lambda'))
          add('warning', `${node.label} has no routes`);
        break;
    }
  });

  const labels = new Map<string, number>();
  nodes.forEach((n) => labels.set(n.label, (labels.get(n.label) ?? 0) + 1));
  labels.forEach((count, label) => {
    if (count > 1) {
      issues.push({
        level: 'warning',
        message: `${count} resources named "${label}"`,
      });
    }
  });

  const cidrs = new Map<string, CanvasNode[]>();
  nodes
    .filter((n) => n.type === 'subnet' && n.properties['CidrBlock'])
    .forEach((n) => {
      const key = `${ancestor(n, 'vpc')?.id}:${n.properties['CidrBlock']}`;
      cidrs.set(key, [...(cidrs.get(key) ?? []), n]);
    });
  cidrs.forEach((group) => {
    if (group.length > 1) {
      issues.push({
        level: 'error',
        message: `${group.length} subnets share ${group[0].properties['CidrBlock']}`,
        nodeId: group[1].id,
      });
    }
  });

  return issues.sort((a, b) =>
    a.level === b.level ? 0 : a.level === 'error' ? -1 : 1,
  );
}
