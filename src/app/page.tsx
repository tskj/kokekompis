import { auth } from '@/app/api/auth/[...nextauth]/route';
import { signIn, signOut } from 'next-auth/react';

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

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center gap-4">
        {session?.user ? (
          <>
            <p>Welcome, {session.user.name ?? 'User'}!</p>
            <SignOut />
          </>
        ) : (
          <>
            <p>You are not signed in.</p>
            <SignIn />
          </>
        )}
      </div>
    </main>
  );
}
