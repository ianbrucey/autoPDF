import React, { useState, useRef } from 'react';
import { Box } from '../types';

interface AnnotationOverlayProps {
  dimensions: { width: number; height: number } | null;
  currentPage: number;
  boxes: Box[];
  onAddBox: (_box: Box) => void;
  onRemoveBox: (id: string) => void;
}

export const AnnotationOverlay: React.FC<AnnotationOverlayProps> = ({ 
    dimensions, 
    currentPage, 
    boxes, 
    onAddBox,
    onRemoveBox
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  // If we don't know the dimensions yet (PDF hasn't rendered), don't show the overlay
  if (!dimensions) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only left clicks
    if (e.button !== 0) return;
    
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
    
    // Capture pointer so we keep getting events even if mouse leaves the overlay momentarily
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    // Constrain x and y to within the bounds of the container
    let currentX = e.clientX - rect.left;
    let currentY = e.clientY - rect.top;
    
    currentX = Math.max(0, Math.min(currentX, rect.width));
    currentY = Math.max(0, Math.min(currentY, rect.height));

    const x = Math.min(startPos.x, currentX);
    const y = Math.min(startPos.y, currentY);
    const w = Math.abs(currentX - startPos.x);
    const h = Math.abs(currentY - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing || !currentBox || !containerRef.current) return;
    
    (e.target as Element).releasePointerCapture(e.pointerId);
    setIsDrawing(false);

    // Don't add a box if it's too small (e.g., just a click)
    if (currentBox.w < 5 || currentBox.h < 5) {
        setCurrentBox(null);
        return;
    }

    // Convert to normalized coordinates (0 to 1) for storage
    const normalizedBox: Box = {
        id: `box-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        pageNumber: currentPage,
        x: currentBox.x / dimensions.width,
        y: currentBox.y / dimensions.height,
        width: currentBox.w / dimensions.width,
        height: currentBox.h / dimensions.height
    };

    onAddBox(normalizedBox);
    setCurrentBox(null);
  };

  return (
    <div 
        ref={containerRef}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dimensions.width,
            height: dimensions.height,
            cursor: 'crosshair',
            touchAction: 'none' // Prevent scrolling while trying to draw on touch devices
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp} // Handle cases where drawing is interrupted
    >
        {/* Render already drawn boxes for the current page */}
        {boxes.filter(b => b.pageNumber === currentPage).map(box => (
            <div 
                key={box.id}
                style={{
                    position: 'absolute',
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`,
                    border: '2px solid rgba(255, 0, 0, 0.8)',
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto' // Re-enable pointer events so we can click the delete button
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the overlay's pointer events
                        onRemoveBox(box.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Also stop pointer down so it doesn't start drawing
                    style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title="Delete box"
                >
                    &times;
                </button>
            </div>
        ))}

        {/* Render the box currently being drawn */}
        {isDrawing && currentBox && (
            <div 
                style={{
                    position: 'absolute',
                    left: currentBox.x,
                    top: currentBox.y,
                    width: currentBox.w,
                    height: currentBox.h,
                    border: '2px dashed rgba(0, 120, 255, 0.8)',
                    backgroundColor: 'rgba(0, 120, 255, 0.2)',
                    boxSizing: 'border-box',
                    pointerEvents: 'none'
                }}
            />
        )}
    </div>
  );
};
