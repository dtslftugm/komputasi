# Rangkuman Fitur Layanan Laboratorium Komputasi DTSL

Dokumen ini merangkum seluruh kemampuan dan fitur yang telah diimplementasikan di dalam platform pendaftaran serta manajemen Laboratorium Komputasi. 

---

## 👨‍🎓 1. Fitur untuk Pengguna (Mahasiswa / Peserta)
Fitur-fitur ini didesain untuk menjamin kemudahan akses, keadilan alokasi sumber daya, dan transparansi proses peminjaman bagi pengguna akhir.

- **Katalog Kesediaan Real-Time**: Sistem secara cerdas memfilter unit komputer dan ketersediaan lisensi *software*. Mahasiswa hanya disuguhkan daftar unit yang benar-benar kosong dan memiliki jatah seat license yang tersedia saat itu juga, mencegah terjadinya bentrok penjadwalan maupun kegagalan lisensi.
- **Dinamika Pemilihan *Software* (Multi-select & Searchable)**: Antarmuka yang dilengkapi pemilih *Dropdown* dengan fitur pencarian *(Searchable)* membebaskan pengguna dari repotnya *scrolling* daftar lisensi yang panjang. Sistem juga mendukung penolakan konflik lintas-vendor (Memunculkan peringatan otomatis misalnya jika menggabungkan lisensi *"AERMOD View"* dengan *"STKO Opensees Unlimit"* di unit yang sama).
- ***Smart Auto-Renewal* (Perpanjangan Otomatis)**: Mahasiswa tidak perlu mengisi form panjang dari nol. Melalui ID perpanjangan, seluruh konfigurasi lama otomatis terisi *(pre-fill)*.
- **Sistem Pelacakan Pengguna Lama (NIM Cross-Detection)**: Algoritma canggih yang mendeteksi nomor profil/NIM secara *background*. Mencegah mahasiswa lama dianggap sebagai "User Baru".
- **Jurnal *Rolling Progress Tracking***: Form akuntabilitas mandiri. Setiap mahasiswa yang memperpanjang penggunaan layanan diwajibkan menulis pencapaian progres, rancangan target, hingga kendala bimbingan teknis yang mungkin terjadi (Tulis minimal 20 Karakter).
- **Notifikasi Keadilan Penggunaan (Sistem Antrean)**: Peringatan indikator *"Queue Warning"* berwarna merah yang otomatis muncul saat terjadi antrean di Ruang Penelitian dengan harapan dapat menggugah empati pengguna agar tidak melakukan monopoli penggunaan komputer secara beruntun.
- **Harmonisasi Agenda (*Event-Based Enrolment*)**: Melindungi pengalaman pengguna dengan sistem isolasi jadwal pintar. Sistem sudah mengunci komputer saat ada reservasi agenda institusi via "Kode Peserta" yang dikirimkan kepada penyelenggara.
- **Pengingat Habis Masa Pakai (*Auto-Reminder*)**: Pengiriman email pengingat secara otomatis kepada mahasiswa pengakses pada H-3 hingga H0 (*jatuh tempo*) peringatan tenggat waktu pelayanan untuk memandu perpanjangan atau penyelesaian riset secara apik.
- **Penghematan Bandwidth (*Hyperlink Document*)**: Pengajuan berkas kini berbasis *"Paste Link"* dokumen alih-alih mengunggah *(upload)* berkas fisik ke server. Arsitektur ini sukses meringankan lalu lintas data (*bandwidth*) dan mengamankan kuota penyimpanan Google Drive institusi dalam jangka panjang.
- **Aksesibilitas Barcode Cepat (*QR-Code Check-in*)**: Fasilitas akses Web-App pintar lewat pindai *QR-code* di lokasi, menghindari kerepotan mengetik alamat URL yang panjang.
- **Pramuat Penanggalan Presisi (*Smart Defaulting*)**: Kolom parameter "Mulai Pemakaian" akan terisi secara otomatis *(auto-filled)* dengan tanggal yang sama dengan waktu pengajuan dokumen untuk memangkas *clicks* dan potensi kelalaian.
- **Limitasi Penanggalan Kritis**: Validasi penguncian kalender yang tidak mengizinkan *booking* melewati periode H+7 dari tanggal operasi berjalan.
- **Aksesibilitas UI/UX Modern**: Dukungan *Dark Mode* (mode gelap) universal, penyesuaian pop-up panel pengumuman, dan dukungan peramban (Chrome, Mozilla, Safari, Mobile).

---

## 👨‍💻 2. Fitur untuk Admin / Laboran (Manajemen Operasional)
Fitur ini berfokus pada automasi infrastruktur tingkat lanjut (*infrastructure-as-code*) dan pengawasan *hardware/software* berbasis telemetri.

