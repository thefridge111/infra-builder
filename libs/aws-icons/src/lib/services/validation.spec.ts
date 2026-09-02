import {
  AlbService,
  CanvasNode,
  Ec2Service,
  S3Service,
  SubnetService,
  VpcService,
} from '@infra-builder/state';
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
      [node('subnet', new SubnetService()), node('ec2', new Ec2Service())],
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
        node('vpc', new VpcService()),
        node('subnet', new SubnetService(), 'vpc'),
        node('ec2', new Ec2Service(), 'subnet'),
      ],
      [],
    );
    expect(issues).toEqual([]);
  });

  it('warns about duplicate labels and sorts errors first', () => {
    const issues = validateDiagram(
      [
        node('a', new S3Service()),
        { ...node('b', new S3Service()), label: 'a' },
        node('ec2', new Ec2Service()),
      ],
      [],
    );
    expect(issues[0].level).toBe('error');
    expect(issues.at(-1)?.message).toContain('2 resources named');
  });
});

describe('validateDiagram deployability', () => {
  it('requires two subnets for load balancers and databases', () => {
    const one = validateDiagram(
      [
        node('vpc', new VpcService()),
        node('s', new SubnetService(), 'vpc'),
        node('alb', new AlbService(), 's'),
      ],
      [],
    );
    expect(one.find((i) => i.nodeId === 'alb')?.message).toContain(
      'two subnets',
    );
    const two = validateDiagram(
      [
        node('vpc', new VpcService()),
        node('s', new SubnetService(), 'vpc'),
        node('t', new SubnetService(), 'vpc'),
        node('alb', new AlbService(), 's'),
      ],
      [],
    );
    expect(
      two.filter((i) => i.nodeId === 'alb' && i.level === 'error'),
    ).toEqual([]);
  });

  it('flags subnets that share a CIDR', () => {
    const a = {
      ...node('a', new SubnetService(), 'vpc'),
      properties: { CidrBlock: '10.0.1.0/24' },
    };
    const b = {
      ...node('b', new SubnetService(), 'vpc'),
      properties: { CidrBlock: '10.0.1.0/24' },
    };
    const issues = validateDiagram([node('vpc', new VpcService()), a, b], []);
    expect(issues.some((i) => i.message.includes('share 10.0.1.0/24'))).toBe(
      true,
    );
  });
});
