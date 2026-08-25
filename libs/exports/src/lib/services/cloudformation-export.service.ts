import { Injectable } from '@angular/core';
import { CanvasNode, CanvasEdge } from '@infra-builder/state';

interface CloudFormationResource {
  Type: string;
  Properties: Record<string, unknown>;
}

interface CloudFormationTemplate {
  AWSTemplateFormatVersion: string;
  Description: string;
  Resources: Record<string, CloudFormationResource>;
}

@Injectable({ providedIn: 'root' })
export class CloudformationExportService {
  private readonly typeMap: Record<string, string> = {
    vpc: 'AWS::EC2::VPC',
    subnet: 'AWS::EC2::Subnet',
    'internet-gateway': 'AWS::EC2::InternetGateway',
    'nat-gateway': 'AWS::EC2::NATGateway',
    ec2: 'AWS::EC2::Instance',
    lambda: 'AWS::Lambda::Function',
    ecs: 'AWS::ECS::Service',
    s3: 'AWS::S3::Bucket',
    ebs: 'AWS::EC2::Volume',
    rds: 'AWS::RDS::DBInstance',
    dynamodb: 'AWS::DynamoDB::Table',
    'iam-role': 'AWS::IAM::Role',
    'security-group': 'AWS::EC2::SecurityGroup',
    alb: 'AWS::ElasticLoadBalancingV2::LoadBalancer',
  };

  exportToCloudFormation(nodes: CanvasNode[], _edges: CanvasEdge[]): string {
    const template: CloudFormationTemplate = {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: 'Generated AWS Architecture',
      Resources: {},
    };

    nodes.forEach((node) => {
      const resourceType = this.typeMap[node.type];
      if (!resourceType) return;

      const logicalId = this.toLogicalId(node.label, node.id);

      template.Resources[logicalId] = {
        Type: resourceType,
        Properties: this.getDefaultProperties(node.type, node.properties),
      };
    });

    return JSON.stringify(template, null, 2);
  }

  exportToYaml(nodes: CanvasNode[], _edges: CanvasEdge[]): string {
    const json = JSON.parse(this.exportToCloudFormation(nodes, edges));
    return this.jsonToYaml(json);
  }

  private toLogicalId(label: string, id: string): string {
    const sanitized = label.replace(/[^a-zA-Z0-9]/g, '');
    return `${sanitized}${id.slice(0, 8)}`;
  }

  private getDefaultProperties(
    type: string,
    userProps: Record<string, string>,
  ): Record<string, unknown> {
    const defaults: Record<string, Record<string, unknown>> = {
      vpc: {
        CidrBlock: '10.0.0.0/16',
        EnableDnsSupport: true,
        EnableDnsHostnames: true,
      },
      subnet: {
        CidrBlock: '10.0.1.0/24',
        AvailabilityZone: { Ref: 'AWS::Region' },
      },
      ec2: {
        InstanceType: 't3.micro',
        ImageId: 'ami-0c55b159cbfafe1f0',
      },
      lambda: {
        Runtime: 'nodejs18.x',
        Handler: 'index.handler',
        Code: {
          ZipFile:
            'exports.handler = async (event) => { return { statusCode: 200 }; };',
        },
      },
      s3: {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
          ],
        },
      },
      rds: {
        DBInstanceClass: 'db.t3.micro',
        Engine: 'mysql',
        MasterUsername: { Ref: 'DBUsername' },
        MasterUserPassword: { Ref: 'DBPassword' },
      },
      dynamodb: {
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      },
      'security-group': {
        GroupDescription: 'Security group',
      },
      alb: {
        Type: 'application',
      },
    };

    return { ...defaults[type], ...userProps };
  }

  private jsonToYaml(obj: unknown, indent = 0): string {
    const spaces = '  '.repeat(indent);

    if (typeof obj === 'string') {
      return obj.includes('\n')
        ? `|\n${obj
            .split('\n')
            .map((l) => `${spaces}  ${l}`)
            .join('\n')}`
        : obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj
        .map(
          (item) =>
            `${spaces}- ${this.jsonToYaml(item, indent + 1).trimStart()}`,
        )
        .join('\n');
    }

    if (obj && typeof obj === 'object') {
      const entries = Object.entries(obj as Record<string, unknown>);
      if (entries.length === 0) return '{}';
      return entries
        .map(([key, value]) => {
          const yamlValue = this.jsonToYaml(value, indent + 1);
          if (
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value)
          ) {
            return `${spaces}${key}:\n${yamlValue}`;
          }
          return `${spaces}${key}: ${yamlValue}`;
        })
        .join('\n');
    }

    return String(obj);
  }

  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
