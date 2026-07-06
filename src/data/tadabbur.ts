// Curated Tadabbur (reflection) entries for the highest-impact Quranic roots.
// Each entry pairs a *semantic field* (the range of meanings the root carries)
// with a short *reflection* — a single contemplation prompt the reader can
// sit with. Content is factual and pedagogical, not exegetical.

export interface TadabburEntry {
  /** Root in Arabic script (the lookup key). */
  root: string;
  /** A common transliteration for readers unfamiliar with the script. */
  translit: string;
  semanticField: { en: string; ms: string };
  reflection: { en: string; ms: string };
}

export const TADABBUR: Record<string, TadabburEntry> = {
  "رحم": {
    root: "رحم",
    translit: "r-ḥ-m",
    semanticField: {
      en: "Womb-like compassion — mercy, tenderness, and the protective intimacy a mother gives her child.",
      ms: "Belas kasihan seperti rahim — rahmat, kelembutan, dan perlindungan seperti seorang ibu kepada anaknya.",
    },
    reflection: {
      en: "Two of God's most-repeated names — Ar-Rahman and Ar-Rahim — share this root. Notice how mercy is the lens through which the Quran asks you to know your Lord.",
      ms: "Dua nama Allah yang paling kerap diulang — Ar-Rahman dan Ar-Rahim — berkongsi akar ini. Perhatikan bagaimana rahmat dijadikan lensa untuk mengenal Tuhanmu.",
    },
  },
  "علم": {
    root: "علم",
    translit: "ʿ-l-m",
    semanticField: {
      en: "To know — but also a sign, a mark, a banner. Knowledge that announces itself.",
      ms: "Mengetahui — tetapi juga tanda, alamat, panji. Ilmu yang mengisytiharkan dirinya.",
    },
    reflection: {
      en: "The first revealed word was «Read», and this root recurs across the Quran. Knowing is treated not as an asset but as an obligation paired with humility.",
      ms: "Wahyu pertama bermula dengan «Bacalah», dan akar ini berulang di seluruh Quran. Ilmu disebut bukan sebagai harta, tetapi tanggungjawab yang berpadu dengan kerendahan hati.",
    },
  },
  "كتب": {
    root: "كتب",
    translit: "k-t-b",
    semanticField: {
      en: "To write — and by extension, to ordain, prescribe, or decree.",
      ms: "Menulis — dan secara lanjut, menetapkan, mewajibkan, atau menentukan.",
    },
    reflection: {
      en: "When fasting is «written upon you» (kutiba ʿalaykum), the verb is the same one used for writing a letter. Consider how divine decrees are framed as carefully inscribed words.",
      ms: "Apabila puasa «diwajibkan ke atas kamu» (kutiba ʿalaykum), kata kerjanya sama dengan menulis surat. Pertimbangkan bagaimana ketentuan Allah dibingkaikan sebagai kata-kata yang ditulis dengan teliti.",
    },
  },
  "ايم": {
    root: "ايم",
    translit: "ʾ-m-n",
    semanticField: {
      en: "To trust, to be secure, to find safety. The same root gives us «believer» and «trustworthy».",
      ms: "Mempercayai, merasa aman, menjumpai keamanan. Akar yang sama melahirkan «orang beriman» dan «yang dipercayai».",
    },
    reflection: {
      en: "Belief in the Quranic sense is not just mental assent — it shares its skeleton with security itself. To trust God is to be at rest.",
      ms: "Iman dalam erti Quran bukan sekadar persetujuan akal — ia berakar pada rasa aman itu sendiri. Mempercayai Allah ialah berasa tenang.",
    },
  },
  "سلم": {
    root: "سلم",
    translit: "s-l-m",
    semanticField: {
      en: "Peace, surrender, wholeness — being intact, undivided, at rest.",
      ms: "Damai, penyerahan, keutuhan — keadaan utuh, tidak berpecah, tenang.",
    },
    reflection: {
      en: "«Islam» and «salaam» share this root. The greeting between believers and the act of submission point to the same idea: peace as the outcome of being whole before God.",
      ms: "«Islam» dan «salaam» berkongsi akar ini. Salam antara orang beriman dan tindakan penyerahan menunjuk ke gagasan yang sama: kedamaian sebagai hasil keutuhan di hadapan Allah.",
    },
  },
  "صبر": {
    root: "صبر",
    translit: "ṣ-b-r",
    semanticField: {
      en: "Patience, perseverance, restraint — the strength to hold steady when conditions push back.",
      ms: "Kesabaran, ketabahan, menahan diri — kekuatan untuk tetap teguh apabila keadaan mendesak.",
    },
    reflection: {
      en: "The Quran pairs sabr with prayer (Q 2:153). Patience here is not passive waiting — it is an active practice trained over a lifetime.",
      ms: "Quran memadankan sabr dengan solat (Q 2:153). Kesabaran di sini bukan menunggu pasif — ia amalan aktif yang dilatih sepanjang hayat.",
    },
  },
  "تقو": {
    root: "تقو",
    translit: "t-q-w",
    semanticField: {
      en: "God-consciousness — literally, to guard oneself, to be wary, to take refuge.",
      ms: "Ketakwaan — secara harfiah, menjaga diri, berwaspada, berlindung.",
    },
    reflection: {
      en: "Taqwa is often translated as «fear of God», but its core meaning is closer to protective awareness — moving through the world like someone holding something precious.",
      ms: "Takwa sering diterjemahkan sebagai «takut kepada Allah», tetapi makna terasnya lebih dekat kepada kesedaran melindungi — bergerak dalam dunia seperti seseorang yang memegang sesuatu yang berharga.",
    },
  },
  "شكر": {
    root: "شكر",
    translit: "sh-k-r",
    semanticField: {
      en: "Gratitude — to acknowledge a favor and respond to it.",
      ms: "Kesyukuran — mengakui sesuatu nikmat dan membalasnya.",
    },
    reflection: {
      en: "The Quran's framing of shukr is relational: thanks is the natural reply to recognition. Notice how the opposite (kufr) shares grammar with denial, not silence.",
      ms: "Dalam Al-Quran, shukr ialah hubungan: kesyukuran ialah balasan semula jadi apabila nikmat diiktiraf. Perhatikan bahawa lawannya (kufr) berkongsi tatabahasa dengan penafian, bukan kesenyapan.",
    },
  },
  "ذكر": {
    root: "ذكر",
    translit: "dh-k-r",
    semanticField: {
      en: "To remember, to mention, to call to mind. Both the act of remembering and the thing remembered.",
      ms: "Mengingat, menyebut, membawa ke ingatan. Tindakan mengingat dan perkara yang diingat sama-sama dirujuk.",
    },
    reflection: {
      en: "The Quran calls itself a dhikr — a reminder. Reading it is, by its own description, an act of remembering something the soul already knew.",
      ms: "Quran menggelar dirinya zikir — peringatan. Membacanya, mengikut huraian sendiri, ialah perbuatan mengingat sesuatu yang sebenarnya sudah dikenali oleh jiwa.",
    },
  },
  "هدي": {
    root: "هدي",
    translit: "h-d-y",
    semanticField: {
      en: "Guidance — the same root yields «gift». To be guided is to be given a way.",
      ms: "Petunjuk — akar yang sama melahirkan «hadiah». Untuk dipimpin ialah untuk diberi jalan.",
    },
    reflection: {
      en: "When you ask «guide us on the straight path» in Al-Fatihah, you use a verb whose noun form is also «gift». Guidance, in Quranic vocabulary, is something received, not engineered.",
      ms: "Apabila kamu memohon «pimpinlah kami ke jalan yang lurus» dalam Al-Fatihah, kamu menggunakan kata kerja yang bentuk nominalnya juga bererti «hadiah». Petunjuk, dalam perbendaharaan kata Quran, adalah sesuatu yang diterima, bukan direka.",
    },
  },
  "نور": {
    root: "نور",
    translit: "n-w-r",
    semanticField: {
      en: "Light — illumination that reveals, not heat that consumes.",
      ms: "Cahaya — sinaran yang menyingkap, bukan api yang membakar.",
    },
    reflection: {
      en: "The famous Light Verse (Q 24:35) describes God as «light upon light». Notice the word chosen is nūr (revealing light), not nār (fire). Knowledge of the Real is illumination, not destruction.",
      ms: "Ayat Cahaya yang masyhur (Q 24:35) menerangkan Allah sebagai «cahaya di atas cahaya». Perhatikan kata yang dipilih ialah nūr (cahaya yang menyingkap), bukan nār (api). Mengenal Yang Maha Benar ialah penyinaran, bukan pemusnahan.",
    },
  },
  "خلق": {
    root: "خلق",
    translit: "kh-l-q",
    semanticField: {
      en: "To create — and, from the same root, «character» (khuluq). The shape something is given.",
      ms: "Mencipta — dan, dari akar yang sama, «akhlak» (khuluq). Bentuk yang diberi kepada sesuatu.",
    },
    reflection: {
      en: "The Prophet ﷺ was described as having a magnificent khuluq. The same word that names God's act of creating names also the shape of a person's character. Both are sculpted.",
      ms: "Nabi ﷺ disebut memiliki khuluq yang agung. Kata yang menamakan ciptaan Allah juga menamakan bentuk peribadi seseorang. Kedua-duanya dibentuk dengan ukiran.",
    },
  },
  "ربب": {
    root: "ربب",
    translit: "r-b-b",
    semanticField: {
      en: "Lord, master, sustainer — but the verbal sense is to nurture, to raise, to bring up.",
      ms: "Tuhan, tuan, pemelihara — tetapi makna kata kerjanya ialah memelihara, mengasuh, membesarkan.",
    },
    reflection: {
      en: "When the Quran calls God Rabb, it draws on the verb a parent uses for raising a child. Lordship in Quranic Arabic is a relationship of upbringing, not domination.",
      ms: "Apabila Quran menggelar Allah sebagai Rabb, ia menggunakan kata kerja yang seorang ibu bapa pakai untuk membesarkan anak. Ketuhanan dalam bahasa Quran ialah hubungan asuhan, bukan kekuasaan.",
    },
  },
  "حمد": {
    root: "حمد",
    translit: "ḥ-m-d",
    semanticField: {
      en: "Praise — distinct from mere thanks. To praise something is to publicly recognize its worth.",
      ms: "Memuji — berbeza dengan sekadar terima kasih. Memuji sesuatu bererti mengiktiraf nilainya secara terbuka.",
    },
    reflection: {
      en: "Al-Fatihah opens with al-ḥamdu li-llāh — «all praise belongs to God». Hamd is more than gratitude; it is an admission that excellence has a source.",
      ms: "Al-Fatihah dibuka dengan al-ḥamdu li-llāh — «segala puji bagi Allah». Hamd lebih daripada kesyukuran; ia pengakuan bahawa kemuliaan ada sumbernya.",
    },
  },
  "دعو": {
    root: "دعو",
    translit: "d-ʿ-w",
    semanticField: {
      en: "To call — to invite, summon, supplicate. The verb behind «duʿāʾ».",
      ms: "Memanggil — menjemput, menyeru, berdoa. Kata kerja di sebalik «duʿāʾ».",
    },
    reflection: {
      en: "Duʿaʾ literally means «calling». When you pray, you are using the same verb a person uses to call across a room. The Quran insists God's listening is that close.",
      ms: "Duʿaʾ secara harfiah bermaksud «menyeru». Apabila kamu berdoa, kamu memakai kata kerja yang sama seperti seseorang memanggil seberang bilik. Quran menegaskan pendengaran Allah sedekat itu.",
    },
  },
  "سمع": {
    root: "سمع",
    translit: "s-m-ʿ",
    semanticField: {
      en: "To hear — but also to respond, to obey. Hearing that registers.",
      ms: "Mendengar — tetapi juga menyahut, mematuhi. Pendengaran yang berkesan.",
    },
    reflection: {
      en: "When the Quran condemns those who «have ears but do not hear», the verb implies attentive reception, not just sound waves. Hearing, in Quranic logic, is the first step of response.",
      ms: "Apabila Quran mencela mereka yang «memiliki telinga tetapi tidak mendengar», kata kerjanya mengisyaratkan penerimaan dengan perhatian, bukan sekadar bunyi. Mendengar, dalam logik Quran, ialah langkah pertama untuk menyahut.",
    },
  },
  "بصر": {
    root: "بصر",
    translit: "b-ṣ-r",
    semanticField: {
      en: "Sight — both physical seeing and insight, perception with understanding.",
      ms: "Penglihatan — penglihatan fizikal dan juga mata hati, persepsi yang memahami.",
    },
    reflection: {
      en: "The Quran pairs hearing and seeing as the two channels of receiving truth. Both share a quality: registering is only the start; perceiving is the substance.",
      ms: "Quran memadankan pendengaran dan penglihatan sebagai dua saluran menerima kebenaran. Kedua-duanya berkongsi satu sifat: menyedari hanyalah permulaan; memahami ialah intinya.",
    },
  },
  "وحي": {
    root: "وحي",
    translit: "w-ḥ-y",
    semanticField: {
      en: "Inspired communication — a quick, private message. Used for prophetic revelation, for instinct in bees, for the inner suggestion God places in mothers.",
      ms: "Wahyu yang diilhamkan — mesej yang cepat dan peribadi. Digunakan untuk wahyu kenabian, naluri lebah, dan bisikan dalam dada seorang ibu.",
    },
    reflection: {
      en: "The same root the Quran uses for revelation also describes the bee's instinct (Q 16:68). Wahy crosses the gap between Knower and known — a continuous mode by which God speaks into creation.",
      ms: "Akar yang sama yang Quran gunakan untuk wahyu juga menggambarkan naluri lebah (Q 16:68). Wahy menyeberangi jurang antara Yang Mengetahui dan yang diketahui — suatu cara berterusan Allah menyampaikan pesan kepada ciptaan.",
    },
  },
  "رزق": {
    root: "رزق",
    translit: "r-z-q",
    semanticField: {
      en: "Provision — sustenance allotted by God, ranging from food to knowledge to children.",
      ms: "Rezeki — bekalan yang diperuntukkan Allah, dari makanan, ilmu, hinggalah anak-anak.",
    },
    reflection: {
      en: "Rizq in the Quran is portioned, not earned. God is named Ar-Razzāq — the One who continuously apportions — to displace the anxiety that survival depends on you alone.",
      ms: "Rezeki dalam Quran ditakdirkan, bukan diperoleh sendiri. Allah dinamai Ar-Razzāq — Yang berterusan membahagi — untuk menghapuskan kebimbangan bahawa kehidupan bergantung kepada usahamu sendiri sahaja.",
    },
  },
  "صلو": {
    root: "صلو",
    translit: "ṣ-l-w",
    semanticField: {
      en: "Connection — the verb behind ritual prayer (ṣalāh) and divine blessing (ṣalawāt).",
      ms: "Hubungan — kata kerja di sebalik solat dan selawat.",
    },
    reflection: {
      en: "When you pray ṣalāh and when God «sends salawāt upon» the Prophet, the verb is the same. The shared word hints at prayer's function: a maintained connection rather than a single event.",
      ms: "Apabila kamu melakukan solat dan apabila Allah «berselawat» ke atas Nabi, kata kerjanya sama. Persamaan ini menunjukkan fungsi solat: hubungan yang dijaga, bukan sekadar peristiwa tunggal.",
    },
  },
  "زكو": {
    root: "زكو",
    translit: "z-k-w",
    semanticField: {
      en: "To purify and to grow — the two meanings inhabit the same word. The obligatory charity (zakāh) carries both senses.",
      ms: "Menyucikan dan menumbuhkan — kedua-dua makna berkongsi kata yang sama. Zakat membawa kedua-dua erti.",
    },
    reflection: {
      en: "Zakāh is paid out of one's wealth, but the root insists the same act both cleanses and increases. Letting go and growing are the same motion in Quranic vocabulary.",
      ms: "Zakat dikeluarkan dari hartamu, tetapi akar kata menegaskan tindakan yang sama menyucikan sekaligus menambah. Melepaskan dan bertumbuh adalah gerakan yang sama dalam perbendaharaan Quran.",
    },
  },
  "جهد": {
    root: "جهد",
    translit: "j-h-d",
    semanticField: {
      en: "Effort, exertion, struggle — pushing against resistance. The root behind jihād and ijtihād (legal reasoning).",
      ms: "Usaha, perjuangan — menentang halangan. Akar di sebalik jihad dan ijtihad.",
    },
    reflection: {
      en: "Jihad's primary Quranic sense is effort, not warfare. The same root names the scholar's ijtihād — wrestling with a hard text. Both are struggles to reach what is true.",
      ms: "Erti utama jihad dalam Quran ialah usaha, bukan peperangan. Akar yang sama menamakan ijtihad seorang ulama — bergelut dengan teks yang sukar. Kedua-duanya perjuangan untuk mencapai kebenaran.",
    },
  },
  "قدر": {
    root: "قدر",
    translit: "q-d-r",
    semanticField: {
      en: "Measure, power, decree — and «laylat al-qadr», the Night of Decree.",
      ms: "Ukuran, kuasa, ketentuan — dan «laylat al-qadr», Malam Kemuliaan.",
    },
    reflection: {
      en: "Qadr captures both ability and apportionment. To say God «has qadr» over all things is to say nothing falls outside the measure He has set — and that measure includes mercy.",
      ms: "Qadr merangkumi kebolehan dan pembahagian. Mengatakan Allah memiliki qadr atas segala sesuatu bermaksud tiada yang terlepas dari ukuran yang ditetapkan-Nya — dan ukuran itu termasuk rahmat.",
    },
  },
  "حقق": {
    root: "حقق",
    translit: "ḥ-q-q",
    semanticField: {
      en: "Truth, reality, right — that which is real and that which is owed.",
      ms: "Kebenaran, realiti, hak — apa yang benar dan apa yang dituntut.",
    },
    reflection: {
      en: "Al-Ḥaqq — «The Real» — is one of God's names. The same word names a moral right. In Quranic logic, what is true and what is just are not separable.",
      ms: "Al-Ḥaqq — «Yang Maha Benar» — adalah salah satu nama Allah. Perkataan yang sama menamakan hak moral. Dalam logik Quran, yang benar dan yang adil tidak boleh dipisahkan.",
    },
  },
  "عبد": {
    root: "عبد",
    translit: "ʿ-b-d",
    semanticField: {
      en: "To serve, to worship — the same root yields «ʿabd» (servant). Servanthood as relationship, not mere duty.",
      ms: "Beribadah, mengabdi — akar yang sama melahirkan «ʿabd» (hamba). Penghambaan sebagai hubungan, bukan sekadar tugas.",
    },
    reflection: {
      en: "Worship (ʿibādah) in the Quran is wide — it includes prayer, but also speaking the truth, treating parents well, restraining anger. Every honest act done for God is on this root.",
      ms: "Ibadah dalam Quran luas pengertiannya — termasuk solat, tetapi juga bercakap benar, berlaku baik kepada ibu bapa, menahan kemarahan. Setiap perbuatan jujur kerana Allah berakar di sini.",
    },
  },
  "اله": {
    root: "اله",
    translit: "ʾ-l-h",
    semanticField: {
      en: "Deity — the worshipped one. The root behind «Allāh» (the Deity) and «ilāh» (a deity).",
      ms: "Tuhan — yang disembah. Akar di sebalik «Allāh» (Tuhan) dan «ilāh» (sebarang tuhan).",
    },
    reflection: {
      en: "«Allāh» is «al-ilāh» — «the Deity», with the definite article. The name itself is a claim: not a deity among many, but the One worth that name.",
      ms: "«Allāh» ialah «al-ilāh» — «Tuhan» dengan kata ganti pasti. Nama itu sendiri ialah satu tuntutan: bukan tuhan antara banyak, tetapi Yang layak memikul nama itu.",
    },
  },
  "كفر": {
    root: "كفر",
    translit: "k-f-r",
    semanticField: {
      en: "To cover, to conceal — and so to deny. The unbeliever is one who covers up what is recognized.",
      ms: "Menutup, menyembunyikan — dan dari situ, menafikan. Orang kafir ialah yang menyembunyikan apa yang sudah dikenali.",
    },
    reflection: {
      en: "Disbelief in the Quran is rarely framed as ignorance. The verb implies a deliberate covering — a refusal to acknowledge what one has already seen.",
      ms: "Kekufuran dalam Quran jarang dibingkaikan sebagai kejahilan. Kata kerjanya mengisyaratkan penutupan yang sengaja — keengganan untuk mengakui apa yang sebenarnya sudah dilihat.",
    },
  },
  "ظلم": {
    root: "ظلم",
    translit: "ẓ-l-m",
    semanticField: {
      en: "To wrong, to oppress — but the root literally evokes putting something in the wrong place.",
      ms: "Menzalimi, menindas — tetapi secara harfiah membawa erti meletakkan sesuatu di tempat yang salah.",
    },
    reflection: {
      en: "Ẓulm in the Quran is not just cruelty — it is misplacement. Worship aimed at the wrong object is ẓulm. Justice begins with putting things where they belong.",
      ms: "Zalim dalam Quran bukan sekadar kekejaman — ia salah penempatan. Ibadah yang ditujukan kepada selain Allah juga zalim. Keadilan bermula dengan meletakkan sesuatu pada tempatnya.",
    },
  },
  "جنن": {
    root: "جنن",
    translit: "j-n-n",
    semanticField: {
      en: "To cover, to hide — and from there, the garden («jannah»), the unseen («jinn»), and the heart («janān»).",
      ms: "Menutup, menyembunyikan — dan dari situ, syurga («jannah»), makhluk ghaib («jinn»), dan kalbu («janān»).",
    },
    reflection: {
      en: "Paradise (jannah) and the unseen (jinn) share a root meaning «hidden by foliage». What is concealed is not necessarily absent — it may be the more substantial reality.",
      ms: "Syurga (jannah) dan jin berkongsi akar yang bermaksud «tersembunyi oleh dedaunan». Apa yang tersembunyi tidak semestinya tiada — ia mungkin realiti yang lebih utama.",
    },
  },
  "ايى": {
    root: "ايى",
    translit: "ʾ-y-y",
    semanticField: {
      en: "A sign — and so, a Quranic verse. Each ayah is, by name, a sign pointing beyond itself.",
      ms: "Tanda — dan dari situ, ayat Quran. Setiap ayah, dengan namanya sendiri, ialah tanda yang menunjuk ke luar dirinya.",
    },
    reflection: {
      en: "When the Quran calls its verses ayāt — signs — it names them by their function. They are not decorative; they point. The reader's task is to follow where they point.",
      ms: "Apabila Quran menggelar ayatnya «ayāt» — tanda — ia menamakannya menurut fungsi. Ia bukan hiasan; ia menunjuk. Tugas pembaca ialah mengikut ke mana ia menunjuk.",
    },
  },
};

export function getTadabbur(root: string | null | undefined): TadabburEntry | null {
  if (!root) return null;
  return TADABBUR[root] ?? null;
}
