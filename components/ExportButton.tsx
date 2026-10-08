'use client';
import { useState } from 'react';
import { useToast } from './Toast';

type Props = {
  tur: string;                                    // API'nin beklediği parametre
  params?: Record<string, string>;
  label?: string;
  className?: string;
};

export default function ExportButton({
  tur,
  params = {},
  label = '📤 Export',
  className,
}: Props) {
  const [acik, setAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const { goster } = useToast();

  const gonder = async () => {
    if (gerekce.trim().length < 10) {
      goster('Gerekçe en az 10 karakter olmalı', 'hata');
      return;
    }
    setYukleniyor(true);
    try {
      const qs = new URLSearchParams({ tur, gerekce: gerekce.trim(), ...params }).toString();
      const res = await fetch(`/api/export?${qs}`);

      if (!res.ok) {
        const metin = await res.text();
        throw new Error(metin || `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tur}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      goster('Export başarılı, dosya indirildi', 'basari');
      setAcik(false);
      setGerekce('');
    } catch (e: any) {
      goster('Export başarısız: ' + (e?.message ?? 'bilinmeyen hata'), 'hata');
    } finally {
      setYukleniyor(false);
    }
  };

  const kapat = () => {
    if (yukleniyor) return;
    setAcik(false);
    setGerekce('');
  };

  const gecerliMi = gerekce.trim().length >= 10 && !yukleniyor;

  return (
    <>
      <button
        onClick={() => setAcik(true)}
        className={
          className ??
          'text-xs px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 transition-colors'
        }
      >
        {label}
      </button>

      {acik && (
        <div
          className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4"
          onClick={kapat}
        >
          <div
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2">Export Gerekçesi</h2>
            <p className="text-xs text-neutral-500 mb-4">
              KVKK ve audit gereği export işlemi gerekçe ile kaydedilir.
              <br />
              Tip: <code className="text-neutral-400">{tur}</code>
            </p>

            <textarea
              value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              rows={4}
              placeholder="Örn: 05.10.2026 tarihli ihale toplantısı için Ankara il müdürleri listesi gerekiyor"
              className="w-full p-3 rounded-md bg-neutral-950 border border-neutral-800 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
              autoFocus
              disabled={yukleniyor}
            />

            <div className="flex justify-between items-center mt-2 mb-4 text-xs">
              <span className={gerekce.trim().length < 10 ? 'text-amber-500' : 'text-green-500'}>
                {gerekce.length} karakter (min 10)
              </span>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={kapat}
                disabled={yukleniyor}
                className="px-4 py-2 text-sm rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={gonder}
                disabled={!gecerliMi}
                className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {yukleniyor && (
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {yukleniyor ? 'İndiriliyor...' : 'Export Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}