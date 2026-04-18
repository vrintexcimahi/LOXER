export interface DashboardGuideContent {
  summary: string;
  detailFunctions: string[];
  usageTips: string[];
  actionLabel?: string;
}

export const seekerGuideContent: Record<string, DashboardGuideContent> = {
  '/seeker/dashboard': {
    summary: 'Halaman ini menampilkan ringkasan progres pencarian kerja, notifikasi penting, dan lowongan terbaru yang bisa langsung dilamar.',
    detailFunctions: [
      'Memantau jumlah lamaran, proses seleksi, interview, dan hasil diterima.',
      'Menampilkan notifikasi terbaru dari perusahaan atau sistem LOXER.',
      'Menyediakan pintasan cepat ke lowongan terbaru dan halaman lamaran.',
    ],
    usageTips: [
      'Gunakan halaman ini sebagai ringkasan harian sebelum mulai melamar pekerjaan.',
      'Klik kartu atau tombol cepat untuk lanjut ke lowongan dan lamaran yang relevan.',
      'Lengkapi profil jika banner meminta update agar peluang cocok kerja meningkat.',
    ],
  },
  '/seeker/browse': {
    summary: 'Menu ini dipakai untuk mencari lowongan berdasarkan kata kunci, lokasi, dan filter kerja yang paling sesuai dengan profil Anda.',
    detailFunctions: [
      'Mencari lowongan berdasarkan posisi, skill, lokasi, kontrak, dan jam kerja.',
      'Menampilkan daftar hasil lowongan terbaru dari provider yang sudah terhubung.',
      'Membantu membandingkan peluang kerja tanpa perlu membuka banyak situs.',
    ],
    usageTips: [
      'Masukkan kata kunci spesifik agar hasil pencarian lebih relevan.',
      'Gabungkan filter lokasi dan tipe kontrak untuk menyaring hasil lebih cepat.',
      'Buka detail lowongan lalu lanjutkan lamaran dari hasil pencarian yang paling cocok.',
    ],
  },
  '/seeker/applications': {
    summary: 'Halaman ini menyimpan semua riwayat lamaran dan status proses seleksi agar Anda mudah memantau perkembangan setiap aplikasi.',
    detailFunctions: [
      'Melihat status setiap lamaran dari applied sampai hired atau rejected.',
      'Membantu mengecek pekerjaan mana yang masih aktif diproses perusahaan.',
      'Memudahkan evaluasi lamaran mana yang perlu ditindaklanjuti.',
    ],
    usageTips: [
      'Cek halaman ini secara rutin untuk melihat update status terbaru.',
      'Fokus pada lamaran dengan status reviewed, shortlisted, atau interview.',
      'Gunakan data di sini untuk menentukan strategi lamaran berikutnya.',
    ],
  },
  '/seeker/profile': {
    summary: 'Menu profil dipakai untuk melengkapi identitas, pengalaman, skill, dan informasi pribadi agar profil Anda siap dipakai sebagai CV digital.',
    detailFunctions: [
      'Menyimpan data diri, domisili, pengalaman, pendidikan, dan skill.',
      'Meningkatkan kecocokan antara profil dengan lowongan yang tersedia.',
      'Menyediakan basis data utama yang dipakai saat melamar tanpa upload CV berulang.',
    ],
    usageTips: [
      'Lengkapi semua bagian penting sebelum mulai melamar banyak lowongan.',
      'Pastikan skill dan pengalaman ditulis sesuai posisi yang dituju.',
      'Perbarui profil secara berkala ketika ada pengalaman baru.',
    ],
  },
};

