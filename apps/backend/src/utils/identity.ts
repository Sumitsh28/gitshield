import { createJWT, ES256KSigner, hexToBytes } from "did-jwt";
import { createVerifiableCredentialJwt } from "did-jwt-vc";
import crypto from "crypto";

// ==========================================
// GITSHIELD MASTER ISSUER CONFIGURATION
// ==========================================
// In a production environment, the Master Private Key MUST be securely injected
// via environment variables or a Secret Manager (e.g., AWS KMS, HashiCorp Vault).
// For this implementation, we generate an ephemeral key on startup for demonstration.
const ISSUER_PRIVATE_KEY_HEX = crypto.randomBytes(32).toString("hex");
const ISSUER_DID = `did:web:gitshield.dev`;

// Initialize the ECDSA secp256k1 signer using the Master Private Key.
// This signer is used to cryptographically sign all Verifiable Credentials issued by GitShield.
const signer = ES256KSigner(hexToBytes(ISSUER_PRIVATE_KEY_HEX));

/**
 * Generates a decentralized identifier (DID) for the contributor.
 * * @returns {string} A randomly generated did:key string.
 * @note In future iterations, this identifier could be deterministically
 * derived directly from the user's public GPG key to ensure tighter binding.
 */
export function generateContributorDid(): string {
  const randomId = crypto.randomBytes(16).toString("hex");
  return `did:key:z${randomId}`;
}

/**
 * Issues a W3C-compliant Verifiable Credential (VC) in JWT format.
 * This credential serves as a cryptographic proof that GitShield has verified
 * the binding between the user's GitHub account and their GPG key.
 *
 * @param contributorDid - The decentralized identifier of the user.
 * @param githubId - The user's unique GitHub ID.
 * @param gpgKeyId - The 16-character Hex ID of the user's verified GPG key.
 * @returns {Promise<string>} A signed JWT representing the Verifiable Credential.
 */
export async function issueCredential(
  contributorDid: string,
  githubId: string,
  gpgKeyId: string,
) {
  // Construct the W3C Verifiable Credential Payload
  const vcPayload = {
    sub: contributorDid,
    nbf: Math.floor(Date.now() / 1000), // "Not Before": Credential is valid immediately
    vc: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential", "GitShieldVerification"],
      credentialSubject: {
        id: contributorDid,
        github: {
          id: githubId,
        },
        gpg: {
          publicKey: gpgKeyId,
        },
      },
    },
  };

  // Sign the payload using the GitShield Master DID and secp256k1 algorithm
  const vcJwt = await createVerifiableCredentialJwt(vcPayload, {
    did: ISSUER_DID,
    signer,
    alg: "ES256K",
  });

  return vcJwt;
}

// ==========================================
// VAULT ENCRYPTION / DECRYPTION
// ==========================================
// To preserve user privacy, Verifiable Credentials are encrypted at rest in the database.
// We use AES-256-CBC symmetric encryption.
// @todo: Move the encryption password to process.env.ENCRYPTION_SECRET for production.

/**
 * Encrypts the raw JWT string into a secure hex format for database storage.
 * * @param vcJwt - The raw signed Verifiable Credential JWT.
 * @returns {string} The initialization vector and ciphertext joined by a colon (iv:encrypted).
 */
export function encryptVC(vcJwt: string): string {
  // Derive a 32-byte encryption key using scrypt for added resistance against brute-force attacks
  const ENCRYPTION_KEY = crypto.scryptSync(
    "gitshield-super-secret-password",
    "salt",
    32,
  );

  // Generate a cryptographically strong pseudo-random Initialization Vector (IV)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(vcJwt, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts the stored hex string back into the raw JWT Verifiable Credential.
 * * @param encryptedStore - The combined IV and ciphertext string (iv:encrypted).
 * @returns {string} The decrypted JWT string.
 */
export function decryptVC(encryptedStore: string): string {
  const ENCRYPTION_KEY = crypto.scryptSync(
    "gitshield-super-secret-password",
    "salt",
    32,
  );

  // Split the stored string to retrieve the IV and the actual encrypted data
  const [ivHex, encryptedHex] = encryptedStore.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
