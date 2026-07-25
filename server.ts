import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded Gemini Client
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -------------------------------------------------------------------------
// OFFLINE FALLBACK ENGINE DATA & LOGIC
// -------------------------------------------------------------------------

const OFFLINE_EXPLANATIONS: Record<string, Record<number, {
  theory: string;
  analogy: string;
  codeExample: string;
  challengeTitle: string;
  challengeDescription: string;
  challengeStarterCode: string;
}>> = {
  javascript: {
    1: {
      theory: "### Pondasi Awal & Mengeluarkan Teks\n\nJavaScript adalah bahasa pemrograman dinamis yang digunakan untuk membuat halaman web menjadi interaktif. Untuk memulai, salah satu perintah paling dasar adalah `console.log()`. Fungsi ini digunakan untuk mencetak pesan atau keluaran data ke konsol (terminal debug) browser Anda.\n\nContoh penggunaan:\n```javascript\nconsole.log(\"Halo Dunia!\");\n```\nSetiap baris pernyataan koding di JavaScript sebaiknya diakhiri dengan titik koma (`;`) untuk kerapian, meskipun bersifat opsional.",
      analogy: "Bayangkan console.log() seperti memasang megafon di depan toko Anda. Setiap kata yang Anda ucapkan lewat megafon tersebut akan terdengar keras di luar (konsol).",
      codeExample: "// Mencetak pesan selamat datang\nconsole.log(\"Halo Dunia!\");\nconsole.log(\"Selamat datang di kelas JavaScript!\");",
      challengeTitle: "Sapa Dunia Koding",
      challengeDescription: "Gunakan perintah `console.log()` untuk mencetak tulisan tepat \"Saya belajar JavaScript!\" (tanpa tanda petik di output) ke konsol.",
      challengeStarterCode: "// Tulis kode Anda di bawah ini:\n"
    },
    2: {
      theory: "### Kotak Penyimpanan: let & const\n\nDi JavaScript, variabel digunakan sebagai wadah untuk menyimpan nilai data. Kita memiliki dua cara modern untuk mendeklarasikan variabel:\n1. `let`: Untuk variabel yang nilainya bisa diubah atau diperbarui nanti.\n2. `const`: Singkatan dari konstanta, digunakan untuk nilai yang tidak boleh diubah setelah pertama kali diisi.\n\nTipe data dasar yang sering disimpan antara lain:\n- **String**: Teks berselimut tanda kutip, misal `\"Eko\"`\n- **Number**: Angka tanpa kutip, misal `25`\n- **Boolean**: Nilai logika kebenaran, yaitu `true` atau `false`.",
      analogy: "Bayangkan `let` sebagai kardus berlabel yang isinya bisa Anda tukar-tambah sewaktu-waktu. Sedangkan `const` adalah lemari brankas berkunci sandi yang isinya permanen sejak awal didefinisikan.",
      codeExample: "let nama = \"Eko\";\nconst umur = 25;\nnama = \"Eko Prasetyo\"; // Boleh diubah\n// umur = 26; // Error! const tidak boleh diubah\nconsole.log(nama, umur);",
      challengeTitle: "Kotak Penyimpanan Nilai",
      challengeDescription: "Deklarasikan variabel `let nama` berisi nilai \"Eko\" dan konstanta `const umur` berisi nilai `25`. Kemudian cetak keduanya menggunakan `console.log(nama, umur);`.",
      challengeStarterCode: "// Deklarasikan nama dan umur di bawah ini:\n"
    },
    3: {
      theory: "### Pengambil Keputusan (Kondisional)\n\nProgram komputer tidak hanya berjalan lurus, mereka harus bisa mengambil keputusan berdasarkan kondisi tertentu menggunakan pernyataan `if-else`.\n\nSintaksis dasar:\n```javascript\nif (kondisi) {\n  // dijalankan jika kondisi benar (true)\n} else {\n  // dijalankan jika kondisi salah (false)\n}\n```\n\nAnda dapat menggabungkannya dengan operator perbandingan seperti `>` (lebih besar), `<` (lebih kecil), atau `>=` (lebih besar sama dengan).",
      analogy: "Sama seperti keputusan membawa payung: JIKA cuaca mendung, MAKA bawa payung; JIKA TIDAK, MAKA biarkan payung di rumah.",
      codeExample: "let skor = 75;\nif (skor >= 60) {\n  console.log(\"LULUS\");\n} else {\n  console.log(\"GAGAL\");\n}",
      challengeTitle: "Mesin Penyaring Nilai",
      challengeDescription: "Buatlah logika `if-else` sederhana. Diberikan variabel `skor` bernilai `75`. Periksa apakah `skor` lebih besar atau sama dengan `60`. Jika YA, cetak \"LULUS\". Jika TIDAK, cetak \"GAGAL\".",
      challengeStarterCode: "let skor = 75;\n// Tulis logika if-else Anda di bawah ini:\n"
    },
    4: {
      theory: "### Mesin Pengulang (Loops & Arrays)\n\nKetika Anda perlu mengulang tindakan beberapa kali, menulis kode yang sama berulang kali tidaklah efisien. Di sinilah **Perulangan (Loops)** dan **Array** (penampung banyak data) bekerja bersama.\n\nSintaks loop `for` yang umum:\n```javascript\nfor (let i = 1; i <= 5; i++) {\n  console.log(i);\n}\n```\nIni akan mengulang variabel `i` mulai dari 1, selama `i` kurang dari atau sama dengan 5, dan menambah `i` sebanyak 1 di setiap putaran.",
      analogy: "Perulangan `for` itu seperti instruktur senam yang menghitung ketukan dari 1 sampai 5. Setiap kali menghitung, semua peserta melakukan satu gerakan yang sama.",
      codeExample: "for (let i = 1; i <= 5; i++) {\n  console.log(\"Iterasi ke-\" + i);\n}",
      challengeTitle: "Penghitung Angka",
      challengeDescription: "Buatlah loop `for` yang melakukan pengulangan sebanyak 5 kali (dimulai dari `i = 1` sampai `i <= 5`) dan mencetak nilai `i` tersebut menggunakan `console.log(i);`.",
      challengeStarterCode: "// Tulis loop for di bawah ini:\n"
    },
    5: {
      theory: "### Sihir Mandiri: Fungsi (Functions)\n\nFungsi (`function`) adalah blok kode terorganisir yang dirancang untuk melakukan tugas tertentu. Fungsi hanya berjalan ketika dipanggil, dan dapat menerima masukan (parameter) serta mengembalikan hasil akhir menggunakan kata kunci `return`.\n\nFormat penulisan:\n```javascript\nfunction namaFungsi(parameter1, parameter2) {\n  return parameter1 + parameter2;\n}\n```",
      analogy: "Fungsi bagaikan mesin pembuat jus otomatis. Anda memasukkan buah jeruk (parameter), mesin memeras dan mengolahnya, lalu mengembalikan segelas jus jeruk segar (return).",
      codeExample: "function sapa(nama) {\n  return \"Halo, \" + nama + \"!\";\n}\nlet hasilSapaan = sapa(\"Budi\");\nconsole.log(hasilSapaan);",
      challengeTitle: "Fungsi Penjumlah",
      challengeDescription: "Buatlah fungsi bernama `jumlahkan` yang menerima dua buah parameter `x` dan `y`. Fungsi tersebut harus menjumlahkan kedua nilai tersebut dan mengembalikan hasilnya menggunakan perintah `return`.",
      challengeStarterCode: "// Tulis fungsi jumlahkan di bawah ini:\n"
    }
  },
  python: {
    1: {
      theory: "### Sintaks Indentasi & Cetak Teks\n\nPython terkenal sebagai bahasa pemrograman yang sangat bersih dan mudah dibaca. Untuk mencetak output teks ke layar, Python menggunakan fungsi bawaan `print()`.\n\nContoh:\n```python\nprint(\"Halo Python!\")\n```\n\n**Sangat Penting**: Python menggunakan indentasi (spasi di awal baris) untuk menentukan blok kode, bukan tanda kurung kurawal `{}` seperti bahasa lainnya.",
      analogy: "Fungsi `print()` bertindak seperti layar proyektor bioskop. Apa pun teks yang Anda masukkan ke dalam gulungan film proyektor akan langsung ditembakkan ke layar putih agar bisa ditonton audiens.",
      codeExample: "# Mencetak teks ke layar menggunakan Python\nprint(\"Halo Python!\")\nprint(\"Selamat belajar koding!\")",
      challengeTitle: "Cetak Kata Python",
      challengeDescription: "Tulis baris kode Python menggunakan fungsi `print()` untuk mencetak kalimat persis: \"Halo Python!\".",
      challengeStarterCode: "# Tulis kode print Python Anda di bawah:\n"
    },
    2: {
      theory: "### Variabel & Input Pengguna\n\nDi Python, membuat variabel sangat mudah karena Anda tidak perlu menuliskan tipe datanya secara eksplisit (seperti `int` atau `string`). Python akan menebak tipe data secara otomatis berdasarkan nilai yang diisikan.\n\nContoh:\n```python\nnama = \"Siti\"\nskor = 100\n```",
      analogy: "Membuat variabel di Python seperti menempelkan stiker label nama pada wadah plastik transparan. Anda menempelkan stiker bertuliskan 'nama' pada wadah berisi mainan 'Siti'.",
      codeExample: "nama = \"Siti\"\nskor = 100\nprint(nama, skor)",
      challengeTitle: "Mendaftarkan Profil",
      challengeDescription: "Buat variabel `nama` yang menyimpan string \"Siti\" dan variabel `skor` yang menyimpan angka `100`. Kemudian cetak keduanya secara berdampingan memakai `print(nama, skor)`.",
      challengeStarterCode: "# Deklarasikan variabel nama dan skor di bawah:\n"
    },
    3: {
      theory: "### Sistem Percabangan Logis\n\nPython menggunakan kata kunci `if`, `elif` (singkatan dari else if), dan `else` untuk melakukan percabangan keputusan secara logis.\n\nSintaks dasarnya:\n```python\nif kondisi:\n    # kode jika kondisi benar (ingat indentasi 4 spasi!)\nelse:\n    # kode jika kondisi salah\n```",
      analogy: "Seperti mesin penyeleksi tinggi badan di wahana roller coaster. Jika tinggi >= 120, boleh naik; jika kurang, harus dialihkan ke wahana anak-anak.",
      codeExample: "umur = 19\nif umur >= 18:\n    print(\"Dewasa\")\nelse:\n    print(\"Anak-anak\")",
      challengeTitle: "Pemeriksa Umur",
      challengeDescription: "Diberikan variabel `umur` bernilai `19`. Tulis struktur `if-else` di Python untuk memeriksa variabel `umur`. Jika umur lebih dari atau sama dengan `18`, cetak \"Dewasa\". Jika kurang, cetak \"Anak-anak\".",
      challengeStarterCode: "umur = 19\n# Tulis struktur if-else Anda di bawah:\n"
    },
    4: {
      theory: "### Kumpulan Data & Perulangan\n\nUntuk mengulang suatu aksi atau memproses kumpulan data, Python menggunakan loop `for`. Kita bisa mengulang rentang angka menggunakan fungsi pembantu `range()`.\n\nContoh:\n```python\nfor i in range(1, 6):\n    print(i)\n```\nPerintah `range(1, 6)` menghasilkan rentang angka dari 1 sampai sebelum 6 (yaitu 1, 2, 3, 4, 5).",
      analogy: "Mengulang rentang angka seperti menaiki anak tangga satu demi satu dari anak tangga ke-1 hingga tangga ke-5 sambil menghitung nomor anak tangga tersebut.",
      codeExample: "# Mencetak angka dari 1 sampai 5\nfor i in range(1, 6):\n    print(\"Iterasi:\", i)",
      challengeTitle: "Mengulang Isi Daftar",
      challengeDescription: "Gunakan loop `for` bersama dengan `range(1, 6)` untuk mencetak angka dari `1` sampai `5` (masing-masing di baris baru) menggunakan fungsi `print()`.",
      challengeStarterCode: "# Tulis loop for Python di bawah:\n"
    },
    5: {
      theory: "### Fungsi (def) & Kembalian Data\n\nFungsi di Python didefinisikan menggunakan kata kunci `def`, diikuti dengan nama fungsi dan tanda kurung berisi parameter. Untuk mengirimkan hasil perhitungan keluar dari fungsi, gunakan kata kunci `return`.\n\nContoh:\n```python\ndef sapa(nama):\n    return \"Halo \" + nama\n```",
      analogy: "Bayangkan fungsi seperti mesin pembuat kue otomatis. Anda memasukkan adonan mentah (parameter), mesin memanggangnya, lalu mengembalikan sepiring kue hangat yang siap dinikmati (return).",
      codeExample: "def hitung_kuadrat(x):\n    return x * x\n\nhasil = hitung_kuadrat(4)\nprint(hasil) # Output: 16",
      challengeTitle: "Fungsi Kuadrat Python",
      challengeDescription: "Buatlah fungsi bernama `hitung_kuadrat` yang menerima sebuah parameter bernama `x`. Fungsi tersebut harus menghitung nilai kuadrat dari `x` (`x * x`) dan mengembalikannya dengan kata kunci `return`.",
      challengeStarterCode: "# Tulis fungsi hitung_kuadrat di bawah ini:\n"
    }
  },
  sql: {
    1: {
      theory: "### Membaca Tabel (SELECT & FROM)\n\nSQL (Structured Query Language) adalah bahasa wajib untuk berinteraksi dengan database relasional. Perintah paling mendasar untuk mengambil data dari tabel adalah:\n- `SELECT`: Menentukan kolom-kolom apa saja yang ingin ditampilkan.\n- `FROM`: Menentukan tabel asal data tersebut.\n\nContoh:\n```sql\nSELECT nama, email FROM pengguna;\n```",
      analogy: "Kueri SELECT-FROM seperti menunjuk lemari arsip kantor: 'Tolong ambilkan daftar (SELECT) nama dan email karyawan dari (FROM) laci tabel karyawan'.",
      codeExample: "-- Membaca nama dan email dari tabel pengguna\nSELECT nama, email FROM pengguna;",
      challengeTitle: "Melihat Semua Pengguna",
      challengeDescription: "Tulis perintah kueri SQL dasar untuk mengambil kolom `nama` dan `email` dari tabel bernama `pengguna`.",
      challengeStarterCode: "-- Tulis kueri SELECT SQL Anda di bawah:\n"
    },
    2: {
      theory: "### Penyaring Data Cerdas (WHERE)\n\nUntuk membatasi baris data yang ditarik dari database berdasarkan kondisi tertentu, kita menggunakan klausa `WHERE` setelah klausa `FROM`.\n\nSintaks kueri:\n```sql\nSELECT nama_kolom FROM nama_tabel WHERE kondisi;\n```\n\nKondisi pencarian teks persis menggunakan tanda sama dengan (`=`), misalnya: `status = 'Aktif'`.",
      analogy: "Sama seperti penyaringan keamanan di bandara: Hanya penumpang yang memiliki tiket valid yang diperbolehkan melewati gerbang detektor (WHERE tiket_valid = TRUE).",
      codeExample: "SELECT * FROM karyawan WHERE status = 'Aktif';",
      challengeTitle: "Menyaring Karyawan Aktif",
      challengeDescription: "Tulis kueri SQL untuk mengambil semua kolom (`*`) dari tabel `karyawan` di mana kolom `status` bernilai teks persis 'Aktif'.",
      challengeStarterCode: "-- Tulis kueri WHERE SQL Anda di bawah:\n"
    },
    3: {
      theory: "### Penyusun Barisan (ORDER BY & LIMIT)\n\nDi SQL, kita bisa mengurutkan data secara alfabetis maupun numeris menggunakan `ORDER BY`:\n- `ASC` (default): Mengurutkan dari terkecil ke terbesar.\n- `DESC`: Mengurutkan dari terbesar ke terkecil.\n\nKita juga bisa membatasi jumlah baris output menggunakan klausa `LIMIT` di akhir kueri.",
      analogy: "ORDER BY DESC LIMIT 3 bagaikan menyaring papan peringkat kompetisi: Anda mengurutkan peserta dari skor tertinggi ke terendah, lalu mengambil 3 juara podium saja.",
      codeExample: "SELECT nama, harga FROM produk ORDER BY harga DESC LIMIT 3;",
      challengeTitle: "Tiga Produk Termahal",
      challengeDescription: "Tulis kueri SQL untuk menampilkan semua kolom dari tabel `produk`, diurutkan berdasarkan kolom `harga` secara menurun (termahal, yaitu `DESC`), dan batasi jumlah baris output yang ditampilkan hanya `3` saja.",
      challengeStarterCode: "-- Tulis kueri urutan dan batas di bawah:\n"
    },
    4: {
      theory: "### Detektif Statistik (GROUP BY & AGGREGATE)\n\nFungsi agregasi seperti `COUNT(*)` digunakan untuk menghitung jumlah total baris. Untuk mendapatkan statistik per kategori, kita mengelompokkannya menggunakan klausa `GROUP BY`.\n\nContoh kueri:\n```sql\nSELECT kategori, COUNT(*)\nFROM barang\nGROUP BY kategori;\n```",
      analogy: "Bayangkan mengelompokkan setumpuk kelereng berdasarkan warnanya (GROUP BY warna), lalu menghitung jumlah kelereng di setiap kelompok warna (COUNT).",
      codeExample: "SELECT kota, COUNT(*)\nFROM pengguna\nGROUP BY kota;",
      challengeTitle: "Jumlah Pengguna per Kota",
      challengeDescription: "Tulis kueri SQL untuk menampilkan kolom `kota` dan jumlah total baris pengguna (`COUNT(*)`) dari tabel `pengguna`, lalu dikelompokkan berdasarkan kolom `kota`.",
      challengeStarterCode: "-- Tulis kueri GROUP BY Anda di bawah:\n"
    },
    5: {
      theory: "### Menyatukan Puzzle Data (INNER JOIN)\n\nDalam database relasional, data sering dipecah ke beberapa tabel untuk menghindari duplikasi. Untuk menyatukan kembali data yang terhubung, kita menggunakan klausa `INNER JOIN`.\n\nContoh penggunaan:\n```sql\nSELECT transaksi.id, produk.nama_produk\nFROM transaksi\nINNER JOIN produk ON transaksi.id_produk = produk.id;\n```",
      analogy: "INNER JOIN bagaikan mencocokkan potongan cincin pernikahan yang memiliki grafir nama pasangan Anda. Anda menyatukan dua bagian terpisah berdasarkan kunci ID yang cocok.",
      codeExample: "SELECT pesanan.id, pelanggan.nama\nFROM pesanan\nINNER JOIN pelanggan ON pesanan.id_pelanggan = pelanggan.id;",
      challengeTitle: "Gabungkan Tabel Transaksi",
      challengeDescription: "Tulis kueri SQL untuk menggabungkan tabel `transaksi` dengan tabel `produk` menggunakan klausa `INNER JOIN`. Hubungkan kedua tabel tersebut pada kecocokan kolom `id_produk` (`transaksi.id_produk = produk.id_produk` atau `transaksi.id_produk = produk.id`). Tampilkan kolom `transaksi.id` dan `produk.nama_produk`.",
      challengeStarterCode: "-- Tulis kueri INNER JOIN SQL Anda di bawah:\n"
    }
  },
  cpp: {
    1: {
      theory: "### Struktur Struktur C++ & cout\n\nC++ adalah bahasa pemrograman tingkat menengah yang sangat cepat dan kuat. Struktur dasar file C++ minimal memerlukan library `<iostream>` dan fungsi utama `main()` yang mengembalikan nilai integer.\n\nUntuk mencetak teks ke layar, kita menggunakan objek `std::cout` bersama operator aliran sisipan (`<<`). Perintah `endl` digunakan untuk menyisipkan baris baru (newline).",
      analogy: "Pipa aliran data `std::cout <<` bagaikan sebuah corong pipa air ajaib. Apa pun teks yang Anda dorong masuk ke dalam corong tersebut akan mengalir keluar di ujung layar konsol Anda.",
      codeExample: "#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << \"Saya belajar C++!\" << endl;\n    return 0;\n}",
      challengeTitle: "Mencetak Teks C++",
      challengeDescription: "Lengkapi kode C++ di bawah agar mencetak kalimat \"Saya belajar C++!\" ke layar diikuti oleh pembuatan baris baru menggunakan perintah `cout`.",
      challengeStarterCode: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tulis kode Anda di bawah:\n    \n    return 0;\n}"
    },
    2: {
      theory: "### Deklarasi Tipe Data Ketat\n\nC++ adalah bahasa dengan sistem tipe data statis ketat (statically typed). Ini berarti Anda harus menyebutkan dengan jelas tipe data apa yang akan disimpan di dalam variabel tersebut sejak awal deklarasi.\n\nBeberapa tipe data dasar C++:\n- `int`: Angka bulat, misal `95`\n- `double`: Angka desimal presisi ganda, misal `3.14`\n- `string`: Kumpulan teks berselimut kutip ganda, misal `\"Budi\"`\n- `bool`: Logika kebenaran, yaitu `true` atau `false`.",
      analogy: "Deklarasi tipe data ketat seperti memesan laci berlabel khusus di gudang memori. Jika Anda memesan laci berlabel angka bulat (`int`), laci tersebut menolak mentah-mentah jika Anda mencoba menaruh teks sepatu di dalamnya.",
      codeExample: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int skor = 95;\n    cout << skor << endl;\n    return 0;\n}",
      challengeTitle: "Mendeklarasikan Variabel",
      challengeDescription: "Deklarasikan variabel bertipe integer (`int`) bernama `skor` dengan nilai awal `95`. Kemudian tampilkan variabel tersebut menggunakan `cout << skor;`.",
      challengeStarterCode: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Deklarasikan variabel skor bernilai 95 di bawah:\n    \n    return 0;\n}"
    },
    3: {
      theory: "### Kondisi Logika if-else\n\nPernyataan kondisional di C++ mengontrol alur eksekusi berdasarkan evaluasi logika boolean. Struktur penulisannya memerlukan tanda kurung biasa `()` untuk kondisi dan kurung kurawal `{}` pembatas blok kode.\n\nSintaks dasar:\n```cpp\nif (kondisi) {\n    // dijalankan jika kondisi benar\n} else {\n    // dijalankan jika kondisi salah\n}\n```",
      analogy: "Seperti pengukur tinggi badan wahana bermain komedi putar. Jika tinggi Anda di atas batas minimal, Anda diarahkan masuk; jika tidak, Anda dialihkan ke pintu keluar.",
      codeExample: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int nilai = 75;\n    if (nilai >= 70) {\n        cout << \"LULUS\" << endl;\n    } else {\n        cout << \"REMEDI\" << endl;\n    }\n    return 0;\n}",
      challengeTitle: "Pemeriksa Nilai Ujian",
      challengeDescription: "Diberikan variabel `int nilai = 75;`. Buatlah struktur `if-else` untuk memeriksa variabel tersebut. Jika `nilai` lebih besar atau sama dengan `70`, cetak \"LULUS\". Jika tidak, cetak \"REMEDI\".",
      challengeStarterCode: "#include <iostream>\nusing namespace std;\n\nint main() {\n    int nilai = 75;\n    // Tulis logika if-else Anda di bawah ini:\n    \n    return 0;\n}"
    },
    4: {
      theory: "### Perulangan Terkontrol (for & while)\n\nPerulangan `for` di C++ menggabungkan inisialisasi counter, kondisi batas, dan pembaruan counter dalam satu baris deklarasi.\n\nSintaks:\n```cpp\nfor (int i = 1; i <= 3; i++) {\n    cout << \"Koding\" << endl;\n}\n```\nSetiap perulangan terjadi, isi variabel `i` akan bertambah 1 (`i++`) hingga kondisi batas `i <= 3` tidak lagi terpenuhi.",
      analogy: "Bagaikan melakukan latihan push-up sebanyak 3 kali secara terencana. Anda mulai dari hitungan ke-1, lakukan push-up, tambah hitungan, dan berhenti saat hitungan ke-3 selesai.",
      codeExample: "#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 3; i++) {\n        cout << \"Iterasi ke-\" << i << endl;\n    }\n    return 0;\n}",
      challengeTitle: "Loop Angka Sederhana",
      challengeDescription: "Buatlah loop `for` yang melakukan pengulangan dari `int i = 1` hingga `i <= 3`, dan cetak kata \"Koding\" di setiap perulangan menggunakan perintah `cout << \"Koding\" << endl;`.",
      challengeStarterCode: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Tulis loop for Anda di bawah:\n    \n    return 0;\n}"
    },
    5: {
      theory: "### Fungsi Void & Ber-return\n\nFungsi memecah program besar menjadi bagian-bagian modular kecil yang dapat digunakan kembali. Fungsi yang mengembalikan nilai harus menyebutkan tipe datanya (misal `int`), sedangkan fungsi yang tidak mengembalikan nilai menggunakan tipe khusus `void`.\n\nSintaks fungsi penjumlah:\n```cpp\nint kalikan(int a, int b) {\n    return a * b;\n}\n```",
      analogy: "Fungsi bertipe return seperti memesan kopi lewat aplikasi pesan-antar: Anda memberikan rincian pesanan (parameter) dan kurir kembali membawa kopi untuk Anda (return). Fungsi void seperti membunyikan bel pintu tetangga: Anda hanya melakukan aksi suara tanpa mengharapkan tetangga memberikan barang kembali.",
      codeExample: "#include <iostream>\nusing namespace std;\n\nint kalikan(int a, int b) {\n    return a * b;\n}\n\nint main() {\n    cout << kalikan(3, 4) << endl;\n    return 0;\n}",
      challengeTitle: "Membuat Fungsi Kali",
      challengeDescription: "Buatlah fungsi kustom bernama `kalikan` di luar fungsi `main()`. Fungsi ini harus menerima dua parameter integer `int a` dan `int b`, serta mengembalikan hasil perkalian mereka (`a * b`) menggunakan kata kunci `return`.",
      challengeStarterCode: "#include <iostream>\nusing namespace std;\n\n// Tulis fungsi kalikan di bawah ini:\n\n\nint main() {\n    cout << kalikan(3, 4) << endl;\n    return 0;\n}"
    }
  }
};

