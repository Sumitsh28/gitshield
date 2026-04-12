"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Lock,
  Unlock,
  Copy,
  Check,
  ExternalLink,
  Key,
  Loader2,
  FileJson,
  AlertOctagon,
  Wallet,
} from "lucide-react";

export default function WalletDashboard() {
  const { data: session, status } = useSession();
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showVc, setShowVc] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeMessage, setRevokeMessage] = useState("");

  const [copiedDid, setCopiedDid] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

      fetch(`${apiUrl}/api/wallet/${session.user.email}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setWalletData(data);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setError("Please sign in to view your secure wallet.");
      setLoading(false);
    }
  }, [status, session]);

  const copyToClipboard = (text: string, type: "did" | "hash") => {
    navigator.clipboard.writeText(text);
    if (type === "did") {
      setCopiedDid(true);
      setTimeout(() => setCopiedDid(false), 2000);
    } else {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleRevoke = async () => {
    if (
      !confirm(
        "🚨 WARNING: This will permanently burn your identity credential on the blockchain. Are you sure?",
      )
    )
      return;

    setIsRevoking(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiUrl}/api/wallet/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session?.user?.email }),
      });

      const data = await res.json();
      if (res.ok) {
        setRevokeMessage(`✅ ${data.message}`);
        setWalletData({ ...walletData, isRevoked: true });
        setShowVc(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to reach revocation server.");
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">
          Decrypting secure wallet...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No Wallet Found
          </h2>
          <p className="text-gray-500 mb-8">{error}</p>
          <Link
            href="/"
            className="block w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-md"
          >
            Go to Verification Portal &rarr;
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-12 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <Wallet className="w-8 h-8 text-gray-900" />
          <h1 className="text-3xl font-bold tracking-tight">
            Decentralized Wallet
          </h1>
        </div>

        {walletData.isRevoked && (
          <div className="bg-red-600 text-white p-6 rounded-2xl shadow-lg border border-red-700 flex flex-col sm:flex-row items-center gap-6 animate-in slide-in-from-top-4">
            <div className="bg-red-700/50 p-4 rounded-full shrink-0">
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold uppercase tracking-wide mb-1">
                Identity Revoked
              </h2>
              <p className="text-red-100 text-sm leading-relaxed">
                This Verifiable Credential has been permanently burned on the
                Hedera Blockchain and is no longer valid for third-party
                authentication.
              </p>
            </div>
          </div>
        )}

        <div className="bg-gray-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Key className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-100">
                Cryptographic Identity
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Decentralized Identifier (DID)
                </p>
                <div className="flex items-center justify-between bg-black/50 border border-gray-700 rounded-lg p-3 group hover:border-gray-600 transition-colors">
                  <code className="text-sm text-gray-300 font-mono break-all pr-4">
                    {walletData.did}
                  </code>
                  <button
                    onClick={() => copyToClipboard(walletData.did, "did")}
                    className="shrink-0 p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                  >
                    {copiedDid ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Hedera Trust Anchor (VC Hash)
                </p>
                <div className="flex items-center justify-between bg-black/50 border border-gray-700 rounded-lg p-3 group hover:border-gray-600 transition-colors">
                  <code className="text-sm text-blue-400 font-mono truncate mr-4">
                    {walletData.vcHash}
                  </code>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(walletData.vcHash, "hash")}
                      className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                    >
                      {copiedHash ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`https://hashscan.io/testnet/topic/${walletData.topicId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-gray-500 hover:text-blue-400 hover:bg-gray-800 rounded-md transition-colors"
                      title="View on Hashscan Explorer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-gray-500" />
                Credential Vault
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Your securely encrypted Web3 passport.
              </p>
            </div>

            <button
              onClick={() => setShowVc(!showVc)}
              disabled={walletData.isRevoked}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm
                ${
                  walletData.isRevoked
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : showVc
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-600/20"
                }`}
            >
              {walletData.isRevoked ? (
                <Lock className="w-4 h-4" />
              ) : showVc ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              {walletData.isRevoked
                ? "Vault Locked"
                : showVc
                  ? "Lock Credential"
                  : "Decrypt & View"}
            </button>
          </div>

          {walletData.isRevoked ? (
            <div className="bg-red-50 h-40 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-red-200 text-red-500">
              <Lock className="w-8 h-8 mb-2 opacity-50" />
              <p className="font-semibold text-sm">Vault Permanently Locked</p>
            </div>
          ) : showVc ? (
            <div className="relative animate-in fade-in slide-in-from-top-2">
              <div className="absolute top-0 left-0 w-full h-8 bg-gray-800 rounded-t-xl flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <pre className="bg-gray-900 text-green-400 p-6 pt-12 rounded-xl overflow-x-auto text-xs sm:text-sm font-mono shadow-inner border border-gray-800">
                {JSON.stringify(walletData.vc, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-gray-50 h-40 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 text-gray-400 group-hover:border-gray-400 transition-colors">
              <Lock className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">
                Credential is heavily encrypted
              </p>
            </div>
          )}
        </div>

        <div className="border border-red-200 bg-red-50/50 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 p-3 rounded-full shrink-0">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-900 mb-1">
                Danger Zone
              </h2>
              <p className="text-sm text-red-700/80 mb-6 max-w-2xl">
                If your GPG key is compromised or you lose your device, you must
                revoke your GitShield identity. This action is irreversible and
                permanently anchors a revocation state to the Hedera ledger.
              </p>

              <button
                onClick={handleRevoke}
                disabled={isRevoking || walletData.isRevoked}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-sm hover:shadow-red-600/20"
              >
                {isRevoking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
                {isRevoking
                  ? "Burning Identity..."
                  : walletData.isRevoked
                    ? "Identity Already Burned"
                    : "Burn Identity & Revoke Key"}
              </button>

              {revokeMessage && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700 font-medium animate-in fade-in">
                  <Check className="w-4 h-4" />
                  {revokeMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
