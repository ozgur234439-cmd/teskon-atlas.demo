'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from './Toast';

type Props = {
  tur: 'KISI' | 'KURUM' | 'ARAMA' | 'ROL_PAKETI';
  entityId: number;
  baslangictaFavori?: boolean;
};

export default function FavoriButton({ tur, entityId, baslangictaFavori = false }: Props) {
  const [favori, setFavori] = useState(baslangictaFavori);
  const [yukleniyor, setYukleniyor] = useState(false);
  const { goster } = useToast();
  const router = useRouter();

  const toggle = async () => {
    setYukleniyor(true);
    try {
      const res = await fetch('/api/favori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tur, entity_id: entityId }),
      });
      if (!res.ok) throw new Error('İşlem başarısız');
      const data = await res.json();
      setFavori(data.favori);
      goster(data.favori ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı', 'basari');
      router.refresh();
    } catch (e: any) {
      goster(e?.message ?? 'Hata', 'hata');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={yukleniyor}
      className={`text-sm px-2.5 py-1.5 rounded-md transition-colors ${
        favori
          ? 'bg-amber-900/40 text-amber-300 border border-amber-800/50 hover:bg-amber-800/60'
          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 border border-neutral-700'
      } disabled:opacity-50`}
      title={favori ? 'Favorilerden çıkar' : 'Favorilere ekle'}
    >
      {favori ? '⭐' : '☆'}
    </button>
  );
}