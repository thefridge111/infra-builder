import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AWS_SERVICES,
  AWS_CATEGORIES,
  type AwsServiceDefinition,
} from '@infra-builder/aws-icons';
import { CanvasStateService } from '@infra-builder/state';

@Component({
  selector: 'lib-sidebar',
  imports: [FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private state = inject(CanvasStateService);
  deleteRequested = output<void>();
  fitRequested = output<void>();
  addRequested = output<AwsServiceDefinition>();
  services = AWS_SERVICES;
  categories = AWS_CATEGORIES;
  searchText = '';
  expandedCategories = new Set<string>(AWS_CATEGORIES);

  toggleCategory(category: string): void {
    if (this.expandedCategories.has(category)) {
      this.expandedCategories.delete(category);
    } else {
      this.expandedCategories.add(category);
    }
  }

  isExpanded(category: string): boolean {
    return this.expandedCategories.has(category);
  }

  filteredServices(category: string): AwsServiceDefinition[] {
    return this.services.filter(
      (s) =>
        s.category === category &&
        (this.searchText === '' ||
          s.label.toLowerCase().includes(this.searchText.toLowerCase())),
    );
  }

  onDragStart(event: DragEvent, service: AwsServiceDefinition): void {
    event.dataTransfer?.setData('application/aws-service', service.type);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  zoomIn(): void {
    this.state.setZoom(this.state.zoom() * 1.2);
  }

  zoomOut(): void {
    this.state.setZoom(this.state.zoom() / 1.2);
  }

  get zoomPercent(): number {
    return Math.round(this.state.zoom() * 100);
  }
}
