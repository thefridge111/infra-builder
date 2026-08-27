import { CanvasNode } from '@infra-builder/state';
import { validateDiagram } from './validation';

function node(
  id: string,
  type: CanvasNode['type'],
  parentId?: string,
): CanvasNode {
  return {
    id,
    type,
    label: id,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ports: [],
    properties: {},
    parentId,
  };
}

describe('validateDiagram', () => {
  it('flags resources outside their required container', () => {
    const issues = validateDiagram(
      [node('subnet', 'subnet'), node('ec2', 'ec2')],
      [],
    );
    expect(issues.map((i) => [i.level, i.nodeId])).toEqual([
      ['error', 'subnet'],
      ['error', 'ec2'],
    ]);
  });

  it('accepts a well-formed network', () => {
    const issues = validateDiagram(
      [
        node('vpc', 'vpc'),
        node('subnet', 'subnet', 'vpc'),
        node('ec2', 'ec2', 'subnet'),
      ],
      [],
    );
    expect(issues).toEqual([]);
  });

  it('warns about duplicate labels and sorts errors first', () => {
    const issues = validateDiagram(
      [node('a', 's3'), { ...node('b', 's3'), label: 'a' }, node('ec2', 'ec2')],
      [],
    );
    expect(issues[0].level).toBe('error');
    expect(issues.at(-1)?.message).toContain('2 resources named');
  });
});

describe('validateDiagram deployability', () => {
  it('requires two subnets for load balancers and databases', () => {
    const one = validateDiagram(
      [node('vpc', 'vpc'), node('s', 'subnet', 'vpc'), node('alb', 'alb', 's')],
      [],
    );
    expect(one.find((i) => i.nodeId === 'alb')?.message).toContain(
      'two subnets',
    );
    const two = validateDiagram(
      [
        node('vpc', 'vpc'),
        node('s', 'subnet', 'vpc'),
        node('t', 'subnet', 'vpc'),
        node('alb', 'alb', 's'),
      ],
      [],
    );
    expect(
      two.filter((i) => i.nodeId === 'alb' && i.level === 'error'),
    ).toEqual([]);
  });

  it('flags subnets that share a CIDR', () => {
    const a = {
      ...node('a', 'subnet', 'vpc'),
      properties: { CidrBlock: '10.0.1.0/24' },
    };
    const b = {
      ...node('b', 'subnet', 'vpc'),
      properties: { CidrBlock: '10.0.1.0/24' },
    };
    const issues = validateDiagram([node('vpc', 'vpc'), a, b], []);
    expect(issues.some((i) => i.message.includes('share 10.0.1.0/24'))).toBe(
      true,
    );
  });
});
