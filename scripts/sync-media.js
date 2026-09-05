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

function ensureDirSync(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function syncMedia() {
  if (!fs.existsSync(projectsDir)) return;

  const projectFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.json'));
  let updatedCount = 0;
  let movedFoldersCount = 0;

  for (const file of projectFiles) {
    const slug = file.replace('.json', '');
    const fullPath = path.join(projectsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    let project;
    try {
      project = JSON.parse(content);
    } catch (e) {
      console.error(`Error parsing ${file}:`, e);
      continue;
    }

    const expectedFolder = categoryMap[project.category];
    if (!expectedFolder) continue; // Unknown category, skip

    const expectedPrefix = `/work/${expectedFolder}/${slug}/`;
    let needsUpdate = false;
    let oldPrefixFound = null;

    if (project.images && Array.isArray(project.images)) {
      project.images = project.images.map(imgPath => {
        // Find if the image is in a different folder
        const match = imgPath.match(/^\/work\/([^/]+)\/([^/]+)\/(.+)$/);
        if (match) {
          const currentFolder = match[1];
          const currentSlug = match[2];
          const filename = match[3];

          if (currentFolder !== expectedFolder || currentSlug !== slug) {
            oldPrefixFound = { folder: currentFolder, slug: currentSlug };
            needsUpdate = true;
            return `/work/${expectedFolder}/${slug}/${filename}`;
          }
        }
        return imgPath;
      });
    }

    if (needsUpdate && oldPrefixFound) {
      // 1. Move the folder physically
      const oldFolderPath = path.join(workDir, oldPrefixFound.folder, oldPrefixFound.slug);
      const newFolderPath = path.join(workDir, expectedFolder, slug);
      
      if (fs.existsSync(oldFolderPath)) {
        ensureDirSync(path.join(workDir, expectedFolder));
        try {
          fs.renameSync(oldFolderPath, newFolderPath);
          movedFoldersCount++;
          console.log(`Moved media folder from ${oldPrefixFound.folder}/${oldPrefixFound.slug} to ${expectedFolder}/${slug}`);
        } catch (err) {
          console.error(`Failed to move folder ${oldFolderPath} to ${newFolderPath}:`, err);
        }
      }

      // 2. Update JSON
      fs.writeFileSync(fullPath, JSON.stringify(project, null, 2) + '\n', 'utf8');
      updatedCount++;
      console.log(`Updated JSON for ${file} to match category ${project.category}`);
    }
  }

  console.log(`\nMedia sync complete. Updated ${updatedCount} project files and moved ${movedFoldersCount} folders.`);
}

syncMedia();
