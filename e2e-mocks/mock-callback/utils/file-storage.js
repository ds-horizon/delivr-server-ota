const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yauzl = require('yauzl');

// Storage directory - will be created in the container
const STORAGE_DIR = process.env.STORAGE_DIR || '/tmp/codepush-packages';

/**
 * Ensure storage directory exists
 */
function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Generate a unique filename for a package
 * Format: {timestamp}-{random}.zip
 */
function generateFileName() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.zip`;
}

/**
 * Hash a stream
 */
function hashStream(readStream) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    
    readStream.on('error', reject);
    readStream.on('data', (chunk) => hash.update(chunk));
    readStream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}

/**
 * Normalize file path (replace backslashes with forward slashes)
 */
function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if file should be ignored
 */
function isIgnored(relativeFilePath) {
  const __MACOSX = '__MACOSX/';
  const DS_STORE = '.DS_Store';
  return relativeFilePath.startsWith(__MACOSX) || 
         relativeFilePath === DS_STORE || 
         relativeFilePath.endsWith('/' + DS_STORE);
}

/**
 * Generate package manifest from ZIP file (matches real implementation)
 * Extracts files from ZIP and hashes each file individually, ignoring ZIP metadata
 */
function generatePackageManifestFromZip(filePath) {
  return new Promise((resolve, reject) => {
    let zipFile = null;
    
    yauzl.open(filePath, { lazyEntries: true }, (error, openedZipFile) => {
      if (error) {
        // Not a ZIP file, return null
        resolve(null);
        return;
      }

      zipFile = openedZipFile;
      const fileHashesMap = new Map();
      const hashFilePromises = [];

      zipFile.readEntry();
      
      zipFile.on('error', (err) => {
        if (zipFile) zipFile.close();
        reject(err);
      });
      
      zipFile.on('entry', (entry) => {
        const fileName = normalizePath(entry.fileName);
        
        if (isIgnored(fileName)) {
          zipFile.readEntry();
          return;
        }

        zipFile.openReadStream(entry, (error, readStream) => {
          if (error) {
            if (zipFile) zipFile.close();
            reject(error);
            return;
          }

          hashFilePromises.push(
            hashStream(readStream).then((hash) => {
              fileHashesMap.set(fileName, hash);
              zipFile.readEntry();
            }).catch((err) => {
              if (zipFile) zipFile.close();
              reject(err);
            })
          );
        });
      });

      zipFile.on('end', () => {
        Promise.all(hashFilePromises)
          .then(() => {
            if (zipFile) zipFile.close();
            resolve(fileHashesMap);
          })
          .catch((err) => {
            if (zipFile) zipFile.close();
            reject(err);
          });
      });
    });
  });
}

/**
 * Compute package hash from manifest (matches real implementation)
 */
function computePackageHashFromManifest(fileHashesMap) {
  const CODEPUSH_METADATA = '.codepushrelease';
  let entries = [];

  fileHashesMap.forEach((hash, name) => {
    // Skip .codepushrelease file when computing package hash
    if (name !== CODEPUSH_METADATA && !name.endsWith('/' + CODEPUSH_METADATA)) {
      entries.push(name + ':' + hash);
    }
  });

  // Sort alphabetically (matches real implementation)
  entries = entries.sort();

  // Hash the JSON string of sorted entries
  return crypto.createHash('sha256')
    .update(JSON.stringify(entries))
    .digest('hex');
}

/**
 * Save uploaded file to storage
 * @param {Buffer|Stream} fileData - The file data to save
 * @param {string} originalName - Original filename
 * @returns {Promise<{filePath: string, fileName: string, size: number, hash: string}>}
 */
async function saveFile(fileData, originalName = null) {
  ensureStorageDir();
  
  const fileName = generateFileName();
  const filePath = path.join(STORAGE_DIR, fileName);
  
  // Handle both Buffer and Stream
  if (Buffer.isBuffer(fileData)) {
    fs.writeFileSync(filePath, fileData);
  } else {
    // If it's a stream, write it to file
    const writeStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
      fileData.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }
  
  // Get file stats
  const stats = fs.statSync(filePath);
  const size = stats.size;
  
  // Compute hash - use manifest approach for ZIP files (matches real implementation)
  // This ignores ZIP metadata and only hashes file contents
  let hash;
  try {
    const manifest = await generatePackageManifestFromZip(filePath);
    if (manifest) {
      // ZIP file - compute hash from manifest
      hash = computePackageHashFromManifest(manifest);
    } else {
      // Not a ZIP file - hash the entire file
      const fileBuffer = fs.readFileSync(filePath);
      hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }
  } catch (error) {
    // Fallback to file hash if ZIP processing fails
    console.error('Error processing ZIP, falling back to file hash:', error);
    const fileBuffer = fs.readFileSync(filePath);
    hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }
  
  return {
    filePath,
    fileName,
    size,
    hash
  };
}

/**
 * Get file path by filename
 * @param {string} fileName - The filename
 * @returns {string|null} - Full path if file exists, null otherwise
 */
function getFilePath(fileName) {
  const filePath = path.join(STORAGE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

/**
 * Delete a file from storage
 * @param {string} fileName - The filename to delete
 * @returns {boolean} - True if deleted, false if not found
 */
function deleteFile(fileName) {
  const filePath = path.join(STORAGE_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/**
 * Generate a download URL for a file
 * This will be used in the blobUrl field
 * @param {string} fileName - The filename
 * @returns {string} - Download URL
 */
function getDownloadUrl(fileName) {
  // Return a path that can be served by our file serving route
  return `/packages/${fileName}`;
}

// Initialize storage directory on module load
ensureStorageDir();

module.exports = {
  saveFile,
  getFilePath,
  deleteFile,
  getDownloadUrl,
  STORAGE_DIR
};

