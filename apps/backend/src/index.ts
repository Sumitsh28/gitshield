import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import * as openpgp from "openpgp";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  generateContributorDid,
  issueCredential,
  encryptVC,
  decryptVC,
} from "./utils/identity";
import { createTopic, submitMessageToTopic } from "./utils/hedera";

dotenv.config();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const challengeStore = new Map<string, { gpgKey: string; nonce: string }>();

app.post("/api/gpg/submit", (req, res) => {
  const { githubId, gpgKey } = req.body;

  if (!githubId || !gpgKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const nonce = crypto.randomBytes(32).toString("hex");

  challengeStore.set(githubId, { gpgKey, nonce });

  res.status(200).json({ message: "Key received.", nonce });
});

app.post("/api/gpg/verify", async (req, res) => {
  const { githubId, username, email, signature } = req.body;

  const record = challengeStore.get(githubId);
  if (!record) {
    return res.status(400).json({
      error: "No pending challenge found. Please submit your key again.",
    });
  }

  try {
    const message = await openpgp.readCleartextMessage({
      cleartextMessage: signature,
    });
    const publicKey = await openpgp.readKey({ armoredKey: record.gpgKey });

    const verificationResult = await openpgp.verify({
      message,
      verificationKeys: publicKey,
    });

    const { verified } = verificationResult.signatures[0];
    await verified;

    const signedText = message.getText().trim();
    if (signedText !== record.nonce) {
      return res.status(400).json({
        error:
          "Signature is valid, but the message does not match the challenge.",
      });
    }

    const contributorDid = generateContributorDid();

    const gpgKeyId = publicKey.getKeyID().toHex();

    const vcJwt = await issueCredential(contributorDid, githubId, gpgKeyId);

    const encryptedVc = encryptVC(vcJwt);

    const vcHash = crypto.createHash("sha256").update(vcJwt).digest("hex");

    const topicId = process.env.HEDERA_TOPIC_ID;
    if (!topicId) throw new Error("HEDERA_TOPIC_ID is missing in .env");

    const hederaTxId = await submitMessageToTopic(topicId, vcHash);
    console.log(`✅ Successfully anchored to Hedera! Tx ID: ${hederaTxId}`);

    const user = await prisma.user.upsert({
      where: { githubId },
      update: { username, email },
      create: { githubId, username, email },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {
        gpgPublicKey: record.gpgKey,
        did: contributorDid,
        encryptedVcStore: encryptedVc,
      },
      create: {
        userId: user.id,
        gpgPublicKey: record.gpgKey,
        did: contributorDid,
        encryptedVcStore: encryptedVc,
      },
    });

    await prisma.credential.upsert({
      where: { vcHash },
      update: { isRevoked: false },
      create: { userId: user.id, vcHash },
    });

    challengeStore.delete(githubId);

    res.status(200).json({
      message:
        "Identity cryptographically verified, VC issued, and anchored to Hedera!",
      did: contributorDid,
      hederaTxId: hederaTxId,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(400).json({ error: "Invalid signature or mismatched key." });
  }
});

app.get("/api/hedera/setup", async (req, res) => {
  try {
    const topicId = await createTopic();
    res.status(200).json({
      message: "Hedera Topic Created Successfully!",
      topicId: topicId,
    });
  } catch (error) {
    console.error("Hedera Setup Error:", error);
    res.status(500).json({ error: "Failed to create topic" });
  }
});

app.get("/api/wallet/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        wallet: true,
        credentials: true,
      },
    });

    if (!user || !user.wallet || !user.wallet.encryptedVcStore) {
      return res
        .status(404)
        .json({ error: "No wallet found. Please verify your GPG key first." });
    }

    const decryptedVcJwt = decryptVC(user.wallet.encryptedVcStore);

    const jwtPayloadBase64 = decryptedVcJwt.split(".")[1];
    const decodedVc = JSON.parse(
      Buffer.from(jwtPayloadBase64, "base64").toString("utf-8"),
    );

    const latestCredential = user.credentials[user.credentials.length - 1];

    res.status(200).json({
      did: user.wallet.did,
      gpgPublicKey: user.wallet.gpgPublicKey,
      vc: decodedVc,
      vcHash: latestCredential?.vcHash || null,
      topicId: process.env.HEDERA_TOPIC_ID,
      isRevoked: latestCredential?.isRevoked || false,
    });
  } catch (error) {
    console.error("Wallet fetch error:", error);
    res.status(500).json({ error: "Failed to fetch wallet data" });
  }
});

app.get("/api/trust/:githubId/:gpgKeyId", async (req, res) => {
  const { githubId, gpgKeyId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { githubId },
      include: {
        wallet: true,
        credentials: true,
      },
    });

    if (!user || !user.wallet) {
      return res.status(404).json({
        trusted: false,
        reason: "User not found or has not verified an identity via GitShield.",
      });
    }

    const storedKey = await openpgp.readKey({
      armoredKey: user.wallet.gpgPublicKey,
    });
    const storedKeyId = storedKey.getKeyID().toHex().toLowerCase();

    if (!storedKeyId.endsWith(gpgKeyId.toLowerCase())) {
      return res.status(403).json({
        trusted: false,
        reason:
          "Key mismatch. This user has not verified this specific GPG key.",
      });
    }

    const activeCredential = user.credentials[user.credentials.length - 1];

    if (!activeCredential || activeCredential.isRevoked) {
      return res.status(403).json({
        trusted: false,
        reason: "Identity credential has been revoked or is missing.",
      });
    }

    res.status(200).json({
      trusted: true,
      identity: {
        githubId: user.githubId,
        username: user.username,
        did: user.wallet.did,
      },
      proof: {
        vcHash: activeCredential.vcHash,
        hederaTopicId: process.env.HEDERA_TOPIC_ID,
        explorerUrl: `https://hashscan.io/testnet/topic/${process.env.HEDERA_TOPIC_ID}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trust API error:", error);
    res.status(500).json({ trusted: false, reason: "Internal server error." });
  }
});

app.post("/api/wallet/revoke", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { credentials: true },
    });

    if (!user || user.credentials.length === 0) {
      return res.status(404).json({ error: "No active credentials found." });
    }

    const activeCredential = user.credentials[user.credentials.length - 1];

    if (activeCredential.isRevoked) {
      return res.status(400).json({ error: "Credential is already revoked." });
    }

    await prisma.credential.update({
      where: { id: activeCredential.id },
      data: { isRevoked: true },
    });

    const topicId = process.env.HEDERA_TOPIC_ID;
    if (!topicId) throw new Error("HEDERA_TOPIC_ID missing");

    const burnMessage = `REVOKED::${activeCredential.vcHash}`;
    const hederaTxId = await submitMessageToTopic(topicId, burnMessage);

    res.status(200).json({
      message: "Identity permanently revoked.",
      hederaTxId,
    });
  } catch (error) {
    console.error("Revocation error:", error);
    res.status(500).json({ error: "Failed to revoke credential." });
  }
});

app.listen(PORT, () => {
  console.log(`GitShield Backend running on http://localhost:${PORT}`);
});
