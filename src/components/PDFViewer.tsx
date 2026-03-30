import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source to the local file from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PDFViewerProps {
  file: File | string | null;
  onPageRendered: (_dimensions: { width: number; height: number }, _pageNumber: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, onPageRendered }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (!file) {
       setPdfDocument(null);
       return;
    }

    const loadPdf = async () => {
      try {
        let loadingTask;
        if (typeof file === 'string') {
            loadingTask = pdfjsLib.getDocument(file);
        } else {
            const buffer = await file.arrayBuffer();
            const typedarray = new Uint8Array(buffer);
            loadingTask = pdfjsLib.getDocument(typedarray);
        }
        
        const pdf = await loadingTask.promise;
        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1); // Reset to page 1 on new file
      } catch (error) {
        console.error("Error loading PDF:", error);
      }
    };

    loadPdf();
  }, [file]);

  useEffect(() => {
     if (!pdfDocument || !canvasRef.current) return;

     let renderTask: pdfjsLib.RenderTask;

     const renderPage = async () => {
       try {
         const page = await pdfDocument.getPage(currentPage);
         const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed

         const canvas = canvasRef.current;
         if (!canvas) return;
         
         const context = canvas.getContext('2d');
         if (!context) return;

         canvas.height = viewport.height;
         canvas.width = viewport.width;

         const renderContext = {
           canvasContext: context,
           viewport: viewport,
         };

         renderTask = page.render(renderContext);
         await renderTask.promise;

         // Notify parent of the rendered dimensions so the overlay can match
         onPageRendered({ width: viewport.width, height: viewport.height }, currentPage);
       } catch (error) {
         if (error instanceof pdfjsLib.RenderingCancelledException) {
             // We cancelled the render, this is fine
         } else {
             console.error("Error rendering page:", error);
         }
       }
     };

     renderPage();

     return () => {
       if (renderTask) {
         renderTask.cancel();
       }
     }
  }, [pdfDocument, currentPage, onPageRendered]);

  if (!file) {
      return <div className="pdf-placeholder">Please upload a PDF to begin.</div>;
  }

  return (
    <div className="pdf-viewer-container" style={{ position: 'relative', display: 'inline-block' }}>
       {/* 
         The canvas dimensions are set dynamically during rendering.
         We wrap it in a relatively positioned container so the overlay can position absolutely. 
       */}
      <canvas ref={canvasRef} style={{ display: 'block' }}/>
      
      {numPages > 0 && (
          <div className="pdf-controls" style={{ marginTop: '10px' }}>
            <button 
               disabled={currentPage <= 1} 
               onClick={() => setCurrentPage(p => p - 1)}
            >
                Previous
            </button>
            <span style={{ margin: '0 10px' }}>
                Page {currentPage} of {numPages}
            </span>
            <button 
               disabled={currentPage >= numPages} 
               onClick={() => setCurrentPage(p => p + 1)}
            >
                Next
            </button>
          </div>
      )}
    </div>
  );
};
