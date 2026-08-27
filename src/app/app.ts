import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { Canvas, Properties, Sidebar } from '@infra-builder/canvas';
import { CanvasStateService } from '@infra-builder/state';
import { EXAMPLE_PROJECTS } from '@infra-builder/aws-icons';
import {
  PngExportService,
  PdfExportService,
  CloudformationExportService,
} from '@infra-builder/exports';

@Component({
  selector: 'app-root',
  imports: [Canvas, Sidebar, Properties],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild(Canvas) canvas!: Canvas;
  @ViewChild(Properties) properties!: Properties;

  protected state = inject(CanvasStateService);
  private pngExport = inject(PngExportService);
  private pdfExport = inject(PdfExportService);
  private cfExport = inject(CloudformationExportService);

  protected title = 'AWS Infrastructure Builder';
  protected examples = EXAMPLE_PROJECTS;
  showCfPreview = false;
  cfPreviewContent = '';

  @HostListener('document:keydown.escape')
  closeCfPreview(): void {
    this.showCfPreview = false;
  }

  loadExample(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const example = this.examples[Number(select.value)];
    select.value = '';
    if (!example) return;
    this.state.loadState(example.build());
    setTimeout(() => this.canvas.fitToContent());
  }

  focusLabel(): void {
    this.properties.focusLabel();
  }

  async exportPng(): Promise<void> {
    await this.pngExport.exportToPng(this.canvas.getStage());
  }

  async exportPdf(): Promise<void> {
    await this.pdfExport.exportToPdf(this.canvas.getStage());
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

  exportProject(): void {
    const json = JSON.stringify(this.state.state(), null, 2);
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
        this.state.loadState(JSON.parse(reader.result as string));
      } catch (e) {
        console.error('Failed to import project:', e);
      }
      input.value = '';
    };
    reader.readAsText(file);
  }
}
