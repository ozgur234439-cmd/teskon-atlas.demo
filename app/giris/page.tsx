import { girisYap } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function girisAction(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '').trim();
  const sifre = String(formData.get('sifre') ?? '');

  if (!email || !sifre) {
    redirect('/giris?hata=' + encodeURIComponent('Email ve sifre zorunlu'));
  }

  const sonuc = await girisYap(email, sifre);
  if (sonuc.ok) {
    redirect('/');
  } else {
    redirect('/giris?hata=' + encodeURIComponent(sonuc.hata ?? 'Giris basarisiz'));
  }
}

export default async function GirisPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 p-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">TESKON Atlas</h1>
          <p className="text-neutral-400 text-sm">
            Doğrulanmış Muhatap + Kurum Hafızası
          </p>
        </div>

        <form action={girisAction} className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-6">
          <div>
            <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
              E-posta
            </label>
            <input
              type="email"
              name="email"
              required
              autoFocus
              defaultValue="ozgur@teskon.local"
              className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-neutral-500 font-semibold mb-2">
              Şifre
            </label>
            <input
              type="password"
              name="sifre"
              required
              className="w-full px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 focus:border-blue-600 focus:outline-none"
            />
          </div>

          {hata && (
            <div className="px-3 py-2 rounded-md bg-red-950/50 border border-red-800 text-sm text-red-300">
              {hata}
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-medium transition-colors"
          >
            Giriş Yap
          </button>
        </form>

        <p className="text-center text-xs text-neutral-600 mt-6">
          Atlas, TESKON Mühendislik iş geliştirme istihbarat platformudur.
        </p>
      </div>
    </main>
  );
}