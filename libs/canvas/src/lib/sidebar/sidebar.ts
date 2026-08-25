import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AWS_SERVICES, AWS_CATEGORIES } from '@infra-builder/aws-icons';
import { CanvasStateService } from '@infra-builder/state';
import { AwsServiceDefinition } from '@infra-builder/state';

@Component({
  selector: 'lib-sidebar',
  imports: [CommonModule, FormsModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  private state = inject(CanvasStateService);
  deleteRequested = output<void>();
  services = AWS_SERVICES;
  categories = AWS_CATEGORIES;
  searchText = '';

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

  zoomFit(): void {
    this.state.setZoom(1);
    this.state.setPan(0, 0);
  }

  deleteSelected(): void {
    this.deleteRequested.emit();
  }

  get zoomPercent(): number {
    return Math.round(this.state.zoom() * 100);
  }
}
