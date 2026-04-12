import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import * as openpgp from "openpgp";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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

    const user = await prisma.user.upsert({
      where: { githubId },
      update: { username, email },
      create: { githubId, username, email },
    });

    const tempDid = `did:key:temp_${crypto.randomBytes(8).toString("hex")}`;

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: { gpgPublicKey: record.gpgKey },
      create: { userId: user.id, gpgPublicKey: record.gpgKey, did: tempDid },
    });

    challengeStore.delete(githubId);

    res
      .status(200)
      .json({ message: "Identity cryptographically verified and saved!" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(400).json({ error: "Invalid signature or mismatched key." });
  }
});

app.listen(PORT, () => {
  console.log(`GitShield Backend running on http://localhost:${PORT}`);
});
