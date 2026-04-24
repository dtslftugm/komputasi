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
- **Input Kunci Aktivasi Dinamis Berbasis Aturan (*Rule-Based Multi-Key*)**: Automasi deteksi software yang memerlukan mekanisme *Borrow License*. Jika permohonan mencakup beberapa software bertipe ini, sistem akan menyediakan kolom input kunci aktivasi yang dinamis dan terpisah untuk setiap produk. Hal ini menjamin admin dapat mengelola kunci aktivasi vendor yang berbeda dalam satu alur persetujuan, dengan penggabungan data otomatis yang tetap menjaga akurasi laporan statistik penggunaan lisensi per produk.
- **Manajemen Kredensial *RustDesk/AnyDesk***: Kolom tabel *"Daftar User Aktif"* pada pangkalan data yang interaktif (baris dapat diklik) sehingga Laboran dapat melacak ID layar pengguna hanya dengan sekali ketuk. Serta melakukan pengecekan unit komputer yang sedang digunakan secara remote.
- **Fleksibilitas Sentral Parameter (*Config Sheet*)**: Tata kelola regulasi, sirkulasi masa aktif pemakaian komputer, hingga preservasi akses Dosen yang permanen dikendalikan dari *Google Sheet Config* yang sangat fleksibel. Perubahan parameter apa pun (*Dynamic Config*) dapat terdistribusi seketika ke aplikasi peramban tanpa harus mengedit sebaris pun kode bahasa mesin, sekaligus menjamin hak prioritas lisensi Dosen selalu terlindungi.
- **Sistem Email Notifikasi Kelayakan Layanan**: Pemberitahuan otomatis (via email) kepada Admin atas urgensi status perawatan atau pemeliharaan perangkat (*hardware/software maintenance*). Hal ini mempercepat reaksi Admin dalam menindaklanjuti unit komputer yang perlu pemeliharaan.
- **Manajemen Relasi Lisensi & Token**: Algoritma peringatan ambang batas (*threshold/quota alert*), mengawal batas penggunaan *software* simultan, masa kontrak *software* vendor, dan menolak pengajuan jika seat telah habis.
- **Sistem Validasi Agenda Workshop**: Modul generator portal acara di sisi laboran yang memiliki kapabilitas *strict matching* "Kode Peserta", menyelaraskan kebutuhan praktikum masal tanpa menabrak jadwal regu riset rutin.
- **Audit Cerdas Bertenaga AI (Gemini Document Auditor)**: Transformasi verifikasi berkas perizinan mahasiswa dari manual menjadi sepenuhnya otomatis menggunakan model AI mutakhir (Gemini Flash). Fitur ini memiliki kapabilitas analitik untuk melakukan:
    - **Validasi Kontekstual**: Memastikan Judul Penelitian pada dokumen identik dengan input pendaftaran mahasiswa.
    - **Pemeriksaan Masa Berlaku (Strict Expiry)**: Mendeteksi tanggal berakhir secara presisi dan menolak dokumen yang tidak mencantumkan tenggat waktu secara jelas.
    - **Deteksi Kecurangan (Anti-Fraud)**: Menganalisa inkonsistensi logis antar tanggal (misal: tanggal terbit > tanggal berakhir) serta mendeteksi anomali teks yang mencurigakan (indikasi edit manual).
    - **Verifikasi TTE & QR Code**: Mendeteksi keberadaan Tanda Tangan Elektronik atau QR Code instruksional yang sah pada dokumen pendaftaran.
    - **Sistem Integrasi Tangguh**: Dilengkapi dengan mekanisme *Exponential Backoff* untuk menangani kesibukan server Google serta logika *Auto-Repair* untuk memperbaiki struktur data JSON yang terpotong. Hasil audit langsung disajikan dengan indikator warna (Hijau/Merah) pada pangkalan data admin untuk mempercepat pengambilan keputusan final.

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

---

## ⚙️ 4. Parameter & Aturan Penggunaan Layanan (SOP Digital)
Bagian ini merinci parameter teknis yang menjamin standarisasi pelayanan:

