# autoPDF

Frontend-first PDF box annotation tool.

## Initial scope

- Upload and render PDFs in the browser
- Draw rectangular boxes on PDF pages
- Store per-page normalized coordinates
- Auto-generate a default label when none is supplied
- Support multi-page PDFs
- Keep annotation creation non-blocking

## Tech stack

- React
- TypeScript
- Vite
- PDF.js (`pdfjs-dist`)
- Vitest
- React Testing Library
- Playwright

## Development approach

- Test the annotation math and label generation first
- Keep PDF rendering thin
- Add UI in small vertical slices
