import { CloudformationExportService } from './cloudformation-export.service';
import { CanvasNode } from '@infra-builder/state';

const ec2: CanvasNode = {
  id: 'a',
  type: 'ec2',
  label: 'Web',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  ports: [],
  properties: { Tag: 'a: b' },
};

describe('CloudformationExportService', () => {
  const service = new CloudformationExportService();

  it('emits block sequences and quotes special strings', () => {
    const yaml = service.exportToYaml(
      [ec2, { ...ec2, id: 'b', type: 's3', label: 'Files' }],
      [],
    );
    expect(yaml).toContain('ServerSideEncryptionConfiguration:\n          - ');
    expect(yaml).toContain('ImageId: "{{resolve:ssm:');
    expect(yaml).toContain('Tag: "a: b"');
    expect(yaml).not.toMatch(/: {2,}-/);
  });
});
