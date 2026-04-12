"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function WalletDashboard() {
  const { data: session, status } = useSession();
  const [walletData, setWalletData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showVc, setShowVc] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.name) {
      fetch(`http://localhost:3001/api/wallet/${session.user.name}`)
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

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">My Decentralized Wallet</h1>

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

        {showVc ? (
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
    </div>
  );
}
