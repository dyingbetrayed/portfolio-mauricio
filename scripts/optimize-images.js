/**
 * optimize-images.js
 *
 * Comprime y organiza las imágenes de cada proyecto en subcarpetas dentro de public/work/.
 * - Lee todos los .json de src/content/projects/
 * - Por cada imagen en "images", genera una versión WebP comprimida
 *   en public/work/{slug}/{original-name}.webp
 * - Actualiza los paths en los archivos JSON con las nuevas rutas
 * - Elimina las imágenes originales después de comprimir exitosamente
 *
 * Uso: node scripts/optimize-images.js
 * En build: se ejecuta automáticamente via "prebuild" en package.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectsDir = path.resolve(__dirname, '../src/content/projects');
const publicDir = path.resolve(__dirname, '../public');
const workDir = path.resolve(publicDir, 'work');

// Configuración de compresión
const WEBP_QUALITY = 82;  // Prácticamente indistinguible del original en pantalla
const MAX_WIDTH = 2400;   // Suficiente para pantallas 4K
const MAX_HEIGHT = 2400;

async function optimizeImages() {
  const files = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));

  // Mapa de paths originales que se van a migrar → para borrarlos al final
  // Usamos un Set para evitar duplicados (si dos proyectos comparten imagen)
  const originalsToDelete = new Set();

  let totalGenerated = 0;
  let totalSkipped = 0;

  for (const file of files) {
    const filePath = path.join(projectsDir, file);
    let content, project;

    try {
      content = fs.readFileSync(filePath, 'utf-8');
      project = JSON.parse(content);
    } catch (err) {
      console.error(`[Error] Parsing ${file}:`, err.message);
      continue;
    }

    if (!project.images || project.images.length === 0) {
      console.log(`[Skip] ${file} — no images`);
      continue;
    }

    const projectSlug = path.basename(file, '.json');
    const projectFolder = path.join(workDir, projectSlug);

    if (!fs.existsSync(projectFolder)) {
      fs.mkdirSync(projectFolder, { recursive: true });
    }

    console.log(`\n📁 ${file}`);

    const newImages = [];
    let jsonModified = false;

    for (const imagePath of project.images) {
      const cleanPath = imagePath.split('?')[0].split('#')[0];
      const absoluteSrc = path.join(publicDir, cleanPath);

      // Si la imagen ya fue migrada (ya apunta a una subcarpeta), no la volvemos a procesar
      const isAlreadyMigrated = cleanPath.startsWith(`/work/${projectSlug}/`);
      if (isAlreadyMigrated) {
        newImages.push(imagePath);
        totalSkipped++;
        continue;
      }

      if (!fs.existsSync(absoluteSrc)) {
        console.warn(`  ⚠ Source not found: ${cleanPath}`);
        newImages.push(imagePath); // conservar path original si no existe
        continue;
      }

      const originalBasename = path.basename(cleanPath, path.extname(cleanPath));
      const outputFilename = `${originalBasename}.webp`;
      const outputPath = path.join(projectFolder, outputFilename);
      const newPublicPath = `/work/${projectSlug}/${outputFilename}`;

      if (!fs.existsSync(outputPath)) {
        try {
          await sharp(absoluteSrc)
            .resize(MAX_WIDTH, MAX_HEIGHT, {
              fit: 'inside',            // Preserva aspect ratio, no recorta
              withoutEnlargement: true  // No escala hacia arriba si ya es más pequeña
            })
            .webp({ quality: WEBP_QUALITY, effort: 4 })
            .toFile(outputPath);

          const originalSize = fs.statSync(absoluteSrc).size;
          const newSize = fs.statSync(outputPath).size;
          const reduction = Math.round((1 - newSize / originalSize) * 100);
          console.log(`  ✓ ${path.basename(cleanPath)} → ${outputFilename} (-${reduction}%)`);

          originalsToDelete.add(absoluteSrc);
          totalGenerated++;
          jsonModified = true;
        } catch (err) {
          console.error(`  ✗ Error: ${cleanPath}: ${err.message}`);
          newImages.push(imagePath);
          continue;
        }
      } else {
        // Ya existe la versión WebP, igual marcamos el original para borrar
        originalsToDelete.add(absoluteSrc);
        totalSkipped++;
      }

      newImages.push(newPublicPath);
      jsonModified = true;
    }

    // Actualizar el JSON con las nuevas rutas
    if (jsonModified) {
      project.images = newImages;
      const updatedContent = JSON.stringify(project, null, 2) + '\n';
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`  ✏  JSON updated`);
    }
  }

  // Eliminar imágenes originales que fueron migradas exitosamente
  if (originalsToDelete.size > 0) {
    console.log(`\n🗑  Deleting ${originalsToDelete.size} original files...`);
    for (const originalPath of originalsToDelete) {
      try {
        fs.unlinkSync(originalPath);
        console.log(`  ✓ Deleted: ${path.basename(originalPath)}`);
      } catch (err) {
        console.warn(`  ⚠ Could not delete ${originalPath}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Done! Generated: ${totalGenerated} | Skipped: ${totalSkipped} | Deleted originals: ${originalsToDelete.size}`);
}

console.log('🖼  Optimizing and organizing project images...\n');
optimizeImages().catch(console.error);
