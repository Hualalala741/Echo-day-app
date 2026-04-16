import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Suspense } from "react";
import { HomeShell } from "./HomeShell";
import { HomeEntriesSkeleton } from "./HomeEntriesSkeleton";
import { HomeData } from "./HomeData";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function HomePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { month } = await searchParams;
  return (
    <HomeShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    >
      <Suspense fallback={<HomeEntriesSkeleton />}>
        <HomeData userId={session.user.id} month={month} />
      </Suspense>
    </HomeShell>
  );
}
