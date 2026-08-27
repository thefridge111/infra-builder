import { Injectable } from '@angular/core';
import { CanvasNode, CanvasEdge } from '@infra-builder/state';
import { buildTemplate } from './cloudformation-template';

@Injectable({ providedIn: 'root' })
export class CloudformationExportService {
  exportToCloudFormation(nodes: CanvasNode[], edges: CanvasEdge[]): string {
    return JSON.stringify(buildTemplate(nodes, edges), null, 2);
  }

  exportToYaml(nodes: CanvasNode[], edges: CanvasEdge[]): string {
    return this.jsonToYaml(buildTemplate(nodes, edges));
  }

  private jsonToYaml(obj: unknown, indent = 0): string {
    const spaces = '  '.repeat(indent);

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
          const nested =
            value !== null &&
            typeof value === 'object' &&
            Object.keys(value).length > 0;
          return nested
            ? `${spaces}${key}:\n${this.jsonToYaml(value, indent + 1)}`
            : `${spaces}${key}: ${this.jsonToYaml(value, indent + 1)}`;
        })
        .join('\n');
    }

    if (typeof obj === 'string') return yamlString(obj, spaces);
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

// Leading indicators, ": "/" #" sequences, trailing ":", or scalars YAML would type.
const NEEDS_QUOTES =
  /^[\s\-?:,[\]{}#&*!|>'"%@`]|[:#]\s|\s#|:$|\s$|^(true|false|null|~|[\d.+-]+)$/i;

function yamlString(value: string, spaces: string): string {
  if (value.includes('\n')) {
    const lines = value.split('\n').map((l) => `${spaces}  ${l}`);
    return `|\n${lines.join('\n')}`;
  }
  return NEEDS_QUOTES.test(value) || value === ''
    ? JSON.stringify(value)
    : value;
}
