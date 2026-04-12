"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { data: session } = useSession();

  const [gpgKey, setGpgKey] = useState("");
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");

  const [status, setStatus] = useState({ type: "", message: "" });

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "info", message: "Generating challenge..." });

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
        setStatus({ type: "", message: "" });
      } else {
        setStatus({ type: "error", message: data.error });
      }
    } catch (error) {
      setStatus({ type: "error", message: "Backend connection failed." });
    }
  };

  const handleSignatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "info", message: "Verifying signature..." });

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
        setStatus({
          type: "success",
          message: `✅ ${data.message} DID: ${data.did} | Hedera Tx: ${data.hederaTxId}`,
        });
        setNonce("");
      } else {
        setStatus({ type: "error", message: "❌ " + data.error });
      }
    } catch (error) {
      setStatus({ type: "error", message: "Verification failed." });
    }
  };

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
        <h1 className="text-4xl font-bold mb-6 text-black">
          Welcome to GitShield
        </h1>
        <button
          onClick={() => signIn("github")}
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
        >
          Sign in with GitHub
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50 text-black">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-md p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">GitShield Dashboard</h1>
          <button
            onClick={() => signOut()}
            className="text-sm text-red-600 hover:underline"
          >
            Sign Out
          </button>
        </div>

        {!nonce && status.type !== "success" && (
          <form onSubmit={handleKeySubmit} className="flex flex-col gap-4">
            <label className="font-semibold text-gray-700">
              Step 1: Submit your GPG Public Key
            </label>
            <textarea
              className="w-full p-3 border rounded-lg font-mono text-sm h-48 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
              value={gpgKey}
              onChange={(e) => setGpgKey(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Get Challenge
            </button>
          </form>
        )}

        {nonce && (
          <form
            onSubmit={handleSignatureSubmit}
            className="flex flex-col gap-4 animate-fade-in"
          >
            <h2 className="font-semibold text-gray-700 text-lg">
              Step 2: Prove Ownership
            </h2>
            <div className="p-4 bg-gray-900 text-green-400 rounded-lg font-mono text-sm break-all">
              <p className="text-gray-400 mb-2">
                // Run this command in your terminal:
              </p>
              echo "{nonce}" | gpg --clearsign
            </div>

            <label className="font-semibold text-gray-700 mt-2">
              Paste the generated signature here:
            </label>
            <textarea
              className="w-full p-3 border rounded-lg font-mono text-sm h-48 bg-gray-50 outline-none focus:ring-2 focus:ring-green-500"
              placeholder="-----BEGIN PGP SIGNED MESSAGE-----..."
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
            >
              Verify Signature
            </button>
          </form>
        )}

        {status.message && (
          <div
            className={`mt-6 p-4 rounded-lg text-center font-medium ${
              status.type === "error"
                ? "bg-red-100 text-red-700"
                : status.type === "success"
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>
    </main>
  );
}
