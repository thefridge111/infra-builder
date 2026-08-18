import { Injectable } from '@angular/core';
import Konva from 'konva';
import jsPDF from 'jspdf';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  async exportToPdf(
    stage: Konva.Stage,
    filename = 'aws-architecture.pdf',
  ): Promise<void> {
    const dataUrl = stage.toDataURL({
      pixelRatio: 2,
      mimeType: 'image/png',
    });

    const img = new Image();
    img.src = dataUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width / 2, img.height / 2],
    });

    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2);
    pdf.save(filename);
  }
}
