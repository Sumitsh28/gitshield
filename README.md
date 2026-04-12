<div align="center">

  <h1>🛡️ GitShield: Decentralized Identity Gateway</h1>
  <p>
    <strong>Cryptographically bind your GitHub profile to a public GPG key using W3C Verifiable Credentials anchored to the Hedera Blockchain.</strong>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Hedera-Testnet-purple" alt="Hedera" />
    <img src="https://img.shields.io/badge/Prisma-ORM-1B222D?logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/AWS-EC2-FF9900?logo=amazonaws" alt="AWS EC2" />
    <img src="https://img.shields.io/badge/Cloudflare-Tunnels-F38020?logo=cloudflare" alt="Cloudflare" />
  </p>
</div>

---

## 🚨 The Problem

In the opensource ecosystem, verifying the true identity of a contributor is notoriously difficult. While developers can sign commits with GPG keys, maintaining the lifecycle of those keys and mathematically proving that a specific GitHub account owns a specific private key relies on fragmented, centralized trust models. If a developer's machine is compromised, there is no standardized, immutable way to instantly alert third party repositories to reject incoming code.

## 💡 How GitShield Solves It

GitShield acts as a **Decentralized Verification Gateway**. It forces developers to mathematically prove ownership of their keys via terminal signing. Once verified, GitShield issues a standard W3C Verifiable Credential (VC) mapping their GitHub ID to a Decentralized Identifier (DID) and anchors that proof immutably to the Hedera Consensus Service.

Third party CI/CD pipelines can then ping the GitShield API to instantly verify if an incoming commit is signed by a trusted, non revoked identity.

---

#### DEMO: https://gitshield-web.vercel.app/


---

## 🏗️ System Architecture

GitShield utilizes a modern edge-to-cloud architecture, leveraging Cloudflare Tunnels for secure ingress to an AWS-hosted Node.js backend, with data anchored to the Hedera testnet.

```mermaid
sequenceDiagram
    autonumber
    actor Developer
    participant UI as Next.js Frontend (Vercel)
    participant Cloudflare as Cloudflare Tunnel
    participant API as Node.js Backend (AWS EC2)
    participant DB as PostgreSQL (Neon)
    participant Hedera as Hedera Consensus Ledger
    participant CICD as GitHub Actions (Third-Party)

    %% Registration Flow
    Note over Developer, Hedera: Phase 1: Identity Registration & Verification
    Developer->>UI: Submit ASCII Armored GPG Public Key
    UI->>Cloudflare: POST /api/gpg/submit
    Cloudflare->>API: Route to internal port 3001
    API-->>UI: Return Cryptographic Challenge (Nonce)
    Developer->>Developer: Sign Nonce locally (gpg --clearsign)
    Developer->>UI: Submit PGP Signature Block
    UI->>API: POST /api/gpg/verify
    
    %% Credential Issuance
    Note over API, Hedera: Phase 2: VC Issuance & Trust Anchoring
    API->>API: Verify Signature against Public Key
    API->>API: Generate did:key & W3C Verifiable Credential
    API->>DB: Store Encrypted Vault State
    API->>Hedera: Anchor VC Hash to Public Topic
    Hedera-->>API: Return Consensus TxId
    API-->>UI: Issue Success & DID Details

    %% Third-Party Verification
    Note over Developer, CICD: Phase 3: Third-Party CI/CD Integration
    Developer->>CICD: Push Signed Commit to Target Repo
    CICD->>API: GET /api/trust/:githubId/:gpgKeyId
    API->>DB: Query VC Status (Active vs. Revoked)
    API-->>CICD: Return { trusted: true/false }
    CICD->>CICD: Merge or Block Pull Request
```

---

## ✨ Core Features

* **Zero-Knowledge Proof of Ownership:** Users must cryptographically sign a backend-generated nonce using their local GPG engine to prove ownership of the private key.
* **W3C Verifiable Credentials:** Generates standard-compliant `did-jwt-vc` credentials binding GitHub IDs to Decentralized Identifiers (DIDs).
* **Hedera Trust Anchor:** All credential hashes (and revocation states) are logged to the Hedera Consensus Service (HCS), providing immutable, decentralized proof of issuance.
* **Encrypted Identity Vault:** Credentials are encrypted at rest using `AES-256-CBC` symmetric encryption before database storage.
* **The Web3 "Kill Switch":** A 1-click revocation feature that permanently burns the credential on the Hedera ledger, instantly notifying third-party gateways that the identity is compromised.

