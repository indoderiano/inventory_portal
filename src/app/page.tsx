import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Inventory Portal
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/products" className="underline">
          View products
        </Link>
      </p>
    </main>
  );
}
