import { chromium } from 'playwright';
import path from 'node:path';

async function createCv() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 1100 } });
  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0; padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #f8fafc;
        display: flex; flex-direction: column; height: 1020px; box-sizing: border-box;
      }
      .card {
        background: #ffffff; color: #1e293b; border-radius: 16px; padding: 36px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); flex: 1; display: flex; flex-direction: column;
      }
      .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
      .name { font-size: 32px; font-weight: 800; color: #1e3a8a; margin: 0; }
      .badge { background: #2563eb; color: #fff; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; }
      .contact { display: flex; gap: 20px; margin-top: 10px; font-size: 14px; color: #475569; }
      .section { margin-bottom: 22px; }
      .section-title { font-size: 18px; font-weight: 700; color: #1e40af; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 10px; text-transform: uppercase; }
      .item { margin-bottom: 12px; }
      .item-header { font-weight: 600; font-size: 16px; color: #0f172a; }
      .item-sub { font-size: 14px; color: #64748b; }
      .item-desc { font-size: 13px; color: #334155; margin-top: 4px; }
      .skills-grid { display: flex; flex-wrap: wrap; gap: 8px; }
      .skill-pill { background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 13px; }
      .footer { margin-top: auto; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 13px; color: #64748b; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div>
          <h1 class="name">AZQY AHMAD SAPUTRA</h1>
          <div style="font-size: 18px; font-weight: 600; color: #3b82f6; margin-top: 4px;">Pencari Kerja / Operator Gudang & Packing</div>
          <div class="contact">
            <span>📱 WA: 0821-1234-5678</span>
            <span>✉️ azqy.ahmad@gmail.com</span>
            <span>📍 Cimahi, Jawa Barat</span>
          </div>
        </div>
        <div class="badge">SIAP KERJA SEGERA</div>
      </div>

      <div class="section">
        <div class="section-title">Profil Singkat</div>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">
          Pemuda bersemangat tinggi dan pekerja keras asal Cimahi dengan ijazah SMP. Memiliki kondisi fisik prima, jujur, teliti, dan siap bekerja sistem shift ataupun lembur di bidang pergudangan, logistik, atau staf operasional toko.
        </p>
      </div>

      <div class="section">
        <div class="section-title">Pendidikan Formal</div>
        <div class="item">
          <div class="item-header">SMP Negeri 1 Cimahi</div>
          <div class="item-sub">Lulus Tahun 2022</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Pengalaman Kerja</div>
        <div class="item">
          <div class="item-header">Operator Packing & Gudang - Toko Grosir Cimahi</div>
          <div class="item-sub">Januari 2023 - Desember 2023 (1 Tahun)</div>
          <div class="item-desc">• Melakukan sortir barang, packing pesanan harian, dan bongkar muat barang masuk.<br>• Membantu stock opname fisik toko dan memastikan kerapihan area gudang.</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Keahlian & Kompetensi</div>
        <div class="skills-grid">
          <div class="skill-pill">Packing Barang</div>
          <div class="skill-pill">Stock Opname</div>
          <div class="skill-pill">Sortir Pesanan</div>
          <div class="skill-pill">Bongkar Muat</div>
          <div class="skill-pill">Disiplin & Cekatan</div>
          <div class="skill-pill">Siap Lembur</div>
        </div>
      </div>

      <div class="footer">
        Siap melampirkan berkas fisik: KTP Asli, Ijazah SMP Asli, SKCK Aktif, dan Surat Keterangan Sehat.
      </div>
    </div>
  </body>
  </html>`;

  await page.setContent(html);
  const outPath = path.resolve('public/uploads/fb_scraped/sample_cv_azqy.png');
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('Sample CV image created successfully:', outPath);
}

createCv().catch(console.error);