---

## 📸 Gallery


<strong>1. Unauthenticated Landing Page</strong>
<img width="1680" height="1050" alt="Screenshot 2026-04-12 at 11 12 40 PM" src="https://github.com/user-attachments/assets/58c517e6-4dcb-463a-9c47-31157ba0f1db" />

<strong>2. Cryptographic Challenge Flow</strong>
<img width="1680" height="1050" alt="Screenshot 2026-04-12 at 11 03 52 PM" src="https://github.com/user-attachments/assets/8aba6c15-3a11-4dc1-af51-918b27321de3" />
<img width="1680" height="1050" alt="Screenshot 2026-04-12 at 11 04 05 PM" src="https://github.com/user-attachments/assets/db03007c-2073-4f97-b385-6af446b022d2" />

<strong>3. The Decentralized Wallet Dashboard</strong>
<img width="1680" height="1050" alt="Screenshot 2026-04-12 at 11 03 31 PM" src="https://github.com/user-attachments/assets/2eaf9d13-b8da-483a-ad0a-0e55e3bbc923" />
<img width="1680" height="1050" alt="Screenshot 2026-04-12 at 11 03 38 PM" src="https://github.com/user-attachments/assets/e41ea5d0-43cb-4f96-9d8b-56fbac19d78f" />


---

## 🚀 Tech Stack & Infrastructure

### Application Layer
* **Frontend:** Next.js 14 (App Router), React, Tailwind CSS v4 (Oxide), NextAuth.js.
* **Backend:** Node.js, Express, TypeScript.
* **Cryptography:** `openpgp` (Key Parsing/Verification), `did-jwt-vc` (W3C Standard Issuance), `crypto` (AES-256 Vault Encryption).

### Infrastructure & DevOps
* **Database:** Serverless PostgreSQL via Neon Tech.
* **ORM:** Prisma Client with `@prisma/adapter-pg`.
* **Blockchain Integration:** Hedera Hashgraph JavaScript SDK (`@hashgraph/sdk`).
* **Server Hosting:** Amazon Web Services (AWS) EC2 Ubuntu Instance.
* **Process Management:** PM2 (Daemonizing the Node.js API).
* **Ingress & Routing:** Cloudflare Tunnels (`cloudflared`) bypassing AWS mixed-content blocks for secure HTTPS routing.

---

## 🔌 API Reference for CI/CD

GitShield is designed to be consumed by third-party services. To protect your repository, you can add a simple `curl` check to your GitHub Actions pipeline:

**Endpoint:** `GET /api/trust/:githubId/:gpgKeyId`

**Success Response (Identity Valid & Active):**
```json
{
  "trusted": true,
  "identity": {
    "githubId": "112415343",
    "username": "DevName",
    "did": "did:key:z..."
  },
  "proof": {
    "vcHash": "57a7344...",
    "hederaTopicId": "0.0.8606284",
    "explorerUrl": "[https://hashscan.io/testnet/topic/0.0.8606284](https://hashscan.io/testnet/topic/0.0.8606284)"
  }
}
```

**Failure Response (Compromised or Missing):**
```json
{
  "trusted": false,
  "reason": "Identity credential has been revoked or is missing."
}
```

---

## 💻 Local Development Setup

To run GitShield locally, you need Node.js 20+ and a PostgreSQL database connection string.

**1. Clone the repository:**
```bash
git clone [https://github.com/YOUR_GITHUB_USERNAME/gitshield.git](https://github.com/YOUR_GITHUB_USERNAME/gitshield.git)
cd gitshield
```

**2. Install dependencies:**
```bash
npm install
```

**3. Configure Environment Variables:**
Create a `.env` file in `apps/web` and `apps/backend`. Reference `.env.example` for required keys (GitHub OAuth, Neon DB URL, Hedera Testnet Account).

**4. Initialize the Database:**
```bash
cd apps/backend
npx prisma generate
npx prisma db push
```

**5. Start the Monorepo:**
```bash
# In the root directory
npm run dev
```
* Frontend: `http://localhost:3000`
* Backend API: `http://localhost:3001`
---
