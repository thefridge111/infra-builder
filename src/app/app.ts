import { Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Canvas, Sidebar } from '@infra-builder/canvas';
import { CanvasStateService } from '@infra-builder/state';
import {
  PngExportService,
  PdfExportService,
  CloudformationExportService,
} from '@infra-builder/exports';

@Component({
  selector: 'app-root',
  imports: [CommonModule, Canvas, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild(Canvas) canvasComponent!: Canvas;

  private state = inject(CanvasStateService);
  private pngExport = inject(PngExportService);
  private pdfExport = inject(PdfExportService);
  private cfExport = inject(CloudformationExportService);

  protected title = 'AWS Infrastructure Builder';
  showCfPreview = false;
  cfPreviewContent = '';

  async exportPng(): Promise<void> {
    if (this.canvasComponent) {
      await this.pngExport.exportToPng(this.canvasComponent.getStage());
    }
  }

  async exportPdf(): Promise<void> {
    if (this.canvasComponent) {
      await this.pdfExport.exportToPdf(this.canvasComponent.getStage());
    }
  }

  exportCloudFormationJson(): void {
    const content = this.cfExport.exportToCloudFormation(
      this.state.nodes(),
      this.state.edges(),
    );
    this.cfExport.downloadFile(
      content,
      'aws-architecture.json',
      'application/json',
    );
  }

  exportCloudFormationYaml(): void {
    const content = this.cfExport.exportToYaml(
      this.state.nodes(),
      this.state.edges(),
    );
    this.cfExport.downloadFile(content, 'aws-architecture.yaml', 'text/yaml');
  }

  previewCloudFormation(): void {
    this.cfPreviewContent = this.cfExport.exportToYaml(
      this.state.nodes(),
      this.state.edges(),
    );
    this.showCfPreview = true;
  }

  closeCfPreview(): void {
    this.showCfPreview = false;
  }

  exportProject(): void {
    const state = this.state.state();
    const json = JSON.stringify(state, null, 2);
    this.cfExport.downloadFile(
      json,
      'aws-architecture-project.json',
      'application/json',
    );
  }

  importProject(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const state = JSON.parse(reader.result as string);
        this.state.loadState(state);
        setTimeout(() => this.reRenderCanvas(), 0);
      } catch (e) {
        console.error('Failed to import project:', e);
      }
    };
    reader.readAsText(file);
  }

  private reRenderCanvas(): void {
    // Force canvas re-render by triggering change detection
    // The canvas component will re-render on next tick
  }
}
