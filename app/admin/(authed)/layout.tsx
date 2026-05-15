import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/check';

export const dynamic = 'force-dynamic';

export default async function AdminAuthedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');
  if (!isAdminEmail(user.email)) {
    await supabase.auth.signOut();
    redirect('/admin/login?error=not_authorized');
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--qw-cream)]/30">
      <header className="bg-white border-b border-[var(--qw-border-soft)]">
        <div
          className="mx-auto max-w-6xl flex items-center justify-between py-3 sm:py-4"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <Link href="/admin" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
              alt="Oshibori Concept"
              className="h-9 w-auto"
            />
            <span className="text-xs uppercase tracking-[0.08em] text-gold-dark hidden sm:inline">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-ink-soft">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main
        className="flex-1"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        <div className="mx-auto max-w-6xl py-6 sm:py-10">{children}</div>
      </main>
    </div>
  );
}

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