- **Automasi Format Telepon WhatsApp**: Seluruh input Nomor HP Mahasiswa dikalibrasi ketat ke format yang ramah tautan *(Clickable WhatsApp)* di dalam mesin Spreadsheet. Laboran kini bisa mengirimkan pesan pemberitahuan kilat tanpa repot menyimpan nomor terlebih dahulu.
- **Otomasi *Password Generator RustDesk/AnyDesk***: Mampu menciptakan parameter sandi secara acak dan kuat, menghilangkan celah kerentanan *password* lemah buatan manusia yang mudah diretas, atau kelupaan dari sisi laboran.
- **Tautan Akses Lampiran Cepat**: Meletakkan *hyperlink* dokumen perizinan tepat bersamaan dengan baris *dashboard* persetujuan mahasiswa. Laboran tidak akan lagi menghabiskan waktu menyusuri portal Google Drive untuk mencari berkas izin yang menumpuk.
- **Generator Penyetelan Lisensi (*License Server Automation*)**: Skrip langsung memetakan nilai pengaturan basis server mesin (*port/hostname*) otomatis. Fitur ini membebaskan admin dari keharusan bolak-balik berinteraksi dengan portal atau *software manager* vendor yang sangat repetitif.
- **Manajemen Kredensial *RustDesk/AnyDesk***: Kolom tabel *"Daftar User Aktif"* pada pangkalan data yang interaktif (baris dapat diklik) sehingga Laboran dapat melacak ID layar pengguna hanya dengan sekali ketuk. Serta melakukan pengecekan unit komputer yang sedang digunakan secara remote.
- **Fleksibilitas Sentral Parameter (*Config Sheet*)**: Tata kelola regulasi, sirkulasi masa aktif pemakaian komputer, hingga preservasi akses Dosen yang permanen dikendalikan dari *Google Sheet Config* yang sangat fleksibel. Perubahan parameter apa pun (*Dynamic Config*) dapat terdistribusi seketika ke aplikasi peramban tanpa harus mengedit sebaris pun kode bahasa mesin, sekaligus menjamin hak prioritas lisensi Dosen selalu terlindungi.
- **Sistem Email Notifikasi Kelayakan Layanan**: Pemberitahuan otomatis (via email) kepada Admin atas urgensi status perawatan atau pemeliharaan perangkat (*hardware/software maintenance*). Hal ini mempercepat reaksi Admin dalam menindaklanjuti unit komputer yang perlu pemeliharaan.
- **Manajemen Relasi Lisensi & Token**: Algoritma peringatan ambang batas (*threshold/quota alert*), mengawal batas penggunaan *software* simultan, masa kontrak *software* vendor, dan menolak pengajuan jika seat telah habis.
- **Sistem Validasi Agenda Workshop**: Modul generator portal acara di sisi laboran yang memiliki kapabilitas *strict matching* "Kode Peserta", menyelaraskan kebutuhan praktikum masal tanpa menabrak jadwal regu riset rutin.

**🚀 Rencana Implementasi Masa Depan / Tahap Stabilisasi (*Future Implementations*)**
Fitur-fitur infrastruktur lanjutan di bawah ini sedang dalam proses pengembangan/pengujian stabilitas integrasi ke dalam ekosistem:
- ***Device Inventory & Remote Dashboard***: Dasbor GUI komprehensif tunggal untuk mengontrol mesin via PC *Gateway* jaringan lokal secara *remote* (mengeksekusi *PowerShell* ke seluruh PC lab).
- **Otomasi Kendali Komputer Jarak Jauh (WOL & Sinkronisasi)**: Kapasitas mengirim magic packet *Wake-On-LAN* untuk menyalakan komputer secara remote.
- ***Hardware & Telemetry Monitoring***: Sistem lacak mandiri (*Tracker*) berbasis beban prosesor (*CPU Threading / RAM Profiling / Active Session*) berlandaskan PID untuk mendeteksi *workstation* menganggur (*idle*) atau full load.
- **Otomasi Rotasi Pengguna (*Auto-Revoke* & *Watchdog*)**: Penonaktifan *expired user* secara otomatis dan sinkronisasi status penghapusan riwayat *Profile* Windows beserta data-data user yang telah non-aktif dengan manajemen Spreadsheet.
- **Verifikasi Akademik SIA Terpusat (NIM Validator)**: Pengecekan otomasi status (*Mahasiswa Aktif / Cuti / Lulus*) menggunakan *gateway* basis data akademik departemen dengan NIM sebagai pilar utamanya guna menolak mahasiswa non-aktif agar tidak menempati slot berharga laboratorium komputasi.
- **Ekspansi Infrastruktur Kelas Pengembang (*Kategori Akses "Mitra"*)**: Merombak ekologi hierarki sistem untuk mengakomodir identitas delegasi eksternal atau keagenan korporat. Memungkinkan lab melayani proyek pendanaan non-universitas (mitra) dengan perlindungan privasi isolasi lisensi dan instrumen manajemen terpisah.

---

## 👔 3. Fitur untuk Atasan (Kepala Lab / Jajaran Manajemen)
Berpusat pada analisis, optimalisasi investasi lab, serta mempermudah evaluasi kebijakan.

- **Dasbor Statistik Publik yang Sangat Komprehensif Muti-Dimensi**: Halaman `reports.html` disajikan tanpa *login*. Dirancang khusus dengan grafik modern dan antarmuka sangat intuitif yang merangkum tuntas detail kompleks mencakup utilitas per *Software*, rotasi mahasiswa, waktu penggunaan, hingga ketersediaan kursi komputer dalam sekejap tanpa memerlukan rekap manual.
- **Analitik Jurnal Penggunaan (Diagnostik Dosen & Lab)**: Keunggulan fitur tracking (Kendala & Progres) bukan hanya untuk mencecar mahasiswa, melainkan menyoroti "titik buta". Misalnya, apakah komputer lab disalahkan atas simulasi yang lambat, atau ternyata mahasiswa tertahan karena faktor Dosen Pembimbing?
- **Justifikasi Perencanaan Anggaran LISENSI ASET ASET (ROI)**: Memastikan manajemen tidak membuang dana sia-sia untuk pembelian *Hardware workstation* baru maupun *Software* bernilai tinggi jika sistem dasbor mendeteksi banyak utilisasi fiktif. Evaluasi anggaran berjalan berdasar data murni (*Data-driven Policy*).
- **Catatan & *Maintenance Log* Terpusat**: Pelacakan riwayat kerusakan *(pending repair)* yang tercatat presisi sehingga usia aset tiap unit tergambar jejak sejarahnya secara akurat.
