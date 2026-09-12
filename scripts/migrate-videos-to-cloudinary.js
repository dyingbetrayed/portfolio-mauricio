/**
 * Moves legacy local videos to Cloudinary and replaces their JSON references
 * with secure delivery URLs. The default is a read-only dry run. Pass --apply
 * only after confirming the list of files printed by the script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const homePath = path.join(projectRoot, 'src/content/home.json');
const projectsDir = path.join(projectRoot, 'src/content/projects');
const shouldApply = process.argv.includes('--apply');
const videoExtension = /\.(mp4|m4v|webm|ogv|ogg|mov)(?:$|[?#])/i;

const requiredEnvironment = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);

if (missingEnvironment.length) {
  console.error(`Missing required environment variables: ${missingEnvironment.join(', ')}`);
  console.error('Add them to .env and run this script again.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function splitSuffix(value) {
  return value.split(/[?#]/, 1)[0];
}

function localVideoPath(source) {
  if (!source || /^https?:\/\//i.test(source) || !videoExtension.test(source)) {
    return null;
  }

  const publicUrlPath = splitSuffix(source);
  if (!publicUrlPath.startsWith('/')) return null;

  const decodedPath = decodeURIComponent(publicUrlPath);
  const absolutePath = path.resolve(publicDir, `.${decodedPath}`);
  const publicRoot = `${publicDir}${path.sep}`;
  if (!absolutePath.startsWith(publicRoot) || !fs.existsSync(absolutePath)) return null;

  return absolutePath;
}

function slugSegment(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function publicIdFor(localPath) {
  const withoutExtension = path.relative(publicDir, localPath).replace(path.extname(localPath), '');
  const segments = withoutExtension.split(path.sep).map(slugSegment).filter(Boolean);
  return ['portfolio-mauricio', ...segments].join('/');
}

function uploadVideo(localPath) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      localPath,
      {
        resource_type: 'video',
        public_id: publicIdFor(localPath),
        overwrite: true,
        chunk_size: 6_000_000,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
  });
}

const homeData = readJson(homePath);
const projectEntries = fs.readdirSync(projectsDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({ file, path: path.join(projectsDir, file), data: readJson(path.join(projectsDir, file)) }));

const sourceUrls = new Set();
if (localVideoPath(homeData.hero_media)) sourceUrls.add(homeData.hero_media);
for (const project of projectEntries) {
  for (const source of project.data.images || []) {
    if (localVideoPath(source)) sourceUrls.add(source);
  }
}

if (sourceUrls.size === 0) {
  console.log('No local video references were found. Nothing to migrate.');
  process.exit(0);
}

console.log(`${shouldApply ? 'Migrating' : 'Dry run — would migrate'} ${sourceUrls.size} video(s):\n`);
for (const source of sourceUrls) {
  const localPath = localVideoPath(source);
  const size = localPath ? (fs.statSync(localPath).size / 1024 / 1024).toFixed(1) : '?';
  console.log(`  ${source} (${size} MB) → ${publicIdFor(localPath)}`);
}

if (!shouldApply) {
  console.log('\nNo files were uploaded or changed. Re-run with --apply to migrate these videos.');
  process.exit(0);
}

const replacements = new Map();
for (const source of sourceUrls) {
  const localPath = localVideoPath(source);
  console.log(`\nUploading ${source} in resumable chunks…`);
  const result = await uploadVideo(localPath);
  replacements.set(source, result.secure_url);
  console.log(`  ✓ ${result.secure_url}`);
}

let changedFiles = 0;
if (replacements.has(homeData.hero_media)) {
  homeData.hero_media = replacements.get(homeData.hero_media);
  fs.writeFileSync(homePath, `${JSON.stringify(homeData, null, 2)}\n`, 'utf8');
  changedFiles++;
}

for (const project of projectEntries) {
  if (!Array.isArray(project.data.images)) continue;
  const updatedImages = project.data.images.map((source) => replacements.get(source) || source);
  if (updatedImages.every((source, index) => source === project.data.images[index])) continue;

  project.data.images = updatedImages;
  fs.writeFileSync(project.path, `${JSON.stringify(project.data, null, 2)}\n`, 'utf8');
  changedFiles++;
}

console.log(`\n✓ Migration complete. Updated ${changedFiles} content file(s).`);
console.log('Legacy files were intentionally kept in public/. Remove them only after production verification.');