export const employerGuideContent: Record<string, DashboardGuideContent> = {
  '/employer/dashboard': {
    summary: 'Halaman ini menjadi pusat ringkasan performa rekrutmen, menampilkan lowongan aktif, jumlah pelamar, dan aktivitas kandidat terbaru.',
    detailFunctions: [
      'Menampilkan statistik lowongan aktif, pelamar, interview, dan hasil rekrut.',
      'Membantu memantau pelamar terbaru yang masuk dari semua lowongan perusahaan.',
      'Memberikan akses cepat ke menu lowongan, pelamar, dan setup perusahaan.',
    ],
    usageTips: [
      'Gunakan dashboard ini untuk memeriksa performa rekrutmen setiap hari.',
      'Klik bagian pelamar terbaru untuk meninjau kandidat secara lebih detail.',
      'Jika belum ada data perusahaan, lengkapi profil bisnis lebih dulu.',
    ],
  },
  '/employer/jobs': {
    summary: 'Menu lowongan dipakai untuk mengelola semua posting pekerjaan, baik yang masih aktif, draft, maupun yang sudah ditutup.',
    detailFunctions: [
      'Melihat daftar lowongan yang sudah dipublikasikan oleh perusahaan.',
      'Mengubah status lowongan aktif, draft, atau closed sesuai kebutuhan.',
      'Memantau jumlah pelamar yang masuk di setiap lowongan.',
    ],
    usageTips: [
      'Periksa lowongan yang performanya rendah lalu perbarui judul atau deskripsinya.',
      'Gunakan status draft untuk menyiapkan lowongan sebelum tayang.',
      'Tutup lowongan yang sudah selesai agar kandidat tidak terus masuk.',
    ],
  },
  '/employer/jobs/new': {
    summary: 'Halaman ini digunakan untuk membuat lowongan baru lengkap dengan detail posisi, lokasi, kualifikasi, dan kuota kandidat.',
    detailFunctions: [
      'Menyusun posting lowongan baru dengan informasi posisi dan kebutuhan perusahaan.',
      'Menentukan tipe kerja, lokasi, gaji, dan syarat kandidat.',
      'Mempublikasikan lowongan agar segera muncul di area pencari kerja.',
    ],
    usageTips: [
      'Gunakan judul posisi yang jelas agar kandidat mudah menemukan lowongan.',
      'Tulis requirement yang spesifik tetapi tidak terlalu membatasi kandidat potensial.',
      'Pastikan kuota dan status lowongan sudah benar sebelum dipublikasikan.',
    ],
    actionLabel: 'Buat Lowongan',
  },
  '/employer/applicants': {
    summary: 'Menu pelamar memusatkan semua kandidat yang sudah masuk agar tim employer bisa menyeleksi, menjadwalkan interview, dan mengambil keputusan.',
    detailFunctions: [
      'Menampilkan daftar kandidat yang melamar ke lowongan perusahaan.',
      'Membantu menyaring kandidat berdasarkan status atau posisi yang dilamar.',
      'Menyediakan alur tindak lanjut dari review sampai interview dan hiring.',
    ],
    usageTips: [
      'Prioritaskan kandidat terbaru atau yang paling relevan lebih dulu.',
      'Perbarui status pelamar agar tim selalu melihat progres terbaru.',
      'Gunakan halaman ini sebagai pusat evaluasi kandidat sebelum interview.',
    ],
  },
  '/employer/company': {
    summary: 'Profil perusahaan menyimpan identitas brand employer agar lowongan terlihat lebih kredibel dan kandidat memahami bisnis Anda.',
    detailFunctions: [
      'Mengelola nama perusahaan, deskripsi, logo, website, dan industri.',
      'Menjadi sumber data utama yang tampil di lowongan dan dashboard employer.',
      'Membantu proses verifikasi perusahaan di panel admin.',
    ],
    usageTips: [
      'Lengkapi profil perusahaan sebelum mempublikasikan banyak lowongan.',
      'Gunakan deskripsi yang singkat tetapi meyakinkan untuk menarik kandidat.',
      'Perbarui identitas bisnis ketika ada perubahan brand atau kontak resmi.',
    ],
  },
};

