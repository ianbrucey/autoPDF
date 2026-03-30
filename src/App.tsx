import React, { useState, useEffect } from 'react'
import { PDFViewer } from './components/PDFViewer'
import { AnnotationOverlay } from './components/AnnotationOverlay'
import { Box } from './types'
import './App.css'

function App() {
  const [file, setFile] = useState<File | string | null>(null);
  const [dimensions, setDimensions] = useState<{width: number, height: number} | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBoxListOpen, setIsBoxListOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<string[]>([]);
  const [boxes, setBoxes] = useState<Box[]>(() => {
    const saved = localStorage.getItem('autoPDF-boxes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved boxes", e);
      }
    }
    return [];
  });
  
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setAvailableTemplates(data.templates || []);
    } catch (e) {
      console.error("Failed to fetch templates", e);
    }
  };

  // Auto-save to LocalStorage whenever boxes change
  useEffect(() => {
    localStorage.setItem('autoPDF-boxes', JSON.stringify(boxes));
  }, [boxes]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
          setFile(selectedFile);
          // Reset state for new file
          setBoxes([]);
          setDimensions(null);
          setCurrentPage(1);
      }
  };

  const handlePageRendered = (dims: {width: number, height: number}, page: number) => {
      setDimensions(dims);
      setCurrentPage(page);
  };

  const handleAddBox = (box: Box) => {
      setBoxes(prev => [...prev, box]);
  };

  const handleRemoveBox = (id: string) => {
      setBoxes(prev => prev.filter(b => b.id !== id));
  };

  const handleExportTemplate = async () => {
      const name = prompt("Enter a name for this template:", "My-Template");
      if (!name) return;

      const formData = new FormData();
      formData.append('name', name);
      formData.append('boxes', JSON.stringify(boxes));

      if (typeof file !== 'string' && file) {
          formData.append('pdf', file);
      }

      try {
          const res = await fetch('/api/templates', {
              method: 'POST',
              body: formData
          });
          if (res.ok) {
              alert("Template saved successfully!");
              fetchTemplates();
          } else {
              const err = await res.json();
              alert(`Error: ${err.error}`);
          }
      } catch (e) {
          console.error(e);
          alert("Failed to save template.");
      }
  };

  const handleLoadTemplate = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const name = e.target.value;
      if (!name) return;

      try {
          const res = await fetch(`/api/templates/${encodeURIComponent(name)}/boxes`);
          if (res.ok) {
              const loadedBoxes = await res.json();
              setBoxes(loadedBoxes);
              setFile(`/api/templates/files/${encodeURIComponent(name)}/document.pdf`);
          } else {
              alert("Could not load template JSON");
          }
      } catch (e) {
          console.error("Failed to load template", e);
      }
       
      // Reset dropdown to "Select..."
      e.target.value = "";
  };

  return (
    <div className="app-container">
      <header className="app-header">
         <h1>autoPDF</h1>
         <div className="header-actions">
            <input 
                type="file" 
                accept="application/pdf" 
                onChange={handleFileChange}
                className="file-input"
            />
            
            <select onChange={handleLoadTemplate} defaultValue="" style={{ padding: '0.4rem', borderRadius: '4px' }}>
              <option value="" disabled>Load Template...</option>
              {availableTemplates.map(tOption => (
                 <option key={tOption} value={tOption}>{tOption}</option>
              ))}
            </select>
            
            <button onClick={handleExportTemplate} disabled={!file && boxes.length === 0}>
              Save Template
            </button>
            <div className="dropdown-container">
              <button onClick={() => setIsBoxListOpen(!isBoxListOpen)}>
                View Boxes ({boxes.length})
              </button>
              {isBoxListOpen && (
                <div className="boxes-dropdown">
                  {boxes.length === 0 ? (
                    <p style={{ margin: 0, padding: '1rem', color: '#7f8c8d' }}>No boxes drawn</p>
                  ) : (
                    <ul>
                      {boxes.map(b => (
                        <li key={b.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>Page {b.pageNumber}</strong>
                            <button 
                                onClick={() => handleRemoveBox(b.id)}
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', backgroundColor: '#e74c3c' }}
                            >
                                Delete
                            </button>
                          </div>
                          <div>x: {b.x.toFixed(3)}, y: {b.y.toFixed(3)}</div>
                          <div>w: {b.width.toFixed(3)}, h: {b.height.toFixed(3)}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
         </div>
      </header>

      <main className="main-content" onClick={() => setIsBoxListOpen(false)}>
          <div className="pdf-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
              <PDFViewer 
                  file={file} 
                  onPageRendered={handlePageRendered} 
              />
              <AnnotationOverlay 
                 dimensions={dimensions}
                 currentPage={currentPage}
                 boxes={boxes}
                 onAddBox={handleAddBox}
                 onRemoveBox={handleRemoveBox}
              />
          </div>
      </main>

    </div>
  )
}

export default App