- **Sirkulasi Masa Pakai Standar**:
    - **Lisensi Software**: Standar durasi penggunaan adalah **30 hari** (dapat dikonfigurasi via *Config Sheet*).
    - **Unit Komputer (Seat)**: Untuk menjamin keadilan bagi seluruh mahasiswa yang ingin menggunakan fasilitas, penggunaan unit fisik di Ruang Penelitian akan diberikan maksimal **14 hari** berturut-turut bila tidak terdapat antrean, sedangkan lisensi software akan tetap berlaku selama 30 hari.
- **Protokol Validasi Berkas Perizinan**:
    - **Kesesuaian Kontekstual**: Judul penelitian pada dokumen harus memiliki tingkat kemiripan tinggi dengan judul/topik yang diinputkan pada form pendaftaran.
    - **Integritas Waktu**: Dokumen dianggap **TIDAK VALID** jika tanggal berakhir sudah terlampaui atau jika terdapat anomali kronologis (tanggal terbit lebih muda dari tanggal berakhir).
    - **Atribut Keabsahan Tanda Tangan**: Dokumen wajib menyertakan setidaknya **1 tanda tangan basah** milik pengguna (mahasiswa), serta **1 tanda tangan basah atau tanda tangan elektronik (TTE)** yang sah milik Dosen Pembimbing atau pejabat yang berwenang.
- **Ketentuan Perpanjangan (*Renewal SOP*)**:
    - **Akuntabilitas**: Mahasiswa wajib menginputkan laporan progres minimal **20 karakter**. Sistem akan menolak input yang terlalu pendek atau hanya berupa karakter acak.
    - **Sinkronisasi Data**: Masa perpanjangan dihitung secara otomatis menyambung dari tanggal berakhir sebelumnya guna mencegah tumpang tindih masa pakai.
- **Jendela Pemesanan (*Booking Window*)**:
    - Sistem membatasi pemilihan tanggal "Mulai Pemakaian" maksimal **7 hari ke depan (H+7)** dari hari operasional berjalan untuk mencegah pemesanan slot fiktif jangka panjang.
- **Protokol Penghapusan Data (*Grace Period*)**:
    - Data pekerjaan mahasiswa di unit komputer akan dipertahankan selama **60 hari** setelah masa berlaku habis sebelum masuk ke jadwal pembersihan otomatis oleh sistem.
- **Integritas & Keamanan Data Pengguna**:
    - **Isolasi Profil Pengguna (*Windows User Profile*)**: Sebagai langkah perlindungan privasi dan keamanan data, sistem menerapkan kebijakan pembuatan **profil pengguna Windows** (sesuai nama pemohon) pada setiap unit komputer yang dialokasikan. Pengguna **dilarang keras** mengakses atau menggunakan profil Windows milik orang lain. Ketentuan ini bertujuan untuk memastikan isolasi data antar pengguna dapat terjaga dengan baik.
    - **Tanggung Jawab Mandiri**: Seluruh data hasil pekerjaan, file simulasi, maupun dokumen pribadi yang disimpan di dalam unit komputer laboratorium merupakan tanggung jawab sepenuhnya dari masing-masing pengguna. Pengguna sangat disarankan untuk melakukan pencadangan (*backup*) data secara mandiri dan berkala ke media penyimpanan eksternal atau *cloud storage* pribadi.
    - **Batasan Jaminan & *Force Majeure***: Pengelola laboratorium berkomitmen untuk menjaga stabilitas infrastruktur dan keamanan sistem secara optimal. Namun demikian, pengelola tidak dapat memberikan jaminan mutlak terhadap keutuhan data terhadap risiko kehilangan atau kerusakan yang disebabkan oleh kegagalan sistem teknis maupun kejadian di luar kendali pengelola (*Force Majeure*), termasuk namun tidak terbatas pada bencana alam, kebakaran, atau gangguan daya listrik yang mengakibatkan data tidak dapat diakses kembali.