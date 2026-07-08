require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL;

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

console.log('🚀 Starting OrderOps Build Process...\n');

// 1. Clean the /dist directory
if (fs.existsSync(DIST_DIR)) {
    console.log('🧹 Cleaning old /dist folder...');
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DIST_DIR, { recursive: true });

// --- AUTO-VERSION GENERATOR (YYYY.MM.DD.HHMM) ---
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');

const AUTO_VERSION = `${year}.${month}.${day}.${hours}${minutes}`;
console.log(`🏷️ Setting Global Version: ${AUTO_VERSION}`);

// 2. Recursively process directories
function buildDirectory(currentSrc, currentDist) {
    // Ensure the current destination directory exists
    if (!fs.existsSync(currentDist)) {
        fs.mkdirSync(currentDist, { recursive: true });
    }

    const items = fs.readdirSync(currentSrc);

    for (const item of items) {
        const srcPath = path.join(currentSrc, item);
        const distPath = path.join(currentDist, item);
        const stat = fs.statSync(srcPath);

        if (stat.isDirectory()) {
            // Traverse deeper (e.g., into /shared)
            buildDirectory(srcPath, distPath);
        } else {
            if (item.endsWith('.user.js')) {
                // It's a Tampermonkey script, process the metadata
                compileUserScript(srcPath, distPath, item);
            } else {
                // It's a regular file (e.g., core.js), just copy it
                fs.copyFileSync(srcPath, distPath);
                console.log(`📄 Copied: ${item}`);
            }
        }
    }
}

// 3. Transform the Userscript Metadata
function compileUserScript(srcPath, distPath, filename) {
    let content = fs.readFileSync(srcPath, 'utf8');

    // A. Strip "(dev)" from the @name tag
    if (!process.env.DEV_MODE)
        content = content.replace(/(@name\s+.*?)(\s*\(dev\))/gi, '$1');

    // B. Strip out any existing @updateURL, @downloadURL and @version lines
    content = content.replace(/^\/\/\s*@(version|(update|download)URL).*$\n/gm, '');

    // C. Inject the new Auto-Version and URLs
    const fileUrl = `${BASE_URL}/${filename}`;
    const injectionBlock = `// @version      ${AUTO_VERSION}
// @updateURL    ${fileUrl}
// @downloadURL  ${fileUrl}
// ==/UserScript==`;
    
    content = content.replace(/\/\/\s*==\/UserScript==/i, injectionBlock);

    // Save the new file
    fs.writeFileSync(distPath, content, 'utf8');
    console.log(`📦 Compiled: ${filename}`);
}

// Run the build
buildDirectory(SRC_DIR, DIST_DIR);

console.log('\n✅ Build complete! Files are ready in /dist.');