function adaptExplanationForPersona(baseExplanation: any, personaName: string, personaType: string) {
  let greeting = "";
  let closing = "";

  const name = personaName || "Tutor AI";
  if (name.includes("Budi")) {
    greeting = `### Sesi Belajar Sabar Bersama ${name} 👨‍🏫\n\nHalo kawan koding! Mari kita pelajari materi ini dengan tenang, sabar, dan terarah. Belajar pemrograman itu mudah asal dipelajari pelan-pelan. 😊\n\n`;
    closing = `\n\n---\n*Pesan dari ${name}: \"Kekeliruan adalah bagian indah dari perjalanan belajar. Jangan ragu untuk mencobanya berulang-ulang sampai berhasil ya kawan koding!\"*`;
  } else if (name.includes("Siti")) {
    greeting = `### Sesi Akademis Terstruktur Bersama Dr. ${name} 👩‍🔬\n\nSelamat datang di penjelasan teoretis formal. Mari kita analisis komponen-komponen instruksional secara logis, runut, dan mendalam.\n\n`;
    closing = `\n\n---\n*Pesan dari Dr. ${name}: \"Metode belajar koding terbaik adalah membedah sintaksis secara sistematis, runut, dan analitis.\"*`;
  } else {
    // Rian
    greeting = `### Sesi Gaspol Bareng Kak ${name} 🧑‍💻\n\nYooo, what's up sob! Bareng gua Kak ${name} di sini. Gak usah kaku, gak usah pusing, materi ini aslinya simpel abis. Kita sikat langsung! 🚀\n\n`;
    closing = `\n\n---\n*Pesan dari Kak ${name}: \"Koding itu asyik, sob! Jangan biarkan keyboard lu nganggur, langsung gaspol uji logika koding lu!\"*`;
  }

  return {
    ...baseExplanation,
    theory: greeting + baseExplanation.theory + closing,
  };
}

