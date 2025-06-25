import { auth, signIn, signOut } from '@/auth';
import { db } from '@/lib/db';
import { cookbook } from '@/lib/db/schema';
import { uuidHref } from '@/lib/uuid/uuid-links';
import Link from 'next/link';

function SignIn() {
  return (
    <form
      action={async () => {
        'use server';
        await signIn('google');
      }}
    >
      <button type="submit">Sign in with Google</button>
    </form>
  );
}

function SignOut() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <button type="submit">Sign Out</button>
    </form>
  );
}

async function getCookbooks() {
  return await db
    .select({
      id: cookbook.id,
      name: cookbook.name,
    })
    .from(cookbook);
}

export default async function Home() {
  const session = await auth();
  const cookbooks = await getCookbooks();

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Kokekompis</h1>
          {session?.user ? (
            <div className="flex items-center gap-4">
              <span>Hei, {session.user.name ?? 'User'}!</span>
              <SignOut />
            </div>
          ) : (
            <SignIn />
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Kokebøker</h2>
          {cookbooks.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              Ingen kokebøker ennå.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cookbooks.map((book) => (
                <Link
                  key={book.id}
                  href={uuidHref`/kokebok/${book.id}`}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <h3 className="font-medium">{book.name}</h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
