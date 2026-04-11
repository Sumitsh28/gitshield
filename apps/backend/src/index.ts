import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post("/api/gpg/submit", (req, res) => {
  const { githubId, username, email, gpgKey } = req.body;

  if (!githubId || !gpgKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  console.log(`Received key for GitHub user: ${username} (${githubId})`);

  res.status(200).json({
    message: "Key received successfully. Awaiting Phase 3 Challenge.",
  });
});

app.listen(PORT, () => {
  console.log(`GitShield Backend running on http://localhost:${PORT}`);
});