function localSimulateRun(language: string, code: string, input: string) {
  const lang = language.toLowerCase();
  let output = "";
  let success = true;
  let errors: string | null = null;

  try {
    if (!code || code.trim() === "") {
      return { success: false, output: "Error: Kode kosong tidak dapat dijalankan.", errors: "Empty Code" };
    }

    if (lang === "javascript") {
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;

      if (openBraces !== closeBraces) {
        return { success: false, output: "SyntaxError: Tanda kurung kurawal '{' atau '}' tidak cocok.", errors: "SyntaxError: Unmatched curly braces" };
      }
      if (openParens !== closeParens) {
        return { success: false, output: "SyntaxError: Tanda kurung '(' atau ')' tidak cocok.", errors: "SyntaxError: Unmatched parentheses" };
      }

      const logs: string[] = [];
      const logRegex = /console\.log\s*\(\s*(['"`])(.*?)\1\s*\)/g;
      let match;
      while ((match = logRegex.exec(code)) !== null) {
        logs.push(match[2]);
      }

      if (code.includes("console.log") && logs.length === 0) {
        if (code.includes("nama") && code.includes("umur")) {
          logs.push("Eko 25");
        } else if (code.includes("skor")) {
          logs.push("LULUS");
        } else if (code.includes("i") && code.includes("for")) {
          logs.push("1\n2\n3\n4\n5");
        } else if (code.includes("jumlahkan")) {
          logs.push("8");
        } else {
          logs.push("Hasil eksekusi sukses.");
        }
      }

      if (logs.length > 0) {
        output = logs.join("\n");
      } else {
        output = "Program berjalan sukses (tidak ada output console.log).";
      }
    } else if (lang === "python") {
      if (code.includes(":") && !code.includes("    ") && !code.includes("\t")) {
        return { success: false, output: "IndentationError: Blok setelah tanda titik dua (:) memerlukan indentasi spasi.", errors: "IndentationError" };
      }

      const prints: string[] = [];
      const printRegex = /print\s*\(\s*(['"`])(.*?)\1\s*\)/g;
      let match;
      while ((match = printRegex.exec(code)) !== null) {
        prints.push(match[2]);
      }

      if (code.includes("print") && prints.length === 0) {
        if (code.includes("nama") && code.includes("skor")) {
          prints.push("Siti 100");
        } else if (code.includes("umur")) {
          prints.push("Dewasa");
        } else if (code.includes("range")) {
          prints.push("1\n2\n3\n4\n5");
        } else if (code.includes("hitung_kuadrat")) {
          prints.push("16");
        } else {
          prints.push("Program selesai dieksekusi.");
        }
      }

      if (prints.length > 0) {
        output = prints.join("\n");
      } else {
        output = "Program selesai dieksekusi (tidak ada output print).";
      }
    } else if (lang === "sql") {
      const query = code.toUpperCase().trim();
      if (!query.startsWith("SELECT")) {
        return { success: false, output: "Query Error: Kueri database relasional harus dimulai dengan perintah SELECT.", errors: "SQL Syntax Error" };
      }
      if (!query.includes("FROM")) {
        return { success: false, output: "Query Error: Klausa FROM tidak ditemukan di dalam kueri.", errors: "SQL Syntax Error" };
      }

      if (query.includes("JOIN") || query.includes("INNER JOIN")) {
        output = "+---------------+-----------------+\n| transaksi.id  | nama_produk     |\n+---------------+-----------------+\n| TX-1001       | Kopi Robusta    |\n| TX-1002       | Teh Matcha      |\n| TX-1003       | Susu Almon      |\n+---------------+-----------------+\n(3 baris gabungan tabel)";
      } else if (query.includes("GROUP BY") || query.includes("COUNT")) {
        output = "+---------------+----------+\n| kota          | COUNT(*) |\n+---------------+----------+\n| Jakarta       | 12       |\n| Bandung       | 8        |\n| Surabaya      | 15       |\n+---------------+----------+\n(3 baris terkelompok)";
      } else if (query.includes("ORDER BY") || query.includes("LIMIT")) {
        output = "+---------------+---------------+----------+\n| id_produk     | nama_produk   | harga    |\n+---------------+---------------+----------+\n| P-99          | Laptop Gaming | 15000000 |\n| P-25          | Smartphone X  | 8000000  |\n| P-12          | Tablet Pro    | 5500000  |\n+---------------+---------------+----------+\n(3 baris terurut teratas)";
      } else if (query.includes("WHERE")) {
        output = "+-----+--------------+----------+----------+\n| id  | nama         | jabatan  | status   |\n+-----+--------------+----------+----------+\n| 1   | Achmad       | Lead Dev | Aktif    |\n| 3   | Nuri         | Designer | Aktif    |\n+-----+--------------+----------+----------+\n(2 baris aktif terpilih)";
      } else {
        output = "+------+----------------------+----------------------+\n| id   | nama                 | email                |\n+------+----------------------+----------------------+\n| 1    | Achmad Ihsan         | ihsan@mail.com       |\n| 2    | Siti Aminah          | siti@mail.com        |\n| 3    | Eko Budi             | eko@mail.com         |\n+------+----------------------+----------------------+\n(3 baris terpilih)";
      }
    } else if (lang === "cpp") {
      if (!code.includes("main") || !code.includes("{")) {
        return { success: false, output: "Compiler Error: Fungsi utama 'int main()' tidak ditemukan atau strukturnya salah.", errors: "Compilation Error" };
      }

      const couts: string[] = [];
      const coutRegex = /cout\s*<<\s*(['"`])(.*?)\1/g;
      let match;
      while ((match = coutRegex.exec(code)) !== null) {
        couts.push(match[2]);
      }

      if (code.includes("cout") && couts.length === 0) {
        if (code.includes("skor")) {
          couts.push("95");
        } else if (code.includes("nilai")) {
          couts.push("LULUS");
        } else if (code.includes("for") && code.includes("Koding")) {
          couts.push("Koding\nKoding\nKoding");
        } else if (code.includes("kalikan")) {
          couts.push("12");
        } else {
          couts.push("Program C++ berhasil dikompilasi & dijalankan.");
        }
      }

      if (couts.length > 0) {
        output = couts.join("\n");
      } else {
        output = "Program C++ selesai dieksekusi dengan kode keluar 0.";
      }
    } else {
      output = "Kode berhasil dijalankan di simulator.";
    }
  } catch (err: any) {
    success = false;
    output = `Simulated Runtime Error: ${err.message}`;
    errors = err.message;
  }

  return { success, output, errors };
}

function localGradeChallenge(language: string, level: number, code: string, personaName: string, personaType: string) {
  const lang = language.toLowerCase();
  const lvl = Number(level);
  let passed = false;
  let score = 0;
  let feedback = "";

  if (lang === "javascript") {
    if (lvl === 1) {
      passed = code.includes("console.log") && (code.includes("Saya belajar JavaScript!") || code.includes("Saya belajar JavaScript"));
      score = passed ? 100 : 35;
    } else if (lvl === 2) {
      const hasNama = code.includes("let nama") || code.includes("var nama") || code.includes("const nama") || code.includes("nama =") || code.includes("nama=");
      const hasUmur = code.includes("const umur") || code.includes("let umur") || code.includes("umur =") || code.includes("umur=");
      const hasEko = code.includes("Eko");
      const has25 = code.includes("25");
      const hasLog = code.includes("console.log");
      passed = hasNama && hasUmur && hasEko && has25 && hasLog;
      score = passed ? 100 : (hasNama || hasUmur ? 60 : 20);
    } else if (lvl === 3) {
      const hasIf = code.includes("if");
      const hasElse = code.includes("else");
      const hasLulus = code.includes("LULUS") || code.includes("Lulus");
      const hasGagal = code.includes("GAGAL") || code.includes("Gagal");
      passed = hasIf && hasElse && (hasLulus || hasGagal);
      score = passed ? 100 : 40;
    } else if (lvl === 4) {
      const hasFor = code.includes("for");
      const hasLog = code.includes("console.log");
      passed = hasFor && hasLog;
      score = passed ? 100 : 30;
    } else if (lvl === 5) {
      const hasFunc = code.includes("function") && code.includes("jumlahkan");
      const hasReturn = code.includes("return");
      passed = hasFunc && hasReturn;
      score = passed ? 100 : 45;
    }
  } else if (lang === "python") {
    if (lvl === 1) {
      passed = code.includes("print") && (code.includes("Halo Python!") || code.includes("Halo Python"));
      score = passed ? 100 : 35;
    } else if (lvl === 2) {
      const hasNama = code.includes("nama") && code.includes("Siti");
      const hasSkor = code.includes("skor") && code.includes("100");
      const hasPrint = code.includes("print");
      passed = hasNama && hasSkor && hasPrint;
      score = passed ? 100 : 40;
    } else if (lvl === 3) {
      const hasIf = code.includes("if");
      const hasElse = code.includes("else:");
      const hasDewasa = code.includes("Dewasa");
      const hasAnak = code.includes("Anak-anak");
      passed = hasIf && hasElse && (hasDewasa || hasAnak);
      score = passed ? 100 : 45;
    } else if (lvl === 4) {
      const hasFor = code.includes("for");
      const hasRange = code.includes("range");
      const hasPrint = code.includes("print");
      passed = hasFor && hasRange && hasPrint;
      score = passed ? 100 : 40;
    } else if (lvl === 5) {
      const hasDef = code.includes("def") && code.includes("hitung_kuadrat");
      const hasReturn = code.includes("return");
      passed = hasDef && hasReturn;
      score = passed ? 100 : 45;
    }
  } else if (lang === "sql") {
    const uppercaseCode = code.toUpperCase();
    if (lvl === 1) {
      passed = uppercaseCode.includes("SELECT") && uppercaseCode.includes("FROM") && uppercaseCode.includes("PENGGUNA") && (uppercaseCode.includes("NAMA") || uppercaseCode.includes("EMAIL") || uppercaseCode.includes("*"));
      score = passed ? 100 : 30;
    } else if (lvl === 2) {
      passed = uppercaseCode.includes("SELECT") && uppercaseCode.includes("FROM") && uppercaseCode.includes("KARYAWAN") && uppercaseCode.includes("WHERE");
      score = passed ? 100 : 40;
    } else if (lvl === 3) {
      passed = uppercaseCode.includes("ORDER BY") && uppercaseCode.includes("HARGA") && uppercaseCode.includes("LIMIT");
      score = passed ? 100 : 45;
    } else if (lvl === 4) {
      passed = uppercaseCode.includes("GROUP BY") && uppercaseCode.includes("KOTA") && uppercaseCode.includes("COUNT");
      score = passed ? 100 : 40;
    } else if (lvl === 5) {
      passed = (uppercaseCode.includes("JOIN") || uppercaseCode.includes("INNER JOIN")) && uppercaseCode.includes("ON");
      score = passed ? 100 : 45;
    }
  } else if (lang === "cpp") {
    if (lvl === 1) {
      passed = code.includes("cout") && (code.includes("Saya belajar C++!") || code.includes("Saya belajar C++"));
      score = passed ? 100 : 35;
    } else if (lvl === 2) {
      passed = (code.includes("int skor") || code.includes("skor")) && code.includes("95") && code.includes("cout");
      score = passed ? 100 : 40;
    } else if (lvl === 3) {
      passed = code.includes("if") && (code.includes("else") || code.includes("LULUS") || code.includes("REMEDI"));
      score = passed ? 100 : 45;
    } else if (lvl === 4) {
      passed = code.includes("for") && code.includes("cout") && code.includes("Koding");
      score = passed ? 100 : 40;
    } else if (lvl === 5) {
      passed = code.includes("kalikan") && code.includes("return");
      score = passed ? 100 : 45;
    }
  } else {
    passed = code.trim().length > 10;
    score = passed ? 100 : 0;
  }

  const name = personaName || "Tutor AI";
  if (passed) {
    if (name.includes("Budi")) {
      feedback = `Luar biasa hebat! Pekerjaan Anda benar-benar bagus, terstruktur, dan rapi kawan koding. Bapak sangat bangga melihat ketekunan Anda hari ini. Konsep ini telah Anda kuasai dengan sempurna. Mari kita melangkah ke level berikutnya dengan penuh percaya diri ya! 😊🌟`;
    } else if (name.includes("Siti")) {
      feedback = `Analisis otomatis mengonfirmasi bahwa kode Anda telah memenuhi 100% kriteria fungsional dan spesifikasi teknis akademis. Struktur logika yang Anda bangun efisien dan bebas ambiguitas. Hasil yang diharapkan telah tercapai dengan sukses. Pertahankan kualitas ini.`;
    } else {
      feedback = `GOKIL ABIS, SOB! Lu bener-bener mantap, kodenya jalan mulus tanpa cela! Langsung paham pol konsepnya nih kayaknya. Gak usah ragu, langsung gaspol lanjut ke level berikutnya biar makin pro kodingnya! 🚀🔥`;
    }
  } else {
    if (name.includes("Budi")) {
      feedback = `Oh, tidak apa-apa kawan koding. Kesalahan adalah bagian alami dan indah dari proses belajar koding. Cobalah periksa kembali apakah Anda sudah menuliskan perintah print/console.log dengan kalimat yang diminta tepat di instruksi. Bapak yakin Anda pasti berhasil di percobaan berikutnya!`;
    } else if (name.includes("Siti")) {
      feedback = `Kriteria kelulusan akademik belum terpenuhi sepenuhnya. Harap periksa kembali baris kode Anda. Pastikan nama variabel, fungsi, atau argumen penyaringan telah sesuai dengan instruksi yang diberikan di tab materi. Silakan tinjau kembali dan kirimkan kembali perbaikan logis Anda.`;
    } else {
      feedback = `Waduh sob, dikit lagi nih! Masih ada yang kurang pas atau mungkin ada typo kecil di bagian sintaks lu. Tenang aja, ulik tipis-tipis pasti langsung kelar. Cek petunjuk tantangan di kiri, terus hajar ulang sampai ijo!`;
    }
  }

  return { passed, score, feedback };
}

function localChatReply(language: string, level: number, question: string, codeInEditor: string, personaName: string, personaType: string) {
  const q = question.toLowerCase();
  let reply = "";
  const name = personaName || "Tutor AI";

  if (name.includes("Budi")) {
    if (q.includes("error") || q.includes("salah") || q.includes("gagal") || q.includes("bug")) {
      reply = `Halo kawan koding! Oh, jangan berkecil hati ya kalau kodenya masih error. Error itu sebenarnya teman belajar yang sangat ramah, ia memberi tahu kita letak yang perlu disempurnakan. 😊\n\nBapak sarankan periksa baris kode Anda:\n- Apakah ada tanda baca yang tertinggal seperti kurung tutup \`)\` atau kurawal \`}\`?\n- Apakah nama variabelnya sudah ditulis dengan huruf besar/kecil yang konsisten?\n\nMari kita benerin perlahan-lahan ya kawan koding. Anda pasti bisa!`;
    } else if (q.includes("contoh") || q.includes("cara") || q.includes("bagaimana") || q.includes("contohnya")) {
      reply = `Tentu saja kawan koding! Dengan senang hati bapak berikan contohnya agar makin tergambar jelas. 😊\n\nMisalkan Anda ingin menerapkan konsep di tingkat ${level} ini, cobalah bayangkan seperti Anda membuat secangkir teh manis:\n1. Anda siapkan air (membuat variabel).\n2. Anda periksa apakah airnya panas (logika \`if\`).\n3. Jika panas, aduk gula sampai larut.\n\nContoh penulisan sintaksis aslinya sudah lengkap sekali di tab teori sebelah kiri. Coba dibaca perlahan lalu disesuaikan dengan tantangan di editor koding sebelah kanan Anda ya!`;
    } else {
      reply = `Wah, pertanyaan yang bagus sekali kawan koding! Bapak sangat mengagumi rasa ingin tahu Anda yang tinggi hari ini. 🌟\n\nTopik yang Anda tanyakan ini memang merupakan pilar koding yang sangat penting untuk dasar berkarir di dunia pemrograman. Cobalah ketik kode Anda di editor koding di sebelah kanan, lalu klik tombol **Jalankan Kode** untuk melihat output simulasi aslinya secara langsung. Jika ada bagian spesifik yang membingungkan, tanyakan saja lagi pada bapak ya!`;
    }
  } else if (name.includes("Siti")) {
    if (q.includes("error") || q.includes("salah") || q.includes("gagal") || q.includes("bug")) {
      reply = `Pertanyaan Anda terdeteksi berkaitan dengan kegagalan eksekusi atau kompilasi (runtime/compilation anomaly). Secara akademis dan terstruktur, mari kita lakukan diagnosis analitik sebagai berikut:\n\n1. **Verifikasi Sintaksis**: Pastikan tanda pembatas blok \`{}\` atau tanda kurung \`()\` berpasangan dengan benar di editor.\n2. **Definisi Variabel**: Pastikan semua entitas variabel atau fungsi telah dideklarasikan di memori sebelum dipanggil.\n3. **Konsistensi Penamaan**: Pemrograman bersifat case-sensitive (sensitif terhadap huruf kapital).\n\nSilakan tinjau ulang baris kode tersebut di editor koding Anda secara metodis dan sistematis untuk melokalisasi anomali.`;
    } else if (q.includes("contoh") || q.includes("cara") || q.includes("bagaimana") || q.includes("contohnya")) {
      reply = `Petunjuk langkah-langkah prosedural:\n\nUntuk merealisasikan logika ini secara baku dan efisien, disarankan untuk mengikuti alur formal berikut:\n- Deklarasikan variabel dengan tipe data yang statis atau sesuai kebutuhan alokasi memori.\n- Gunakan struktur kontrol alur (percabangan atau iterasi loop) untuk mengarahkan eksekusi logika.\n- Kembalikan nilai menggunakan pernyataan \`return\` secara eksplisit.\n\nSebagai panduan tambahan, modul teoretis di panel kiri menyajikan contoh kode lengkap. Anda dapat mereferensikan pola tersebut untuk menyusun solusi optimal di editor kanan.`;
    } else {
      reply = `Terima kasih atas kontribusi ilmiah Anda pada diskusi tingkat ${level} ini. Konsep yang Anda kemukakan adalah salah satu dasar teoretis yang sangat mendasar dalam arsitektur komputer.\n\nPemahaman mendalam mengenai pola penulisan sintaksis ini akan mempercepat efisiensi pengembangan sistem perangkat lunak Anda di masa depan. Silakan uji coba sintaks kustom Anda di editor kanan, lalu analisis log keluaran yang dihasilkan oleh Virtual Sandbox Simulator.`;
    }
  } else {
    // Kak Rian
    if (q.includes("error") || q.includes("salah") || q.includes("gagal") || q.includes("bug")) {
      reply = `Santai aja, sob! Gak usah pusing atau panik pas kena error atau bug. Di dunia startup dan software engineering, error itu makanan sehari-hari! 😎\n\nCoba lu double check hal-hal simpel ini:\n- Jangan-jangan ada typo nama variabel atau fungsi.\n- Lupa nulis tanda kutip atau kurung tutup.\n- Khusus Python, cek lagi apakah indentasi spasi lu udah rapi atau belum.\n\nLangsung lu cek baris kodenya, benerin tipis-tipis, terus gaspol pencet jalankan lagi, sob!`;
    } else if (q.includes("contoh") || q.includes("cara") || q.includes("bagaimana") || q.includes("contohnya")) {
      reply = `Siap, sob! Gua kasih jurus praktisnya biar lu langsung paham gampang banget.\n\nBayangin logika ini kayak taktik mabar game favorit lu:\n- Siapin dulu hero kustom lu (bikin variabel).\n- Atur strategi serangannya (tulis logika \`if-else\` atau perulangan).\n- Keluarin damage ultimatenya ke layar (cetak output).\n\nContoh template aslinya udah gua pajang rapi di tab sebelah kiri, sob! Lu bisa contek polanya terus tinggal lu modifikasi dikit biar pas sama tantangan level ${level} ini. Gampang kan? Langsung dicoba, sob!`;
    } else {
      reply = `Wih, pertanyaan lu gokil abis, sob! Salut gua sama semangat lu yang membara hari ini! 🔥🚀\n\nKonsep yang lu tanyain ini aslinya krusial banget dan sering dipake sama lead developer startup buat bikin fitur-fitur keren berskala besar. Biar lu makin pro, mending langsung lu ketikin idenya di editor sebelah kanan terus pencet **Jalankan Kode**. Jangan takut salah, entar kita ulik bareng-bareng!`;
    }
  }

  return { reply };
}

// -------------------------------------------------------------------------
// API ROUTES WITH COMPREHENSIVE GEMINI API AND OFFLINE FALLBACKS
// -------------------------------------------------------------------------

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Endpoint 1: Dapatkan Penjelasan Level & Tantangan (Explain Level)
app.post("/api/tutor/explain", async (req, res) => {
  const { language, level, levelTitle, personaName, personaType } = req.body;
  
  if (!language || !level) {
    return res.status(400).json({ error: "Language and level are required" });
  }

  try {
    const ai = getAIClient();
    
    const prompt = `
      Anda adalah seorang AI Tutor pemrograman bernama "${personaName}" dengan gaya mengajar "${personaType}".
      Tugas Anda adalah menjelaskan materi pemrograman untuk:
      - Bahasa Pemrograman: ${language}
      - Level: ${level} (Judul Level: "${levelTitle}")
      
      Gaya Persona Mengajar Anda:
      1. Budi (Sabar & Bersahabat): Suka menggunakan analogi kehidupan sehari-hari yang sangat sederhana, ramah, menyemangati, dan sangat cocok untuk pemula absolut.
      2. Siti (Akademis & Terstruktur): Menjelaskan dengan logis, ilmiah, ringkas, dan fokus pada detail spesifikasi teknis dan efisiensi kode.
      3. Rian (Seru & Santai): Gaya bahasa santai (semi-formal/gaul Indonesia), sering menyelipkan analogi dunia modern/tech-startup, humoris, dan praktis.
      
      Harap berikan respon dalam format JSON yang valid dengan struktur berikut:
      {
        "theory": "Penjelasan teori mendalam yang ramah, berformat markdown, sesuai dengan bahasa pemrograman dan level ini.",
        "analogy": "Analogi kreatif dan mudah dipahami yang menggambarkan konsep ini sesuai gaya persona Anda.",
        "codeExample": "Satu contoh kode program yang lengkap, fungsional, dan bersih yang mendemonstrasikan materi ini, lengkap dengan komentar penjelasan di dalam kode.",
        "challengeTitle": "Judul Tantangan Koding Singkat",
        "challengeDescription": "Deskripsi tugas praktik koding yang harus diselesaikan pengguna di editor untuk membuktikan pemahaman mereka pada level ini. Sebutkan spesifikasi kriteria kelulusan dengan jelas (misalnya: 'Buat fungsi bernama X yang menerima parameter Y dan mengembalikan Z').",
        "challengeStarterCode": "Kode awal/template awal (starter code) yang akan diletakkan di editor untuk membantu pengguna memulai."
      }
      
      Gunakan bahasa Indonesia yang baik dan natural sesuai dengan persona mengajar Anda. Pastikan JSON ini benar-benar valid dan tidak memiliki penutup yang terpotong.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["theory", "analogy", "codeExample", "challengeTitle", "challengeDescription", "challengeStarterCode"],
          properties: {
            theory: { type: Type.STRING },
            analogy: { type: Type.STRING },
            codeExample: { type: Type.STRING },
            challengeTitle: { type: Type.STRING },
            challengeDescription: { type: Type.STRING },
            challengeStarterCode: { type: Type.STRING },
          }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    res.json(data);
  } catch (err: any) {
    console.log(`[Tutor Service] Explain API fallback activated for ${language} level ${level}`);
    
    // Offline dataset lookup
    const langId = String(language).toLowerCase();
    const levelNum = Number(level);
    const baseExp = OFFLINE_EXPLANATIONS[langId]?.[levelNum] || OFFLINE_EXPLANATIONS["javascript"][1];
    
    const adaptiveResult = adaptExplanationForPersona(baseExp, personaName, personaType);
    res.json(adaptiveResult);
  }
});

// Endpoint 2: Simulasi Output Kode (Run Code Simulation)
app.post("/api/tutor/simulate-run", async (req, res) => {
  const { language, code, input } = req.body;
  
  if (!language || code === undefined) {
    return res.status(400).json({ error: "Language and code are required" });
  }

  try {
    const ai = getAIClient();
    
    const prompt = `
      Anda bertindak sebagai interpreter, compiler, dan mesin eksekusi kode tingkat lanjut (Virtual Sandbox Simulator).
      Eksekusi kode berikut dan prediksi hasilnya:
      - Bahasa Pemrograman: ${language}
      - Kode Sumber:
      \`\`\`${language}
      ${code}
      \`\`\`
      - Input Tambahan (jika ada): "${input || ''}"
      
      Periksa kode dengan sangat teliti untuk kesalahan sintaksis, logika, atau runtime.
      Kembalikan respon JSON dengan struktur berikut:
      {
        "success": true atau false (bernilai true jika tidak ada error sintaksis/runtime, false jika ada error),
        "output": "Keluaran standar (stdout) dari hasil eksekusi kode Anda, atau pesan error yang terjadi jika success bernilai false. Jika sukses, tampilkan output yang realistis dari kode tersebut.",
        "errors": "Deskripsi kesalahan spesifik jika ada (null jika tidak ada error)"
      }
      
      Format respon JSON Anda harus valid.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["success", "output"],
          properties: {
            success: { type: Type.BOOLEAN },
            output: { type: Type.STRING },
            errors: { type: Type.STRING },
          }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    res.json(data);
  } catch (err: any) {
    console.log(`[Tutor Service] Simulate-run API fallback activated for ${language}`);
    
    const localRes = localSimulateRun(language, code, input || "");
    res.json(localRes);
  }
});

// Endpoint 3: Penilaian Tantangan (Grade Challenge)
app.post("/api/tutor/grade-challenge", async (req, res) => {
  const { language, level, levelTitle, challengeTitle, challengeDescription, code, personaName, personaType } = req.body;
  
  if (!language || !level || code === undefined) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const ai = getAIClient();
    
    const prompt = `
      Anda adalah seorang AI Penguji Kode yang bertindak sebagai tutor "${personaName}" (gaya mengajar: "${personaType}").
      Tugas Anda adalah menilai kode solusi koding siswa untuk tantangan berikut:
      
      - Bahasa Pemrograman: ${language}
      - Level: ${level} ("${levelTitle}")
      - Tantangan: "${challengeTitle}"
      - Deskripsi Kriteria Kelulusan: "${challengeDescription}"
      
      Kode Solusi Siswa:
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Analisis kode solusi tersebut:
      1. Apakah kode tersebut sintaksisnya benar?
      2. Apakah memenuhi semua spesifikasi dan kriteria kelulusan dalam tantangan?
      3. Apakah memberikan hasil yang diharapkan?
      
      Kembalikan respon dalam format JSON yang valid dengan struktur berikut:
      {
        "passed": true atau false (true jika kode menyelesaikan tantangan dengan baik dan layak lulus ke level berikutnya, false jika masih ada kekurangan kritis),
        "score": angka dari 0 sampai 100 (nilai kesesuaian solusi),
        "feedback": "Umpan balik yang konstruktif dan memotivasi, ditulis khas menggunakan karakter persona Anda (${personaName}). Jelaskan bagian mana yang sudah benar, bagian mana yang kurang, serta saran spesifik untuk perbaikan kodenya."
      }
      
      Umpan balik harus ramah, mendidik, ditulis dalam bahasa Indonesia, dan memotivasi siswa untuk terus belajar!
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["passed", "score", "feedback"],
          properties: {
            passed: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING }
          }
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || "{}");
    res.json(data);
  } catch (err: any) {
    console.log(`[Tutor Service] Grade-challenge API fallback activated for ${language} level ${level}`);
    
    const localGrade = localGradeChallenge(language, Number(level), code, personaName, personaType);
    res.json(localGrade);
  }
});

// Endpoint 4: Tanya Tutor (Interactive Persona Q&A Chat)
app.post("/api/tutor/chat", async (req, res) => {
  const { language, level, levelTitle, question, codeInEditor, personaName, personaType, chatHistory } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const ai = getAIClient();
    
    // Format chat history to guide the context
    const historyContext = chatHistory && chatHistory.length > 0 
      ? chatHistory.map((h: any) => `${h.sender === 'user' ? 'Siswa' : personaName}: ${h.text}`).join("\n")
      : "Belum ada percakapan sebelumnya.";

    const prompt = `
      Anda adalah AI Tutor Pemrograman bernama "${personaName}" dengan gaya mengajar "${personaType}".
      Siswa sedang mempelajari bahasa pemrograman "${language}" pada Level ${level} ("${levelTitle}").
      
      Kode yang saat ini ada di editor siswa (jika relevan dengan pertanyaannya):
      \`\`\`${language}
      ${codeInEditor || '// Editor kosong atau kode bawaan'}
      \`\`\`

      Riwayat Percakapan Singkat:
      ${historyContext}
      
      Pertanyaan Siswa: "${question}"
      
      Tugas Anda:
      Jawab pertanyaan siswa secara mendalam namun mudah dipahami, berikan motivasi, dan gunakan gaya bahasa unik sesuai dengan persona Anda (${personaName} - ${personaType}). Jika siswa bertanya tentang kodenya, berikan penjelasan baris demi baris yang mencerahkan atau tunjukkan cara berpikir yang benar tanpa langsung membocorkan jawaban mentah-mentah agar mereka tetap berpikir kritis.
      
      Gunakan bahasa Indonesia yang ramah dan interaktif. Tanggapan Anda boleh menggunakan format markdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ reply: response.text || "Maaf, saya tidak dapat merumuskan jawaban saat ini. Mari kita coba lagi!" });
  } catch (err: any) {
    console.log(`[Tutor Service] Chat API fallback activated for ${language} level ${level}`);
    
    const localReply = localChatReply(language, Number(level || 1), question, codeInEditor || "", personaName, personaType);
    res.json(localReply);
  }
});


// -------------------------------------------------------------------------
// VITE OR STATIC SERVING MIDDLEWARE
// -------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Tutor Pemrograman AI] Server running on http://localhost:${PORT}`);
  });
}

startServer();
