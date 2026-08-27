import { resolveEdge } from './edge-rules';
import { AWS_SERVICES } from './definitions';
import { NODE_PROPERTY_FIELDS, TRIGGER_PROPERTY_FIELDS } from './properties';

describe('resolveEdge', () => {
  it('classifies event sources as triggers', () => {
    expect(resolveEdge('s3', 'lambda')).toEqual({
      kind: 'trigger',
      flipped: false,
    });
    expect(resolveEdge('sns', 'sqs')).toEqual({
      kind: 'trigger',
      flipped: false,
    });
  });

  it('flips direction when only the reverse rule matches', () => {
    expect(resolveEdge('lambda', 's3')).toEqual({
      kind: 'depends-on',
      flipped: false,
    });
    expect(resolveEdge('ec2', 'security-group')).toEqual({
      kind: 'attaches',
      flipped: true,
    });
  });

  it('rejects meaningless connections', () => {
    expect(resolveEdge('s3', 'vpc')).toBeNull();
    expect(resolveEdge('iam-role', 's3')).toBeNull();
  });
});

describe('catalog', () => {
  it('only defines property fields for known services', () => {
    const types = new Set(AWS_SERVICES.map((s) => s.type));
    [
      ...Object.keys(NODE_PROPERTY_FIELDS),
      ...Object.keys(TRIGGER_PROPERTY_FIELDS),
    ].forEach((t) => expect(types.has(t as never)).toBe(true));
  });
});
