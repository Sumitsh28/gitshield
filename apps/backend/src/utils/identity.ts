import { createJWT, ES256KSigner, hexToBytes } from "did-jwt";
import { createVerifiableCredentialJwt } from "did-jwt-vc";
import crypto from "crypto";

const ISSUER_PRIVATE_KEY_HEX = crypto.randomBytes(32).toString("hex");
const ISSUER_DID = `did:web:gitshield.dev`;
const signer = ES256KSigner(hexToBytes(ISSUER_PRIVATE_KEY_HEX));

export function generateContributorDid(): string {
  const randomId = crypto.randomBytes(16).toString("hex");
  return `did:key:z${randomId}`;
}

export async function issueCredential(
  contributorDid: string,
  githubId: string,
  gpgKeyId: string,
) {
  const vcPayload = {
    sub: contributorDid,
    nbf: Math.floor(Date.now() / 1000),
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

  const vcJwt = await createVerifiableCredentialJwt(vcPayload, {
    did: ISSUER_DID,
    signer,
    alg: "ES256K",
  });

  return vcJwt;
}

export function encryptVC(vcJwt: string): string {
  const ENCRYPTION_KEY = crypto.scryptSync(
    "gitshield-super-secret-password",
    "salt",
    32,
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(vcJwt, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}
