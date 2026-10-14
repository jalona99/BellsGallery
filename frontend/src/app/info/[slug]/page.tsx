import Link from "next/link";
import { notFound } from "next/navigation";

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  // Format slug (e.g. "kebijakan-pengembalian" to "Kebijakan Pengembalian")
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const contentMap: Record<string, React.ReactNode> = {
    "informasi-perusahaan": (
      <>
        <p className="mb-4">
          <strong>BELLS GALLERY</strong> adalah butik rumahan independen yang menghadirkan koleksi pakaian berkualitas dengan harga yang sangat bersahabat. Kami mengusung konsep belanja cerdas dengan menawarkan produk <em>original</em> sisa pabrik. Setiap helai pakaian telah melalui proses kurasi mandiri yang ketat untuk memastikan kondisi dan kelayakannya tetap di angka 98% layaknya barang baru.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Visi</h2>
        <p className="mb-4">
          Menjadi destinasi alternatif pakaian original berkualitas tinggi dan terjangkau, sekaligus mengedepankan nilai kejujuran bagi pelanggan.
        </p>
        <h2 className="text-xl font-bold mt-8 mb-3">Misi</h2>
        <ol className="list-decimal text-left inline-block mb-4 space-y-2">
          <li>Menyediakan produk pakaian <em>original</em> sisa ekspor/pabrik dengan tingkat kelayakan pakai mencapai 98%.</li>
          <li>Memberikan transparansi penuh mengenai kondisi barang (<em>minor defect</em>) sebelum pembelian.</li>
          <li>Menghadirkan pelayanan yang personal dan bersahabat khas toko rumahan lokal.</li>
        </ol>
        <h2 className="text-xl font-bold mt-8 mb-3">Sejarah Singkat</h2>
        <p className="mb-4">
          Berawal dari dedikasi di sebuah rumah pribadi, BELLS GALLERY didirikan dengan satu tujuan sederhana: memberikan akses pakaian dengan kualitas bahan asli kepada pelanggan tanpa harus membayar harga retail mahal. Kami memulai langkah UMKM ini dengan komitmen memberikan produk sisa pabrik terbaik yang masih sangat layak dan bergaya.
        </p>
      </>
    ),
    "lokasi-toko": (
      <div className="text-left space-y-6">
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-black uppercase tracking-tight mb-2 text-black">BELLS GALLERY (Galeri Kyabel)</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>Alamat Lengkap:</strong><br />
            Galeri Kyabel, RWR5+P3R, Sugihwaras, Ngampel, Kapas, Kabupaten Bojonegoro, Jawa Timur 62181.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
            <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-full font-medium">📍 Kapas, Bojonegoro</span>
            <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-full font-medium">🛍️ Toko Rumahan / Offline Store</span>
          </div>
          <a 
            href="https://www.google.com/maps/search/?api=1&query=Galeri+Kyabel,+Sugihwaras,+Kapas,+Bojonegoro" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            🗺️ Buka Petunjuk Arah di Google Maps
          </a>
        </div>

        {/* Interactive Google Maps Embed */}
        <div className="w-full h-[380px] md:h-[450px] rounded-xl overflow-hidden border border-gray-200 shadow-md relative bg-gray-100">
          <iframe
            title="Lokasi Toko BELLS GALLERY"
            src="https://maps.google.com/maps?q=Galeri+Kyabel,+Sugihwaras,+Kapas,+Bojonegoro&t=&z=16&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    ),
    "faq": (
      <div className="text-left space-y-6">
        <div className="bg-neutral-50 p-5 rounded-lg border border-neutral-200">
          <h3 className="font-bold text-lg text-black">T: Apa maksud dari produk original sisa pabrik (98% baik)?</h3>
          <p className="mt-2 text-gray-700 leading-relaxed">
            <strong>J:</strong> Produk kami adalah pakaian <em>original</em> asli pabrik yang tidak masuk rak ritel/mall karena cacat sangat minor (misalnya: sisa benang jahitan, label merk dicoret/dilepas kebijakan pabrik, atau tanpa tag harga toko). Bahan, material kain, dan potongan pola dijamin 100% original dengan tingkat kelayakan pakai 98% seperti barang baru.
          </p>
        </div>
        <div className="bg-neutral-50 p-5 rounded-lg border border-neutral-200">
          <h3 className="font-bold text-lg text-black">T: Bagaimana cara melakukan pemesanan di BellsGallery?</h3>
          <p className="mt-2 text-gray-700 leading-relaxed">
            <strong>J:</strong> Anda dapat memesan langsung melalui website ini menggunakan sistem keranjang belanja &amp; pembayaran otomatis Midtrans, memesan cepat via WhatsApp Admin, atau berbelanja melalui Toko Resmi Shopee BellsGallery untuk mendapatkan promo gratis ongkir dan jaminan retur pihak ketiga.
          </p>
        </div>
        <div className="bg-neutral-50 p-5 rounded-lg border border-neutral-200">
          <h3 className="font-bold text-lg text-black">T: Mengapa berbelanja via Shopee bisa terasa lebih aman bagi sebagian pembeli?</h3>
          <p className="mt-2 text-gray-700 leading-relaxed">
            <strong>J:</strong> Belanja lewat akun resmi Shopee BellsGallery memberikan rasa aman ekstra karena uang Anda ditahan oleh rekening bersama Shopee sampai pesanan tiba dengan baik, serta didukung fitur <em>Shopee Garansi Bebas Pengembalian</em> jika pesanan tidak sesuai ekspektasi.
          </p>
        </div>
        <div className="bg-neutral-50 p-5 rounded-lg border border-neutral-200">
          <h3 className="font-bold text-lg text-black">T: Bagaimana cara melacak pesanan saya?</h3>
          <p className="mt-2 text-gray-700 leading-relaxed">
            <strong>J:</strong> Untuk transaksi di website, Anda dapat membuka menu <Link href="/orders" className="text-blue-600 font-semibold underline">Cek Status Pesanan</Link>. Nomor resi kurir akan dibagikan oleh Admin via WhatsApp/Email. Jika membeli di Shopee, pelacakan kurir dapat dilihat langsung secara <em>real-time</em> dari aplikasi Shopee Anda.
          </p>
        </div>
      </div>
    ),
    "cara-pemesanan": (
      <div className="text-left space-y-6">
        <p className="text-gray-700 leading-relaxed">
          BellsGallery menyediakan 3 pilihan cara pemesanan yang fleksibel sesuai kenyamanan berbelanja Anda:
        </p>

        <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-black text-white font-bold text-xs flex items-center justify-center">1</span>
            <h3 className="font-bold text-lg text-black">Pemesanan Langsung via Website (BELLSGALLERY)</h3>
          </div>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 text-sm leading-relaxed">
            <li>Pilih model pakaian yang Anda sukai dari katalog website kami.</li>
            <li>Gunakan fitur <strong>Virtual Fitting Room (Web-AR / Kamera)</strong> untuk mencocokkan tampilan baju ke tubuh Anda secara <em>real-time</em>.</li>
            <li>Pilih ukuran yang sesuai, lalu klik <strong>Tambah ke Keranjang</strong>.</li>
            <li>Isi alamat pengiriman dan selesaikan pembayaran aman via Midtrans (QRIS GoPay/OVO/ShopeePay, Virtual Account Bank).</li>
            <li>Pesanan Anda akan segera diverifikasi dan dikemas rapi oleh tim kami.</li>
          </ol>
        </div>

        <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">2</span>
            <h3 className="font-bold text-lg text-black">Pemesanan Cepat via WhatsApp Admin</h3>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            Jika Anda ingin bertanya seputar ketersediaan ukuran atau meminta foto detail fisik baju sebelum membeli, silakan hubungi Customer Service WhatsApp kami. Tim kami akan membantu proses pemesanan secara personal.
          </p>
        </div>

        <div className="border border-[#ee4d2d]/30 rounded-xl p-6 bg-[#ee4d2d]/5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#ee4d2d] text-white font-bold text-xs flex items-center justify-center">3</span>
            <h3 className="font-bold text-lg text-[#ee4d2d]">Pemesanan via Official Store Shopee (Lebih Aman &amp; Banyak Promo)</h3>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            Bagi pembeli dari luar kota yang menginginkan promo <strong>Gratis Ongkir Ekstra</strong>, voucher diskon marketplace, serta jaminan proteksi <strong>Shopee Garansi Bebas Pengembalian</strong>, Anda dapat berbelanja melalui Toko Resmi Shopee BellsGallery *(Toko sedang dalam tahap persiapan dan segera aktif)*.
          </p>
        </div>
      </div>
    ),
    "kebijakan-pengembalian": (
      <div className="text-left space-y-6">
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-lg">
          <h3 className="font-bold text-amber-900 mb-1">Pemberitahuan Karakteristik Produk</h3>
          <p className="text-amber-800 text-sm leading-relaxed">
            Mengingat produk kami adalah pakaian <em>original</em> sisa pabrik dengan kondisi yang telah diinformasikan secara transparan (kelayakan 98% seperti baru dengan potensi <em>minor defect</em> wajar), maka seluruh <strong>pembelian langsung di website pada dasarnya bersifat final</strong>.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-3">Syarat &amp; Ketentuan Retur / Penukaran (1x24 Jam)</h3>
          <p className="text-gray-700 mb-3 leading-relaxed">
            Pengajuan retur atau komplain hanya dapat kami layani dalam waktu <strong>maksimal 1x24 jam sejak paket dinyatakan tiba oleh kurir</strong>, dengan syarat wajib melampirkan <strong>Video Unboxing utuh tanpa jeda / potongan (no cut/no edit)</strong> sejak paket masih bersegel rapi, HANYA JIKA:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-gray-700 text-sm leading-relaxed">
            <li>Tim BellsGallery salah mengirimkan barang (beda artikel, warna, atau ukuran dari pesanan Anda).</li>
            <li>Ditemukan cacat mayor (seperti kain robek besar atau kerusakan parah) yang terlewatkan dari proses kurasi mandiri kami.</li>
          </ol>
        </div>

        <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-lg">
          <h4 className="font-bold text-neutral-900 mb-2">💡 Tips Belanja Lebih Aman &amp; Terjamin via Shopee</h4>
          <p className="text-gray-700 text-sm leading-relaxed">
            Jika Anda membutuhkan fleksibilitas pengembalian barang yang lebih longgar serta sistem penyelesaian sengketa otomatis dari pihak ketiga, kami sangat menyarankan Anda melakukan pemesanan melalui <strong>Official Store Shopee BellsGallery</strong>. Transaksi di Shopee dilindungi penuh oleh sistem rekening bersama dan fitur Garansi Bebas Pengembalian.
          </p>
        </div>
      </div>
    ),
    "panduan-ukuran": (
      <div className="text-left space-y-6">
        <p className="text-gray-700 leading-relaxed">
          Koleksi pakaian di BellsGallery berasal dari sisa produksi garmen ekspor, sehingga standar potongan ukuran (<em>cutting</em>) dapat berupa standar lokal (Asia Fit) maupun standar internasional (Reguler/Oversized Fit).
        </p>

        <div className="overflow-x-auto border border-neutral-200 rounded-lg shadow-sm">
          <table className="w-full text-left text-sm text-neutral-800">
            <thead className="bg-neutral-100 uppercase text-xs font-bold text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3">Ukuran (Size)</th>
                <th className="px-4 py-3">Lingkar Dada (LD)</th>
                <th className="px-4 py-3">Panjang Baju</th>
                <th className="px-4 py-3">Estimasi Berat Badan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              <tr>
                <td className="px-4 py-3 font-semibold">S</td>
                <td className="px-4 py-3">92 - 96 cm</td>
                <td className="px-4 py-3">68 cm</td>
                <td className="px-4 py-3">45 - 55 kg</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">M</td>
                <td className="px-4 py-3">98 - 102 cm</td>
                <td className="px-4 py-3">70 cm</td>
                <td className="px-4 py-3">56 - 68 kg</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">L</td>
                <td className="px-4 py-3">104 - 108 cm</td>
                <td className="px-4 py-3">72 cm</td>
                <td className="px-4 py-3">69 - 80 kg</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-semibold">XL</td>
                <td className="px-4 py-3">110 - 116 cm</td>
                <td className="px-4 py-3">74 cm</td>
                <td className="px-4 py-3">81 - 95 kg</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-neutral-50 p-5 rounded-lg border border-neutral-200 space-y-2 text-sm text-gray-700">
          <p>
            <strong>Toleransi Ukuran:</strong> Karena pengukuran dilakukan secara manual, toleransi perbedaan ukuran berkisar 1 - 2 cm adalah wajar.
          </p>
          <p>
            <strong>Coba Virtual:</strong> Manfaatkan fitur <strong>Virtual Fitting Room (Web-AR)</strong> pada setiap halaman produk untuk memvisualisasikan bagaimana pakaian tersebut pas dengan tubuh Anda.
          </p>
          <p>
            <strong>Verifikasi Admin:</strong> Sebelum dikirimkan, tim kami selalu siap mengukurkan ulang fisik baju secara langsung jika Anda memintanya melalui kontak WhatsApp kami.
          </p>
        </div>
      </div>
    ),
    "lacak-pesanan": (
      <div className="text-left space-y-6">
        <p className="text-gray-700 leading-relaxed">
          Berikut panduan cara memantau status pesanan dan pengiriman barang di BellsGallery:
        </p>

        <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-4">
          <h3 className="font-bold text-lg text-black flex items-center gap-2">
            <span>📦</span>
            <span>Pesanan yang Dibuat di Website BellsGallery</span>
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Anda dapat langsung memeriksa status transaksi (Pending, Lunas/Paid, Diproses) melalui halaman sistem kami:
          </p>
          <div>
            <Link 
              href="/orders" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-800 transition-colors"
            >
              Buka Halaman Cek Status Pesanan
            </Link>
          </div>
          <div className="text-xs text-neutral-600 bg-neutral-50 p-4 rounded border border-neutral-200 space-y-1.5">
            <p><strong>Informasi Resi Ekspedisi:</strong></p>
            <p>Setelah pesanan selesai dikemas dan diserahkan ke jasa kurir (JNE, J&amp;T, SiCepat), admin BellsGallery akan mengirimkan nomor resi resmi beserta bukti foto paket via WhatsApp atau Email konfirmasi Anda.</p>
          </div>
        </div>

        <div className="border border-[#ee4d2d]/30 rounded-xl p-6 bg-[#ee4d2d]/5 shadow-sm space-y-3">
          <h3 className="font-bold text-lg text-[#ee4d2d] flex items-center gap-2">
            <span>🛍️</span>
            <span>Pesanan yang Dibuat via Shopee</span>
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Jika Anda berbelanja melalui Toko Resmi Shopee BellsGallery, pelacakan kurir terintegrasi otomatis. Anda cukup membuka tab <strong>Pesanan Saya</strong> di aplikasi Shopee untuk memantau titik lokasi kurir secara <em>live real-time</em>.
          </p>
        </div>
      </div>
    ),
    "hubungi-kami": (
      <div className="text-left space-y-6">
        <div className="bg-neutral-50 border border-neutral-200 p-6 rounded-lg space-y-4">
          <h3 className="font-bold text-lg text-black">Customer Service BellsGallery</h3>
          <ul className="space-y-3 text-sm text-gray-700">
            <li><strong>Email:</strong> <a href="mailto:belssgalleryku@gmail.com" className="text-blue-600 hover:underline">belssgalleryku@gmail.com</a></li>
            <li><strong>WhatsApp:</strong> +62 8xx-xxxx-xxxx *(Segera diupdate oleh pemilik toko)*</li>
            <li><strong>Jam Layanan:</strong> Senin - Jumat, 09:00 - 17:00 WIB</li>
            <li><strong>Alamat Galeri Fisik:</strong> Galeri Kyabel, Sugihwaras, Kapas, Bojonegoro, Jawa Timur 62181</li>
          </ul>
        </div>
      </div>
    ),
    "virtual-fitting-room": (
      <div className="text-left space-y-4">
        <p className="text-gray-700 leading-relaxed">
          <strong>Virtual Fitting Room (Web-AR)</strong> adalah inovasi belanja pintar dari BellsGallery yang memungkinkan Anda mencoba pakaian secara virtual langsung melalui kamera <em>smartphone</em> atau laptop tanpa perlu mengunduh aplikasi tambahan apa pun.
        </p>
        <div className="bg-neutral-50 p-5 rounded-lg border border-neutral-200 text-sm text-gray-700 space-y-2">
          <p><strong>Privasi Terjamin:</strong> Seluruh pemrosesan deteksi tubuh (Pose AI) berjalan 100% di browser Anda (On-Device). Kamera Anda tidak pernah direkam atau dikirimkan ke server kami.</p>
          <p><strong>Kemudahan:</strong> Buka halaman detail produk apa pun di katalog kami, lalu klik tombol <strong>&ldquo;Coba Virtual 📸&rdquo;</strong> untuk mulai mencoba.</p>
        </div>
      </div>
    ),
    "bellsgallery-membership": (
      <div className="text-left space-y-4">
        <p className="text-gray-700 leading-relaxed">
          <strong>BELLSGALLERY Membership</strong> adalah program keanggotaan terpadu yang menghubungkan pengalaman belanja fisik di Galeri Kyabel Bojonegoro dengan transaksi online di website maupun platform Shopee kami.
        </p>
        <p className="text-sm text-gray-700">
          Cukup daftarkan nomor WhatsApp Anda saat checkout untuk mulai mengumpulkan poin belanja yang dapat ditukarkan dengan potongan harga eksklusif pada rilisan koleksi sisa pabrik berikutnya.
        </p>
      </div>
    ),
    "phygital-membership": (
      <div className="text-left space-y-4">
        <p className="text-gray-700 leading-relaxed">
          <strong>BELLSGALLERY Membership</strong> adalah program keanggotaan terpadu yang menghubungkan pengalaman belanja fisik di Galeri Kyabel Bojonegoro dengan transaksi online di website maupun platform Shopee kami.
        </p>
        <p className="text-sm text-gray-700">
          Cukup daftarkan nomor WhatsApp Anda saat checkout untuk mulai mengumpulkan poin belanja yang dapat ditukarkan dengan potongan harga eksklusif pada rilisan koleksi sisa pabrik berikutnya.
        </p>
      </div>
    ),
    "kebijakan-privasi": (
      <div className="text-left space-y-6">
        <p className="text-gray-700 leading-relaxed">
          BellsGallery berkomitmen penuh melindungi privasi dan data pribadi setiap pengunjung dan pelanggan sesuai dengan ketentuan <strong>Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong>.
        </p>

        <div>
          <h3 className="font-bold text-lg mb-2">1. Data yang Kami Kumpulkan</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Data pribadi yang kami proses terbatas pada informasi yang Anda berikan secara sukarela untuk keperluan transaksi e-commerce, meliputi: nama lengkap, alamat pengiriman, nomor WhatsApp/telepon, dan alamat email.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">2. Privasi Fitur Kamera &amp; Virtual Try-On (Web-AR)</h3>
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-emerald-900 text-sm leading-relaxed">
            <strong>Keamanan Biometrik &amp; Visual:</strong> Fitur Virtual Fitting Room kami berjalan dengan arsitektur <em>Client-Side Edge AI</em>. Video dari kamera Anda <strong>TIDAK PERNAH DIUNGGAH, DISIMPAN, ATAU DITRANSFER KE SERVER</strong>. Seluruh komputasi visual diproses secara lokal pada browser perangkat Anda dan langsung dibersihkan saat sesi ditutup.
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">3. Penggunaan &amp; Keamanan Data Transaksi</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Data transaksi Anda diproses secara terenkripsi menggunakan gerbang pembayaran resmi berizin Bank Indonesia (Midtrans). BellsGallery tidak menyimpan nomor kartu kredit atau detail perbankan Anda. Data alamat hanya dibagikan kepada mitra ekspedisi resmi (JNE/J&amp;T/SiCepat) untuk pengantaran barang.
          </p>
        </div>
      </div>
    ),
    "syarat-dan-ketentuan": (
      <div className="text-left space-y-6">
        <p className="text-gray-700 leading-relaxed">
          Dengan mengakses dan berbelanja di BellsGallery, Anda menyatakan telah membaca, memahami, dan menyetujui syarat serta ketentuan berikut:
        </p>

        <div>
          <h3 className="font-bold text-lg mb-2">1. Karakteristik &amp; Kondisi Produk</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Semua produk yang dijual adalah pakaian original sisa pabrik terkurasi dengan standar kelayakan pakai 98% layaknya barang baru. Cacat minor yang tidak mengurangi fungsi pakaian (seperti sisa benang, label pabrik yang dipotong) merupakan bagian dari sifat produk sisa produksi dan bukan merupakan cacat mayor.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">2. Transaksi &amp; Pembayaran</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Pesanan dianggap sah setelah pembayaran Anda terverifikasi oleh sistem Midtrans atau bukti transfer telah dikonfirmasi oleh Admin BellsGallery. Pesanan dengan status tertunda (pending) akan dibatalkan otomatis jika batas waktu pembayaran terlewati.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">3. Pengiriman &amp; Risiko Barang</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Pesanan dikirim dari Kabupaten Bojonegoro, Jawa Timur. Keterlambatan atau kendala selama pengiriman yang diakibatkan oleh pihak jasa kurir berada di luar kendali langsung kami, namun admin BellsGallery akan senantiasa proaktif membantu proses investigasi ke pihak ekspedisi.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2">4. Layanan Pengaduan Konsumen</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Apabila terjadi perselisihan atau keluhan transaksi, pelanggan dapat menghubungi CS BellsGallery terlebih dahulu via email <em>belssgalleryku@gmail.com</em>. Pelanggan juga dilindungi oleh hak pengaduan ke Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga (Ditjen PKTN) Kementerian Perdagangan RI.
          </p>
        </div>
      </div>
    )
  };

  const content = contentMap[slug];

  return (
    <div className="container mx-auto px-4 py-20 min-h-[60vh] flex flex-col items-center justify-start text-center">
      <h1 className="text-3xl md:text-5xl font-black mb-10 tracking-tight">{title}</h1>
      
      <div className="text-gray-800 text-lg mb-16 max-w-3xl leading-relaxed">
        {content ? content : (
          <p className="text-gray-600">
            Halaman <strong>{title}</strong> saat ini sedang dalam proses penyusunan konten. Kami berkomitmen untuk segera menghadirkan informasi yang lengkap guna meningkatkan pengalaman berbelanja Anda di ekosistem BELLSGALLERY.
          </p>
        )}
      </div>

      <Link href="/" className="px-8 py-4 bg-black text-white text-sm font-bold tracking-widest uppercase hover:bg-gray-800 transition-colors shadow-lg mt-auto">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
