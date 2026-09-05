import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectsDir = path.join(__dirname, '../src/content/projects');
const workDir = path.join(__dirname, '../public/work');

const categoryMap = {
  'category_1': 'branding',
  'category_2': 'art-direction',
  'category_3': 'merch',
  'category_4': 'hybrid'
};

// All known category folder names for detection
const allCategoryFolders = new Set(Object.values(categoryMap));

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/[\s\W-]+/g, '-');
}

function syncMedia() {
  if (!fs.existsSync(projectsDir)) return;

  const projectFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  let updatedCount = 0;
  let movedCount = 0;

  for (const file of projectFiles) {
    const projectSlug = file.replace('.json', '');
    const fullPath = path.join(projectsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    let project;
    try {
      project = JSON.parse(content);
    } catch (e) {
      console.error(`  ✗ Error parsing ${file}:`, e.message);
      continue;
    }

    const expectedCatFolder = categoryMap[project.category];
    if (!expectedCatFolder) continue;

    // The correct destination for this project's images
    const expectedDir = path.join(workDir, expectedCatFolder, projectSlug);
    const expectedPrefix = `/work/${expectedCatFolder}/${projectSlug}/`;

    if (!project.images || !Array.isArray(project.images) || project.images.length === 0) continue;

    let needsUpdate = false;
    const newImages = [];

    for (const imgPath of project.images) {
      // Already correct?
      if (imgPath.startsWith(expectedPrefix)) {
        newImages.push(imgPath);
        continue;
      }

      // Parse the current path
      const filename = path.basename(imgPath);
      const newPublicPath = `${expectedPrefix}${filename}`;

      // Find where the file currently lives on disk
      // Could be: /work/filename.png (flat in category), /work/catFolder/filename.png, /work/catFolder/slug/filename.png, etc.
      const possibleSources = [];

      // 1. Check if it's at the path indicated by the JSON
      const fromJson = path.join(workDir, '..', 'public', imgPath.startsWith('/') ? imgPath.substring(1) : imgPath);
      possibleSources.push(fromJson);

      // 2. Check flat in global work dir
      possibleSources.push(path.join(workDir, filename));

      // 3. Check flat in expected category dir
      possibleSources.push(path.join(workDir, expectedCatFolder, filename));

      // 4. Check in any other category folder (flat)
      for (const catFolder of allCategoryFolders) {
        possibleSources.push(path.join(workDir, catFolder, filename));
      }

      // 5. Check in any other category/slug subfolder
      for (const catFolder of allCategoryFolders) {
        const subfolders = [];
        const catDir = path.join(workDir, catFolder);
        if (fs.existsSync(catDir)) {
          try {
            for (const entry of fs.readdirSync(catDir, { withFileTypes: true })) {
              if (entry.isDirectory()) {
                possibleSources.push(path.join(catDir, entry.name, filename));
              }
            }
          } catch (e) { /* ignore */ }
        }
      }

      // Find the first source that actually exists
      let sourceFile = null;
      for (const src of possibleSources) {
        if (fs.existsSync(src)) {
          sourceFile = src;
          break;
        }
      }

      if (sourceFile) {
        const destFile = path.join(expectedDir, filename);
        // Only move if source != destination
        if (path.resolve(sourceFile) !== path.resolve(destFile)) {
          ensureDirSync(expectedDir);
          try {
            fs.renameSync(sourceFile, destFile);
            movedCount++;
            console.log(`  → Moved: ${path.relative(workDir, sourceFile)} → ${path.relative(workDir, destFile)}`);
          } catch (err) {
            // If rename fails (cross-device), try copy+delete
            try {
              fs.copyFileSync(sourceFile, destFile);
              fs.unlinkSync(sourceFile);
              movedCount++;
              console.log(`  → Moved (copy): ${path.relative(workDir, sourceFile)} → ${path.relative(workDir, destFile)}`);
            } catch (copyErr) {
              console.error(`  ✗ Failed to move ${sourceFile}:`, copyErr.message);
              newImages.push(imgPath); // Keep old path
              continue;
            }
          }
        }
      } else {
        console.warn(`  ⚠ File not found for ${imgPath} (project: ${projectSlug})`);
      }

      newImages.push(newPublicPath);
      needsUpdate = true;
    }

    if (needsUpdate) {
      project.images = newImages;
      fs.writeFileSync(fullPath, JSON.stringify(project, null, 2) + '\n', 'utf8');
      updatedCount++;
      console.log(`  ✓ Updated JSON: ${file}`);
    }
  }

  // Clean up empty directories in work folder
  for (const catFolder of allCategoryFolders) {
    const catDir = path.join(workDir, catFolder);
    if (!fs.existsSync(catDir)) continue;
    try {
      for (const entry of fs.readdirSync(catDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          const subDir = path.join(catDir, entry.name);
          const files = fs.readdirSync(subDir);
          if (files.length === 0) {
            fs.rmdirSync(subDir);
            console.log(`  🗑 Removed empty dir: ${catFolder}/${entry.name}`);
          }
        }
      }
    } catch (e) { /* ignore */ }
  }

  console.log(`\n✅ Media sync complete. Updated ${updatedCount} project files, moved ${movedCount} files.`);
}

syncMedia();
