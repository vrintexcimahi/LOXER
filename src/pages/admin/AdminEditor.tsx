import { useEffect, useState } from 'react';
import { Puck, type Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { homepageConfig } from '../../components/puck/homepageConfig';
import { defaultHomepageData, isHomepageData } from '../../components/puck/homepageData';

const HOMEPAGE_SLUG = 'homepage';

export default function AdminEditor() {
  const { user, userMeta } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [editorData, setEditorData] = useState<Data>(defaultHomepageData);
  const [publishMessage, setPublishMessage] = useState('');

  const canEdit = Boolean(user && userMeta?.role === 'admin');

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!canEdit || !supabase) {
        if (active) setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('pages')
        .select('data')
        .eq('slug', HOMEPAGE_SLUG)
        .maybeSingle();

      if (!active) return;

      if (error) {
        if (error.code === '42P01') {
          setPublishMessage('Tabel pages belum ada. Jalankan migration CMS pages di Supabase.');
        } else {
          setPublishMessage(`Gagal load konten: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }

      if (isHomepageData(data?.data)) {
        setEditorData(data.data);
      }

      setIsLoading(false);
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [canEdit]);

  async function publishData(nextData: Data) {
    if (!supabase || !user) return;

    setPublishMessage('Mempublish perubahan...');
    const now = new Date().toISOString();

    const { error } = await supabase.from('pages').upsert(
      {
        slug: HOMEPAGE_SLUG,
        data: nextData,
        published_at: now,
        updated_at: now,
        updated_by: user.id,
      },
      { onConflict: 'slug' }
    );

    if (error) {
      setPublishMessage(`Publish gagal: ${error.message}`);
      return;
    }

    setEditorData(nextData);
    setPublishMessage(`Published ${new Date().toLocaleTimeString('id-ID')}`);
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center px-6">
        <div className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-white">
          <h1 className="text-xl font-semibold">Akses editor dibatasi</h1>
          <p className="mt-2 text-sm text-white/70">
            Halaman ini khusus role admin.
          </p>
          <a
            href="/admin/dashboard"
            className="mt-5 inline-flex rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Kembali ke dashboard
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-center text-white">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-cyan-300/30 border-t-cyan-300" />
          <p className="text-sm text-white/70">Menyiapkan visual editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-sm text-slate-100">
        <div>
          <p className="font-semibold">Homepage Visual Editor</p>
          <p className="text-xs text-slate-400">Route ini menyimpan konten ke tabel pages (slug: homepage).</p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle compact />
          {publishMessage ? <span className="text-xs text-cyan-300">{publishMessage}</span> : null}
          <a href="/" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white">
            Lihat Homepage
          </a>
        </div>
      </div>

      <Puck
        config={homepageConfig}
        data={editorData}
        onPublish={(nextData) => {
          void publishData(nextData as Data);
        }}
      />
    </div>
  );
}
