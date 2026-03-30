import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import process from 'process'

function localApiPlugin() {
  return {
    name: 'local-api-plugin',
    configureServer(server: any) {
      const app = express();
      const templatesPath = path.resolve(process.cwd(), 'templates');
      
      if (!fs.existsSync(templatesPath)) {
        fs.mkdirSync(templatesPath, { recursive: true });
      }

      app.use('/api/templates/files', express.static(templatesPath));

      const storage = multer.diskStorage({
        destination: function (req, file, cb) {
          const templateName = req.body.name || 'Untitled';
          // Sanitize template name to avoid path traversal
          const safeName = templateName.replace(/[^a-z0-9-_ ]/gi, '').trim();
          const dir = path.join(templatesPath, safeName);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: function (req, file, cb) {
          cb(null, 'document.pdf');
        }
      });
      const upload = multer({ storage: storage });

      app.get('/api/templates', (req, res) => {
        try {
          if (!fs.existsSync(templatesPath)) {
             return res.json({ templates: [] });
          }
          const dirs = fs.readdirSync(templatesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          res.json({ templates: dirs });
        } catch (_e) {
          res.status(500).json({ error: 'Failed to read templates' });
        }
      });

      app.get('/api/templates/:name/boxes', (req, res) => {
        try {
          const templateName = req.params.name;
          const safeName = templateName.replace(/[^a-z0-9-_ ]/gi, '').trim();
          const jsonPath = path.join(templatesPath, safeName, 'template.json');
          if (fs.existsSync(jsonPath)) {
            const data = fs.readFileSync(jsonPath, 'utf8');
            res.json(JSON.parse(data));
          } else {
             res.status(404).json({ error: 'Not found' });
          }
        } catch (_e) {
          res.status(500).json({ error: 'Failed to read boxes' });
        }
      });

      app.post('/api/templates', upload.single('pdf'), (req, res) => {
        try {
          const templateName = req.body.name || 'Untitled';
          const safeName = templateName.replace(/[^a-z0-9-_ ]/gi, '').trim();
          const boxesJson = req.body.boxes;
          
          if (boxesJson) {
             const jsonPath = path.join(templatesPath, safeName, 'template.json');
             fs.writeFileSync(jsonPath, boxesJson);
          }
          res.json({ success: true, name: safeName });
        } catch (e) {
          console.error("Save error:", e);
          res.status(500).json({ error: 'Failed to save template', details: String(e) });
        }
      });

      server.middlewares.use(app);
    }
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts'
  }
})
