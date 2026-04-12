"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";
import {
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Loader2,
  LogOut,
  ExternalLink,
} from "lucide-react";

export default function Home() {
  const { data: session } = useSession();

  const [gpgKey, setGpgKey] = useState("");
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState<{
    did: string;
    hederaTxId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/gpg/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubId: (session?.user as any)?.id,
            gpgKey,
          }),
        },
      );
      const data = await res.json();

      if (res.ok) {
        setNonce(data.nonce);
      } else {
        setError(data.error || "Failed to generate challenge.");
      }
    } catch (err) {
      setError("Backend connection failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/gpg/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubId: (session?.user as any)?.id,
            username: session?.user?.name,
            email: session?.user?.email,
            signature,
          }),
        },
      );
      const data = await res.json();

      if (res.ok) {
        setSuccessData({ did: data.did, hederaTxId: data.hederaTxId });
        setNonce("");
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch (err) {
      setError("Failed to reach verification server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="z-10 text-center max-w-xl flex flex-col items-center">
          <div className="bg-white/10 p-4 rounded-2xl mb-6 shadow-2xl border border-white/10">
            <ShieldCheck className="w-16 h-16 text-blue-400" />
          </div>
          <h1 className="text-5xl font-extrabold mb-4 text-white tracking-tight">
            Git<span className="text-blue-400">Shield</span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 leading-relaxed">
            Cryptographically bind your GitHub profile to a Decentralized
            Identity using Verifiable Credentials anchored on Hedera.
          </p>
          <button
            onClick={() => signIn("github")}
            className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-all shadow-lg hover:shadow-white/20 active:scale-95"
          >
            Authenticate with GitHub
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6 sm:p-12 bg-gray-50 text-gray-900">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            {session.user?.image && (
              <img
                src={session.user.image}
                alt="Avatar"
                className="w-10 h-10 rounded-full border border-gray-200 shadow-sm"
              />
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Identity Gateway
              </h1>
              <p className="text-sm text-gray-500">{session.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {successData ? (
            <div className="flex flex-col items-center text-center py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner border border-green-200">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold mb-2">Identity Secured!</h2>
              <p className="text-gray-500 mb-8 max-w-md">
                Your GPG key has been verified and a Verifiable Credential has
                been issued and anchored.
              </p>

              <div className="w-full bg-gray-50 rounded-xl p-5 text-left border border-gray-200 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                    Your Decentralized ID (DID)
                  </p>
                  <code className="block bg-white border border-gray-200 p-3 rounded-lg text-sm font-mono text-gray-800 break-all shadow-sm">
                    {successData.did}
                  </code>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                    Hedera Trust Anchor
                  </p>
                  <a
                    href={`https://hashscan.io/testnet/transaction/${successData.hederaTxId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between bg-blue-50 border border-blue-200 hover:bg-blue-100 p-3 rounded-lg text-sm font-mono text-blue-700 transition-colors group"
                  >
                    <span className="truncate mr-4">
                      {successData.hederaTxId}
                    </span>
                    <ExternalLink className="w-4 h-4 shrink-0 opacity-50 group-hover:opacity-100" />
                  </a>
                </div>
              </div>

              <a
                href="/wallet"
                className="mt-8 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors w-full sm:w-auto"
              >
                Go to Wallet Dashboard &rarr;
              </a>
            </div>
          ) : nonce ? (
            <form
              onSubmit={handleSignatureSubmit}
              className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 text-green-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="font-semibold text-lg">
                  Sign the Cryptographic Challenge
                </h2>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-lg">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-mono">
                    <Terminal className="w-4 h-4" /> terminal
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(`echo "${nonce}" | gpg --clearsign`)
                    }
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors p-1"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="p-4 text-green-400 font-mono text-sm break-all">
                  echo <span className="text-yellow-300">"{nonce}"</span> | gpg
                  --clearsign
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-sm text-gray-700">
                  Paste the generated signature block:
                </label>
                <textarea
                  className="w-full p-4 border border-gray-200 rounded-xl font-mono text-xs sm:text-sm h-48 bg-gray-50 outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-inner"
                  placeholder="-----BEGIN PGP SIGNED MESSAGE-----&#10;Hash: SHA256&#10;&#10;..."
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !signature}
                className="w-full flex justify-center items-center gap-2 py-3 sm:py-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-green-600/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                {isLoading
                  ? "Verifying & Anchoring..."
                  : "Verify Cryptographic Proof"}
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleKeySubmit}
              className="flex flex-col gap-6 animate-in fade-in duration-300"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 text-blue-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="font-semibold text-lg">Register Public Key</h2>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Paste your armored ASCII GPG public key below to initiate the
                  Web3 identity flow.
                </p>
                <textarea
                  className="w-full p-4 border border-gray-200 rounded-xl font-mono text-xs sm:text-sm h-48 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;&#10;mQINBGNZpZYBEAD..."
                  value={gpgKey}
                  onChange={(e) => setGpgKey(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !gpgKey}
                className="w-full flex justify-center items-center gap-2 py-3 sm:py-4 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Request Cryptographic Challenge"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
