/**
 * generate-og.js
 *
 * Genera imágenes optimizadas para Open Graph (redes sociales) por cada proyecto.
 * - Lee la primera imagen de cada proyecto (ya optimizada por optimize-images.js)
 * - Genera una versión 1200x630 en public/og/og-{slug}.jpg
 * - Esta imagen es la que se muestra en el preview de WhatsApp, Twitter, etc.
 *
 * Uso: node scripts/generate-og.js
 * En build: se ejecuta automáticamente via "prebuild" en package.json (después de optimize-images)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectsDir = path.resolve(__dirname, '../src/content/projects');
const publicDir = path.resolve(__dirname, '../public');
const ogDir = path.resolve(publicDir, 'og');

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
        const cleanImagePath = firstImage.split('?')[0].split('#')[0];
        const absoluteImagePath = path.join(publicDir, cleanImagePath);

        if (fs.existsSync(absoluteImagePath)) {
          // Usar el slug del proyecto como nombre de la imagen OG (más limpio que el nombre del archivo)
          const projectSlug = path.basename(file, '.json');
          const outputFilename = `og-${projectSlug}.jpg`;
          const outputPath = path.join(ogDir, outputFilename);

          if (!fs.existsSync(outputPath)) {
            console.log(`  📸 OG: ${file} → ${outputFilename}`);
            await sharp(absoluteImagePath)
              .resize(1200, 630, {
                fit: 'cover',
                position: 'center'
              })
              .jpeg({ quality: 80, progressive: true })
              .toFile(outputPath);
            processed++;
          }
        } else {
          console.warn(`  [Warning] Source not found for OG: ${absoluteImagePath}`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }

  console.log(`\n✅ OG images done. Generated: ${processed} new images.`);
}

console.log('🔗 Generating Open Graph preview images...\n');
generateOgImages().catch(console.error);
