export interface Box {
  id: string;
  pageNumber: number;
  // Normalized coordinates (0 to 1) relative to page dimensions
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string; // Optional label, as per initial scope
}
