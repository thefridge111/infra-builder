import { Injectable } from '@angular/core';
import Konva from 'konva';

@Injectable({ providedIn: 'root' })
export class PngExportService {
  async exportToPng(
    stage: Konva.Stage,
    filename = 'aws-architecture.png',
  ): Promise<void> {
    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
