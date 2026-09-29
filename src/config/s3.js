const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Helper to get active storage credentials and configuration
 */
const getStorageConfig = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.AWS_PUBLIC_URL;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : process.env.AWS_ENDPOINT);
  const region = process.env.R2_REGION || process.env.AWS_REGION || 'auto';

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    endpoint,
    region,
  };
};

const isS3Configured = () => {
  const config = getStorageConfig();
  return !!(
    config.accessKeyId &&
    config.secretAccessKey &&
    config.bucketName &&
    (config.endpoint || process.env.AWS_REGION)
  );
};

const isR2Configured = isS3Configured;

let s3Client = null;

if (isS3Configured()) {
  const config = getStorageConfig();
  const clientOpts = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    clientOpts.endpoint = config.endpoint;
  }

  s3Client = new S3Client(clientOpts);
}

/**
 * Delete an object from Cloudflare R2 / AWS S3 using its full URL or Key
 * @param {string} urlOrKey - Object URL or Key string
 */
const deleteS3Object = async (urlOrKey) => {
  if (!isS3Configured() || !s3Client || !urlOrKey || typeof urlOrKey !== 'string') {
    return false;
  }

  let key = urlOrKey.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  const { bucketName: targetBucket, publicUrl } = getStorageConfig();
  let bucketToUse = targetBucket;

  try {
    if (key.startsWith('http://') || key.startsWith('https://')) {
      const parsedUrl = new URL(key);

      if (publicUrl) {
        try {
          const parsedPublicUrl = new URL(publicUrl);
          if (parsedUrl.hostname === parsedPublicUrl.hostname) {
            let pathname = decodeURIComponent(parsedUrl.pathname);
            if (pathname.startsWith('/')) pathname = pathname.substring(1);
            key = pathname;
          }
        } catch (e) {
          // Fallback if publicUrl is invalid URL
        }
      }

      if (key.startsWith('http://') || key.startsWith('https://')) {
        let pathname = decodeURIComponent(parsedUrl.pathname);
        if (pathname.startsWith('/')) {
          pathname = pathname.substring(1);
        }

        // Handle Virtual-Hosted Style (bucketname.s3.region.amazonaws.com/key)
        const hostParts = parsedUrl.hostname.split('.');
        if (hostParts.length > 1 && (hostParts[1] === 's3' || hostParts[1] === 'r2')) {
          bucketToUse = hostParts[0];
        }

        // Handle Path-Style (endpoint/bucketname/key)
        if (bucketToUse && pathname.startsWith(bucketToUse + '/')) {
          pathname = pathname.replace(bucketToUse + '/', '');
        }

        key = pathname;
      }
    }

    if (!key || !bucketToUse) return false;

    console.log(`[Storage Delete] Deleting object: Bucket='${bucketToUse}', Key='${key}'`);

    const command = new DeleteObjectCommand({
      Bucket: bucketToUse,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`[Storage] Successfully deleted object: Key='${key}' from Bucket='${bucketToUse}'`);
    return true;
  } catch (error) {
    console.error(`[Storage Delete Error] Failed to delete Key='${key}' from Bucket='${bucketToUse}':`, error.message);
    return false;
  }
};

const deleteR2Object = deleteS3Object;

module.exports = {
  s3Client,
  isS3Configured,
  isR2Configured,
  deleteS3Object,
  deleteR2Object,
  getStorageConfig,
};



