# InfraBuilder

A browser-based AWS architecture editor. Drag services onto a canvas, nest them
in VPCs and subnets, connect them, and export the result as a diagram (PNG/PDF)
or a CloudFormation template (JSON/YAML).

## Features

- Drag or click services from the catalog; grid-snapped placement
- Containers: VPC and Subnet are resizable and own the nodes dropped inside them
- Typed connections: triggers, attachments, network routes and dependencies are
  validated when drawn and rendered with distinct styles
- Properties panel for node settings (instance type, runtime, CIDR…) and trigger
  settings (S3 event/prefix, batch size, schedule…)
- Undo/redo, multi-select (⇧ drag), keyboard nudging, zoom to fit
- CloudFormation export that follows the diagram: `VpcId`/`SubnetId` from
  containment, `Lambda::Permission` + notifications for S3 triggers,
  `EventSourceMapping` for SQS/Kinesis/DynamoDB, roles, security groups,
  ALB target groups, and more
- Project save/load as JSON; work is persisted in `localStorage`

## Development

```sh
npm ci
npx nx serve infra-builder      # http://localhost:4200/infra-builder
npx nx run-many -t test lint    # all projects
npx nx build infra-builder
```

## Structure

| Path             | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| `src/app`        | App shell: header actions, CloudFormation preview modal     |
| `libs/canvas`    | Konva canvas, service sidebar, properties panel             |
| `libs/aws-icons` | Service catalog, connection rules, editable property fields |
| `libs/state`     | Signal-based state with history, selection, persistence     |
| `libs/exports`   | PNG, PDF and CloudFormation exporters                       |

## Extending

- **New service**: add the type to `AwsServiceType`, an entry in
  `AWS_SERVICES`, a `RESOURCE_TYPES`/`DEFAULT_PROPS` entry in the exporter, and
  optional `NODE_PROPERTY_FIELDS`.
- **New connection**: add a rule to `EDGE_RULES`; handle it in
  `cloudformation-template.ts` if it should emit CloudFormation.
