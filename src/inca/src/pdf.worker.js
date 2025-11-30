// src/pdf.worker.js
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
pdfjsLib.GlobalWorkerOptions.workerSrc = self.location.origin + '/pdf.worker.min.js';
