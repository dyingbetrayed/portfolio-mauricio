import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectsDir = path.resolve(__dirname, '../src/content/projects');
const publicDir = path.resolve(__dirname, '../public');
const ogDir = path.resolve(publicDir, 'og');

// Crear directorio og si no existe
if (!fs.existsSync(ogDir)) {
  fs.mkdirSync(ogDir, { recursive: true });
}

async function generateOgImages() {
  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  let processed = 0;

  for (const file of files) {
    const filePath = path.join(projectsDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const project = JSON.parse(content);

      if (project.images && project.images.length > 0) {
        const firstImage = project.images[0];
        // expected format: /work/filename.png
        
        // Remove query params or hashes just in case
        const cleanImagePath = firstImage.split('?')[0].split('#')[0];
        
        const absoluteImagePath = path.join(publicDir, cleanImagePath);

        if (fs.existsSync(absoluteImagePath)) {
          const basename = path.basename(cleanImagePath, path.extname(cleanImagePath));
          const outputFilename = `og-${basename}.jpg`;
          const outputPath = path.join(ogDir, outputFilename);

          // Generar solo si no existe o si queremos forzar (podría comprobar fechas, pero comprobar existencia es rápido)
          if (!fs.existsSync(outputPath)) {
            console.log(`Generating OG image for: ${file} -> ${outputFilename}`);
            await sharp(absoluteImagePath)
              .resize(1200, 630, {
                fit: 'cover',
                position: 'center'
              })
              .jpeg({ quality: 75, progressive: true })
              .toFile(outputPath);
            processed++;
          }
        } else {
          console.warn(`[Warning] Source image not found for ${file}: ${absoluteImagePath}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  console.log(`OG image generation complete. Generated ${processed} new images.`);
}

generateOgImages().catch(console.error);
