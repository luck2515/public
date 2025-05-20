const crypto = require('crypto');
const argon2 = require('argon2'); // npm install argon2

async function decryptIdentity(rootUser, rootPassword, encryptedIdentityBuffer) {
    const password = rootUser + rootPassword;

    // 1. Parse ciphertext
    const salt = encryptedIdentityBuffer.subarray(0, 32);
    const aeadId = encryptedIdentityBuffer.readUInt8(32);
    const nonce = encryptedIdentityBuffer.subarray(33, 33 + 8); // Assuming 8-byte nonce for both AES-GCM and ChaCha20
    const encryptedDataWithTag = encryptedIdentityBuffer.subarray(33 + 8);

    // 2. Derive key using Argon2id
    // MinIO uses: time=1, memory=64KB, parallelism=4, hashLength=32
    const derivedKey = await argon2.hash(password, {
        salt: salt,
        type: argon2.argon2id,
        timeCost: 1,        // Corresponds to iterations in some contexts
        memoryCost: 64,     // KiB
        parallelism: 4,
        hashLength: 32,
        raw: true,          // Important: get raw bytes
    });

    let decryptedJsonString;
    let decipher;

    // 3. Decrypt based on AEAD ID
    const AES_GCM_ID = 0x00;
    const CHACHA20_POLY1305_ID = 0x01;

    if (aeadId === AES_GCM_ID) {
        // AES-256-GCM
        // Node's crypto needs the auth tag appended to the ciphertext
        const authTagLength = 16; // AES-GCM typically uses a 16-byte auth tag
        const actualEncryptedData = encryptedDataWithTag.subarray(0, encryptedDataWithTag.length - authTagLength);
        const authTag = encryptedDataWithTag.subarray(encryptedDataWithTag.length - authTagLength);

        decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, nonce);
        decipher.setAuthTag(authTag);
        // If there's associated data (AAD), use decipher.setAAD(buffer);
        // MinIO's madmin.EncryptData doesn't seem to use AAD for identity.json encryption.

        let decrypted = decipher.update(actualEncryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        decryptedJsonString = decrypted.toString('utf8');

    } else if (aeadId === CHACHA20_POLY1305_ID) {
        // ChaCha20-Poly1305
        // Similar to AES-GCM, Node's crypto needs the auth tag
        const authTagLength = 16; // ChaCha20-Poly1305 also uses a 16-byte auth tag
        const actualEncryptedData = encryptedDataWithTag.subarray(0, encryptedDataWithTag.length - authTagLength);
        const authTag = encryptedDataWithTag.subarray(encryptedDataWithTag.length - authTagLength);

        decipher = crypto.createDecipheriv('chacha20-poly1305', derivedKey, nonce);
        decipher.setAuthTag(authTag);
        // If AAD, decipher.setAAD(buffer);

        let decrypted = decipher.update(actualEncryptedData);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        decryptedJsonString = decrypted.toString('utf8');
    } else {
        throw new Error(`Unsupported AEAD ID: ${aeadId}`);
    }

    // 4. Parse JSON
    return JSON.parse(decryptedJsonString);
}

// --- How to use it (example) ---
// const fs = require('fs');
//
// async function main() {
//     const rootUser = "YOUR_MINIO_ROOT_USER";
//     const rootPassword = "YOUR_MINIO_ROOT_PASSWORD";
//     const identityFilePath = "./identity_encrypted.json"; // Path to the file copied via kubectl cp
//
//     try {
//         const encryptedFileBuffer = fs.readFileSync(identityFilePath);
//         const userIdentity = await decryptIdentity(rootUser, rootPassword, encryptedFileBuffer);
//
//         console.log("Successfully decrypted identity.json!");
//         console.log(`  Target User Access Key: ${userIdentity.credentials.AccessKey}`);
//         console.log(`  Target User Secret Key: ${userIdentity.credentials.SecretKey}`);
//         console.log(`  Target User Status:     ${userIdentity.credentials.Status}`);
//         // ... and so on
//     } catch (error) {
//         console.error("Decryption failed:", error);
//         if (error.message.includes('Unsupported state or bad message authentication code')) {
//             console.error("This might be due to incorrect root credentials or corrupted data.");
//         }
//     }
// }
//
// main();
