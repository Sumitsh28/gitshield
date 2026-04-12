"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function WalletDashboard() {
  const { data: session, status } = useSession();
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showVc, setShowVc] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeMessage, setRevokeMessage] = useState("");

  useEffect(() => {
    if (status === "authenticated" && session?.user?.name) {
      fetch(`http://localhost:3001/api/wallet/${session.user.email}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setWalletData(data);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else if (status === "unauthenticated") {
      setError("Please sign in to view your wallet.");
      setLoading(false);
    }
  }, [status, session]);

  if (loading)
    return (
      <div className="p-10 text-center">Loading your secure wallet...</div>
    );
  if (error)
    return <div className="p-10 text-center text-red-500">{error}</div>;

  const handleRevoke = async () => {
    if (
      !confirm(
        "🚨 WARNING: This will permanently burn your identity credential on the blockchain. Are you sure?",
      )
    )
      return;

    setIsRevoking(true);
    try {
      const res = await fetch("http://localhost:3001/api/wallet/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session?.user?.email }),
      });

      const data = await res.json();
      if (res.ok) {
        setRevokeMessage(`✅ ${data.message} (Hedera Tx: ${data.hederaTxId})`);
        setWalletData({ ...walletData, isRevoked: true });
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to reach revocation server.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Decentralized Wallet</h1>

      {walletData.isRevoked && (
        <div className="bg-red-600 text-white p-4 rounded-xl mb-8 shadow-lg border-2 border-red-800 text-center">
          <h2 className="text-2xl font-bold uppercase tracking-widest">
            🚨 Identity Revoked 🚨
          </h2>
          <p className="text-sm mt-1">
            This Verifiable Credential has been permanently burned on the Hedera
            Blockchain and is no longer valid for authentication.
          </p>
        </div>
      )}

      <div className="bg-gray-900 text-white rounded-xl p-6 mb-8 shadow-lg border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-green-400">
          Identity Details
        </h2>
        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            Your DID (Decentralized Identifier)
          </p>
          <code className="bg-black p-2 rounded block mt-1 text-sm break-all">
            {walletData.did}
          </code>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Hedera Trust Anchor</p>
          <p className="text-xs text-gray-500 mt-1 mb-2">
            Your VC hash: {walletData.vcHash}
          </p>
          <a
            href={`https://hashscan.io/testnet/topic/${walletData.topicId}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-400 hover:text-blue-300 underline text-sm"
          >
            View Topic Ledger on Hashscan ↗
          </a>
        </div>
      </div>

      <div className="bg-gray-100 rounded-xl p-6 shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Verifiable Credential Vault
          </h2>
          <button
            onClick={() => setShowVc(!showVc)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition"
          >
            {showVc ? "Lock Credential" : "Decrypt & View"}
          </button>
        </div>

        {walletData.isRevoked ? (
          <div className="bg-red-900/20 h-32 rounded flex items-center justify-center border-2 border-dashed border-red-500">
            <p className="text-red-500 font-bold text-sm">
              Credential Vault Permanently Locked.
            </p>
          </div>
        ) : showVc ? (
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-xs">
            {JSON.stringify(walletData.vc, null, 2)}
          </pre>
        ) : (
          <div className="bg-gray-300 h-32 rounded flex items-center justify-center border-2 border-dashed border-gray-400">
            <p className="text-gray-500 text-sm">
              Credential is heavily encrypted.
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 border border-red-500 bg-red-500/10 rounded-xl p-6 shadow-md">
        <h2 className="text-xl font-bold text-red-600 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          If your GPG key is compromised, you must revoke your GitShield
          identity. This action is irreversible and will permanently anchor a
          revocation state to the Hedera blockchain.
        </p>
        <button
          onClick={handleRevoke}
          disabled={isRevoking || walletData.isRevoked}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold py-2 px-4 rounded transition"
        >
          {isRevoking
            ? "Burning..."
            : walletData.isRevoked
              ? "Identity Revoked"
              : "Burn Identity & Revoke Key"}
        </button>
        {revokeMessage && (
          <p className="mt-4 text-sm text-green-600 font-semibold">
            {revokeMessage}
          </p>
        )}
      </div>
    </div>
  );
}
