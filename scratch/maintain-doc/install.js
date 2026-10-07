const fs = require('fs');
const path = require('path');

const SDK_DIR = __dirname;

function findProjectRoot(startDir) {
    let curr = startDir;
    while (curr && curr !== path.dirname(curr)) {
        if (fs.existsSync(path.join(curr, 'index.html')) || fs.existsSync(path.join(curr, 'package.json'))) {
            return curr;
        }
        curr = path.dirname(curr);
    }
    
    return path.resolve(startDir, '../../../../..');
}

const ROOT_DIR = findProjectRoot(SDK_DIR);
const CONFIG_FILE = path.join(SDK_DIR, 'maintain.config.js');

const args = process.argv.slice(2);
let customSite = null;
let customApiUrl = null;
let customPasscode = null;
let customDest = null;
let checkOnly = false;

args.forEach(arg => {
    if (arg.startsWith('--site=')) {
        customSite = arg.split('=')[1].trim();
    } else if (arg.startsWith('--api=')) {
        customApiUrl = arg.split('=')[1].trim();
    } else if (arg.startsWith('--passcode=')) {
        customPasscode = arg.split('=')[1].trim();
    } else if (arg.startsWith('--dest=')) {
        customDest = path.resolve(arg.split('=')[1].trim());
    } else if (arg === '--check') {
        checkOnly = true;
    }
});

console.log('===============================================================');
console.log('🚀 Universal Maintenance SDK - Enterprise Automated Installer');
console.log('===============================================================');
console.log(`📍 SDK Location:   ${SDK_DIR}`);
console.log(`📍 Project Root:   ${ROOT_DIR}`);
if (customDest) {
    console.log(`📍 Custom Dest:    ${customDest}`);
}

let activeSdkDir = SDK_DIR;
if (customDest && customDest !== SDK_DIR) {
    if (!fs.existsSync(customDest)) {
        fs.mkdirSync(customDest, { recursive: true });
    }
    const filesToCopy = ['maintain.js', 'maintain.config.js', 'README.md', 'AI_AGENT_DOCS.md', 'openapi.json', 'demo.html'];
    filesToCopy.forEach(f => {
        const srcPath = path.join(SDK_DIR, f);
        const dstPath = path.join(customDest, f);
        if (fs.existsSync(srcPath)) {
            fs.copyFileSync(srcPath, dstPath);
        }
    });
    activeSdkDir = customDest;
    console.log(`✔ Copied SDK files to custom destination: ${customDest}`);
}

const activeConfigFile = path.join(activeSdkDir, 'maintain.config.js');
if (fs.existsSync(activeConfigFile)) {
    let configContent = fs.readFileSync(activeConfigFile, 'utf8');

    if (customSite) {
        configContent = configContent.replace(/site:\s*["'][^"']+["']/, `site: "${customSite}"`);
        console.log(`✔ Configured Site ID: "${customSite}"`);
    }

    if (customApiUrl) {
        configContent = configContent.replace(/apiUrl:\s*[^,\n]+/, `apiUrl: "${customApiUrl}"`);
        console.log(`✔ Configured API URL: "${customApiUrl}"`);
    }

    if (customPasscode) {
        configContent = configContent.replace(/passcode:\s*["'][^"']+["']/, `passcode: "${customPasscode}"`);
        console.log(`✔ Configured Admin Passcode: "${customPasscode}"`);
    }

    fs.writeFileSync(activeConfigFile, configContent, 'utf8');
} else {
    console.warn(`⚠ maintain.config.js not found at ${activeConfigFile}`);
}

if (checkOnly) {
    console.log('\n[Check Mode] Configuration verified. Exiting without modifying project HTML files.');
    process.exit(0);
}

function getHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            
            if (file !== 'node_modules' && file !== '.git' && file !== '.agents' && file !== 'vendor') {
                getHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html') && !file.includes('demo') && !file.includes('test-demo')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const htmlFiles = getHtmlFiles(ROOT_DIR);
console.log(`\nScanning ${htmlFiles.length} HTML files for Maintenance SDK injection...\n`);

let updatedCount = 0;
let alreadyInstalledCount = 0;

htmlFiles.forEach(file => {
    const relativePath = path.relative(ROOT_DIR, file);
    let content = fs.readFileSync(file, 'utf8');

    const fileDir = path.dirname(file);
    let relToSdk = path.relative(fileDir, activeSdkDir).replace(/\\/g, '/');
    if (!relToSdk.startsWith('.')) relToSdk = './' + relToSdk;

    const scriptTags = 
`    <!-- Universal Maintenance SDK (Central Maintenance Manager) -->
    <script src="${relToSdk}/maintain.config.js"></script>
    <script src="${relToSdk}/maintain.js"></script>`;

    const hasNewSdkScript = content.includes(`${relToSdk}/maintain.js`) && content.includes(`${relToSdk}/maintain.config.js`);
    const hasAnyMaintainScript = content.includes('maintain.js');

    if (hasNewSdkScript) {
        console.log(`- ${relativePath}: SDK already up to date.`);
        alreadyInstalledCount++;
    } else if (hasAnyMaintainScript) {
        
        content = content.replace(/(?:<!--.*?Maintenance.*?-->\s*)?<script[^>]*src=["'][^"']*maintain\.config\.js["'][^>]*><\/script>\s*<script[^>]*src=["'][^"']*maintain\.js["'][^>]*><\/script>/gi, scriptTags);
        content = content.replace(/<script[^>]*src=["'][^"']*maintain\.js["'][^>]*><\/script>/gi, scriptTags);
        fs.writeFileSync(file, content, 'utf8');
        console.log(`✔ ${relativePath}: Upgraded script reference to ${relToSdk}/`);
        updatedCount++;
    } else {
        
        if (content.includes('</head>')) {
            content = content.replace('</head>', `${scriptTags}\n</head>`);
            fs.writeFileSync(file, content, 'utf8');
            console.log(`✔ ${relativePath}: Injected Maintenance SDK.`);
            updatedCount++;
        } else {
            console.warn(`⚠ ${relativePath}: Could not find </head> tag.`);
        }
    }
});

function syncLegacyFile(srcFile, dstFile) {
    if (fs.existsSync(srcFile)) {
        const dstDir = path.dirname(dstFile);
        if (!fs.existsSync(dstDir)) fs.mkdirSync(dstDir, { recursive: true });
        fs.copyFileSync(srcFile, dstFile);
        console.log(`✔ Synced to legacy location: ${path.relative(ROOT_DIR, dstFile)}`);
    }
}

const rootMaintainJs = path.join(ROOT_DIR, 'maintain', 'maintain.js');
const rootMaintainConfig = path.join(ROOT_DIR, 'maintain', 'maintain.config.js');
const legacyUtilMaintainJs = path.join(ROOT_DIR, 'scss', 'bootstrap', 'scss', 'utilities', 'maintain.js');

syncLegacyFile(path.join(activeSdkDir, 'maintain.js'), rootMaintainJs);
syncLegacyFile(path.join(activeSdkDir, 'maintain.config.js'), rootMaintainConfig);
syncLegacyFile(path.join(activeSdkDir, 'maintain.js'), legacyUtilMaintainJs);

console.log('\n===============================================================');
console.log('✨ Installation & Synchronization Complete!');
console.log(`- Updated HTML files:    ${updatedCount}`);
console.log(`- Already installed:     ${alreadyInstalledCount}`);
console.log(`- Active SDK Folder:     ${path.relative(ROOT_DIR, activeSdkDir)}`);
console.log(`- Interactive Testbed:   ${path.relative(ROOT_DIR, path.join(activeSdkDir, 'demo.html'))}`);
console.log('===============================================================\n');