export const adminGuideContent: Record<string, DashboardGuideContent> = {
  '/admin/dashboard': {
    summary: 'Dashboard admin dipakai untuk memantau kesehatan platform, statistik inti, dan aktivitas penting dari seluruh sistem LOXER.',
    detailFunctions: [
      'Menampilkan ringkasan total user, lowongan, lamaran, dan perusahaan.',
      'Membantu memonitor tren pertumbuhan dan status operasional platform.',
      'Menjadi titik awal navigasi ke modul admin yang lebih detail.',
    ],
    usageTips: [
      'Mulai audit platform harian dari halaman ini.',
      'Gunakan statistik untuk mendeteksi penurunan aktivitas lebih cepat.',
      'Lanjutkan ke menu detail jika ada anomali pada angka atau tren.',
    ],
  },
  '/admin/users': {
    summary: 'Menu ini dipakai untuk mengelola akun user, role, dan status akses agar kualitas data platform tetap terjaga.',
    detailFunctions: [
      'Melihat daftar seeker, employer, dan admin yang terdaftar.',
      'Mengubah role atau status user sesuai kebutuhan operasional.',
      'Membantu investigasi akun bermasalah atau akun yang perlu dibatasi.',
    ],
    usageTips: [
      'Gunakan pencarian dan filter untuk menemukan user tertentu lebih cepat.',
      'Pastikan perubahan role dilakukan dengan pertimbangan yang tepat.',
      'Cek histori atau audit terkait sebelum menghapus akun penting.',
    ],
  },
  '/admin/jobs': {
    summary: 'Menu pekerjaan admin berfungsi untuk mengawasi seluruh lowongan lintas perusahaan dan menjaga kualitas posting yang tayang.',
    detailFunctions: [
      'Melihat seluruh lowongan yang aktif, draft, atau closed di platform.',
      'Mengubah status atau menghapus lowongan yang melanggar kebijakan.',
      'Membantu meninjau kategori, lokasi, dan performa lowongan perusahaan.',
    ],
    usageTips: [
      'Periksa lowongan yang mencurigakan atau kualitasnya buruk.',
      'Gunakan filter untuk audit lowongan dari perusahaan tertentu.',
      'Simpan catatan tindakan melalui audit log bila perlu.',
    ],
  },
  '/admin/applications': {
    summary: 'Halaman pelamar admin memusatkan seluruh aplikasi kandidat agar tim admin bisa memantau proses lintas perusahaan.',
    detailFunctions: [
      'Menampilkan semua lamaran yang masuk di seluruh platform.',
      'Membantu mengecek distribusi status aplikasi antar perusahaan.',
      'Memudahkan audit proses hiring dan tindak lanjut kandidat.',
    ],
    usageTips: [
      'Gunakan halaman ini saat perlu investigasi keluhan kandidat atau employer.',
      'Perhatikan status yang macet terlalu lama pada tahap tertentu.',
      'Bandingkan pola lamaran untuk memahami performa lowongan.',
    ],
  },
  '/admin/companies': {
    summary: 'Menu perusahaan digunakan untuk memverifikasi identitas bisnis, kualitas profil employer, dan aktivitas perusahaan di platform.',
    detailFunctions: [
      'Melihat seluruh perusahaan yang terdaftar dan status verifikasinya.',
      'Memverifikasi atau mencabut verifikasi perusahaan jika diperlukan.',
      'Membantu memeriksa profil bisnis sebelum perusahaan aktif merekrut.',
    ],
    usageTips: [
      'Cek website, deskripsi, dan identitas perusahaan sebelum verifikasi.',
      'Gunakan data ini untuk memantau employer yang aktif atau bermasalah.',
      'Hapus atau tindak lanjuti perusahaan palsu sesegera mungkin.',
    ],
  },
  '/admin/logs': {
    summary: 'Audit log menyimpan jejak tindakan admin agar semua perubahan sensitif dapat ditinjau kembali dengan mudah.',
    detailFunctions: [
      'Mencatat aksi penting seperti perubahan role, verifikasi, dan penghapusan.',
      'Membantu investigasi keputusan admin yang terjadi sebelumnya.',
      'Menjadi sumber utama untuk review keamanan dan kepatuhan operasional.',
    ],
    usageTips: [
      'Gunakan filter tanggal dan aksi untuk audit yang lebih cepat.',
      'Periksa audit log sebelum melakukan koreksi terhadap tindakan admin lain.',
      'Simpan kebiasaan review log untuk perubahan sensitif.',
    ],
  },
  '/admin/integrations': {
    summary: 'Integrasi API berfungsi sebagai pusat monitoring koneksi provider lowongan, endpoint proxy, dan kebutuhan setup layanan eksternal.',
    detailFunctions: [
      'Menampilkan status provider seperti Careerjet, Jooble, Arbeitnow, dan JSearch.',
      'Menyimpan catatan endpoint yang dipakai sistem LOXER untuk lowongan.',
      'Membantu admin mengecek kebutuhan whitelist IP dan API key.',
    ],
    usageTips: [
      'Periksa halaman ini saat lowongan eksternal tidak muncul.',
      'Bandingkan status provider configured dan perlu setup sebelum debug lebih jauh.',
      'Gunakan IP publik server yang tampil untuk kebutuhan whitelist provider.',
    ],
  },
  '/admin/analytics': {
    summary: 'Advanced Analytics dipakai untuk melihat funnel, tren pertumbuhan, dan health score platform secara lebih mendalam.',
    detailFunctions: [
      'Menyajikan snapshot pertumbuhan user, lowongan, dan lamaran.',
      'Menampilkan conversion funnel dari user sampai hasil hiring.',
      'Membantu admin mengambil keputusan berdasarkan performa platform.',
    ],
    usageTips: [
      'Gunakan halaman ini untuk evaluasi mingguan atau bulanan.',
      'Bandingkan funnel dan health score sebelum membuat keputusan produk.',
      'Refresh data secara berkala bila ada perubahan besar di sistem.',
    ],
  },
  '/admin/flags': {
    summary: 'Feature Flags memungkinkan admin mengontrol fitur tertentu tanpa harus melakukan deploy baru ke production.',
    detailFunctions: [
      'Mengaktifkan atau menonaktifkan fitur secara cepat.',
      'Membantu rollout bertahap pada fitur yang masih diuji.',
      'Memberi kontrol operasional jika ada fitur yang perlu dimatikan sementara.',
    ],
    usageTips: [
      'Catat alasan perubahan flag sebelum mengubah statusnya.',
      'Gunakan untuk mitigasi insiden ringan tanpa rollback penuh.',
      'Periksa efek perubahan flag pada workspace terkait setelah diubah.',
    ],
  },
  '/admin/moderation': {
    summary: 'Moderation Queue menyimpan konten atau data yang butuh review agar kualitas platform dan kepatuhan tetap terjaga.',
    detailFunctions: [
      'Mengelola item yang perlu diperiksa secara manual oleh admin.',
      'Membantu memberi score AI atau tanda risiko pada konten tertentu.',
      'Menjadi area eskalasi sebelum tindakan moderasi diambil.',
    ],
    usageTips: [
      'Prioritaskan item dengan risiko tertinggi terlebih dahulu.',
      'Gunakan catatan moderasi agar keputusan mudah dilacak kembali.',
      'Pastikan tindakan moderasi selaras dengan kebijakan platform.',
    ],
  },
  '/admin/broadcast': {
    summary: 'Broadcast System dipakai untuk mengirim campaign atau pengumuman ke segmen user tertentu langsung dari panel admin.',
    detailFunctions: [
      'Membuat pesan broadcast untuk kelompok user yang berbeda.',
      'Membantu mengelola komunikasi massal tanpa tools eksternal.',
      'Mendukung alur campaign internal dan notifikasi operasional.',
    ],
    usageTips: [
      'Pastikan segmentasi user sudah tepat sebelum mengirim campaign.',
      'Tulis pesan yang ringkas agar mudah dipahami penerima.',
      'Gunakan preview atau pengecekan manual sebelum publikasi.',
    ],
  },
  '/admin/security': {
    summary: 'Security Center menjadi pusat pantau keamanan admin, blokir IP, session aktif, dan kejadian sensitif lain di panel.',
    detailFunctions: [
      'Memantau session admin yang masih aktif.',
      'Mengelola daftar blokir IP dan alasan pemblokirannya.',
      'Membantu audit keamanan pada aktivitas sensitif platform.',
    ],
    usageTips: [
      'Review session aktif jika ada dugaan akses tidak sah.',
      'Gunakan blokir IP dengan alasan yang jelas dan terdokumentasi.',
      'Lakukan audit berkala terhadap catatan keamanan yang masuk.',
    ],
  },
};
