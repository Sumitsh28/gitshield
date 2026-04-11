"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [gpgKey, setGpgKey] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Submitting...");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/gpg/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            githubId: (session?.user as any)?.id,
            username: session?.user?.name,
            email: session?.user?.email,
            gpgKey,
          }),
        },
      );
      const data = await res.json();
      setStatus(data.message);
    } catch (error) {
      setStatus("Error connecting to backend.");
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

        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p>
            Logged in as: <strong>{session.user?.name}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="font-semibold text-gray-700">
            Submit your GPG Public Key
          </label>
          <textarea
            className="w-full p-3 border rounded-lg font-mono text-sm h-48 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----..."
            value={gpgKey}
            onChange={(e) => setGpgKey(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Link GPG Key
          </button>
        </form>
        {status && (
          <p className="mt-4 text-center font-medium text-blue-600">{status}</p>
        )}
      </div>
    </main>
  );
}
