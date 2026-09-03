# Architecture Overview

## Current Package Structure

```
infra-builder/
├── libs/
│   ├── state/          # Domain model + business logic
│   ├── canvas/         # Diagram editor (sidebar + canvas)
│   ├── exports/        # CloudFormation/PDF/PNG export
│   └── aws-icons/      # Legacy UI definitions (TO BE REMOVED)
└── apps/
    └── infra-builder/  # Main Angular app
```

## Package Responsibilities

### `state` (Core Domain)

**Single source of truth for all service definitions and logic**

- **Service Classes** (`services/classes/`) - Each AWS service is a class extending `BaseAwsService`:
  - Visual properties: `label`, `color`, `iconPath`, `defaultWidth/Height`, `defaultPorts`, `container`
  - Edge validation: `edgeRules`, `validateEdge(target, direction)`
  - Property fields: `propertyFields`
  - Node factory: `createNode(overrides)`
- **Models** (`models/`) - Core types: `CanvasNode`, `CanvasEdge`, `CanvasState`, `AwsServiceType`, `EdgeKind`, `Port`
- **State Management** (`services/state.service.ts`) - Angular signals for nodes, edges, selection, zoom, pan
- **Edge Rules** (`models/edge-rules.ts`) - Centralized `EDGE_RULES`, `resolveEdge()`, `matchRule()`
- **Registry** (`services/classes/index.ts`) - `SERVICE_MAP`, `ALL_SERVICES`, `getService()`, `getServicesByCategory()`

### `canvas` (Diagram Editor)

**Interactive drag-drop diagram canvas**

- **Canvas Component** - Konva.js rendering, drag-drop, zoom/pan, grid
- **Sidebar** - Collapsible categories, search, drag source for services
- **Properties Panel** - Node/edge property editing
- **Imports from `state`**: Service classes, `SERVICE_MAP`, `CanvasStateService`, types

### `exports` (Serialization)

**CloudFormation, PDF, PNG export**

- CloudFormation template generation from `CanvasState`
- PDF/PNG via `html2canvas` + `jsPDF`
- Imports from `state`: types, `SERVICE_MAP`, validation

### `aws-icons` (Legacy - TO BE REMOVED)

**Currently provides:**

- Plain-object definitions (`AWS_SERVICES`, `AWS_CATEGORIES`) wrapping class instances
- `AwsServiceDefinition` interface (with `classDef: BaseAwsService`)
- Sidebar component (will move to `canvas`)
- Property/edge constants (moved to `state`)

**Why it exists:** Temporary compatibility layer while migrating from plain-object definitions to class-based definitions.

---

## Migration Plan: Retiring `aws-icons`

### Phase 1: Move Sidebar to `canvas` ✓ (Partially done)

- Sidebar component already in `canvas/src/lib/sidebar/`
- Currently imports `AWS_SERVICES`, `AWS_CATEGORIES` from `aws-icons`

### Phase 2: Update Sidebar to Use `state` Directly

```typescript
// Before (aws-icons)
import { AWS_SERVICES, AWS_CATEGORIES } from '@infra-builder/aws-icons';

// After (canvas)
import { ALL_SERVICES, getServicesByCategory } from '@infra-builder/state';

// Usage
const servicesByCategory = getServicesByCategory('Compute');
services.forEach((s) => s.label, s.color, s.iconPath, s.createNode());
```

### Phase 3: Update Canvas to Use `state` Directly

- `createNode()` already uses `SERVICE_MAP` from `state`
- `validateEdge()` uses service classes from `state`
- Remove `AwsServiceDefinition` import from `aws-icons`

### Phase 4: Delete `aws-icons`

1. Remove `libs/aws-icons/`
2. Remove from `package.json` dependencies
3. Update `tsconfig.base.json` paths
4. Delete `aws-icons` exports from `state` and `canvas` imports

### Phase 5: Cleanup

- Remove `AwsServiceDefinition` interface from `aws-icons/src/lib/services/definitions/index.ts`
- Remove `classDef` from plain-object definitions (they become redundant)
- Update any remaining imports

---

## Future Package Structure (Post-Migration)

```
infra-builder/
├── libs/
│   ├── state/          # Domain model + business logic (unchanged)
│   ├── canvas/         # Diagram editor + sidebar
│   └── exports/        # CloudFormation/PDF/PNG export
└── apps/
    └── infra-builder/  # Main Angular app
```

---

## Key Benefits Post-Migration

| Before                                          | After                     |
| ----------------------------------------------- | ------------------------- |
| Duplicate definitions (plain objects + classes) | Single class per service  |
| `classDef` indirection                          | Direct class usage        |
| `aws-icons` as intermediary                     | Direct `state` → `canvas` |
| Split logic across packages                     | All logic in `state`      |
| `AwsServiceDefinition` with `classDef`          | Just use the class        |

---

## Service Class Interface (Stable API)

```typescript
abstract class BaseAwsService {
  // Visual
  readonly type: AwsServiceType;
  readonly label: string;
  readonly category: string;
  readonly color: string;
  readonly iconPath: string;
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly defaultPorts: Port[];
  readonly container: boolean;

  // Logic
  readonly edgeRules: EdgeRule[];
  readonly propertyFields: PropertyField[];

  // Methods
  createNode(overrides): CanvasNode;
  validateEdge(target: BaseAwsService, direction): EdgeValidationResult;
  getPropertyFields(): PropertyField[];
}
```

All packages should depend on this interface via `@infra-builder/state`.
