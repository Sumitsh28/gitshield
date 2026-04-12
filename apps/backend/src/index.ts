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

app.get("/api/wallet/:githubId", async (req, res) => {
  const { githubId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { githubId },
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

    const decryptedVc = decryptVC(user.wallet.encryptedVcStore);

    const latestCredential = user.credentials[user.credentials.length - 1];

    res.status(200).json({
      did: user.wallet.did,
      gpgPublicKey: user.wallet.gpgPublicKey,
      vc: JSON.parse(decryptedVc),
      vcHash: latestCredential?.vcHash || null,
      topicId: process.env.HEDERA_TOPIC_ID,
    });
  } catch (error) {
    console.error("Wallet fetch error:", error);
    res.status(500).json({ error: "Failed to fetch wallet data" });
  }
});

app.listen(PORT, () => {
  console.log(`GitShield Backend running on http://localhost:${PORT}`);
});
