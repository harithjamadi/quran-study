"use client";

import { useEffect, useState } from "react";
import { getAyahWithEditions, searchQuran } from "@/lib/api";
import { loadRootOccurrences } from "@/lib/frequency";
import { effectiveGloss, type LemmaMeta } from "@/lib/learning";
import { ARABIC_EDITION } from "@/lib/editions";
import { UI_STRINGS } from "@/lib/i18n";
import { useLearning } from "@/store/learning";
import { getSurah } from "@/data/surahs";

const COMPREHENSIVE_INSIGHTS: Record<string, { en: string; ms: string }> = {
  "ذا": {
    en: "Zalika (ذلك) and Za (ذا) are distinct terms. Zalika is an Arabic demonstrative pronoun (Isim Isyarah) meaning 'that,' used specifically for masculine, singular, and distant nouns. In Swahili, Zalika is also a name meaning 'well-born.' Za in Swahili typically denotes possession ('of').",
    ms: "Zalika (ذلك) dan Za (ذا) adalah istilah yang berbeza. Zalika ialah kata ganti nama tunjuk Arab (Isim Isyarah) yang bermaksud 'itu', digunakan khusus untuk kata nama muzakkar (lelaki), tunggal, dan jauh. Dalam bahasa Swahili, Zalika juga merupakan nama yang bermaksud 'keturunan mulia'. Za dalam Swahili biasanya menunjukkan pemilikan ('punya/daripada').",
  },
  "يَوْم": {
    en: "The word 'Yawm' primarily refers to a 'day', but in the Quranic context, it often denotes an 'epoch', 'age', or a significant event. Most notably used in 'Yawm al-Qiyamah' (Day of Resurrection) to signify a time beyond the human 24-hour cycle.",
    ms: "Perkataan 'Yawm' merujuk kepada 'hari', namun dalam konteks Al-Quran, ia sering membawa maksud 'zaman', 'zaman yang panjang', atau peristiwa besar. Paling kerap digunakan dalam 'Yawm al-Qiyamah' (Hari Kiamat) untuk menunjukkan waktu di luar kitaran 24 jam manusia.",
  },
  "إِذا": {
    en: "An adverb of time meaning 'when' or 'whenever'. It is usually used for events that are expected to happen (unlike 'in', which is conditional). In the Quran, it frequently introduces scenes of the Day of Judgment.",
    ms: "Kata keterangan masa yang bermaksud 'apabila'. Ia biasanya digunakan untuk perkara yang dijangka akan berlaku (berbeza dengan 'in' yang bersifat bersyarat). Dalam Al-Quran, ia sering memperkenalkan gambaran Hari Kiamat.",
  },
  "إِن": {
    en: "A conditional particle meaning 'if'. It introduces a condition that may or may not be fulfilled. It can also mean 'not' (negation) or 'indeed' (emphasis) depending on the context.",
    ms: "Kata sendi bersyarat yang bermaksud 'jika'. Ia memperkenalkan syarat yang mungkin atau tidak mungkin berlaku. Ia juga boleh bermaksud 'tidak' (penafian) atau 'sesungguhnya' (penegasan) mengikut konteks.",
  },
  "رَحْمَة": {
    en: "Derived from the root R-H-M (رحم), which primarily means the womb. This connection emphasizes that Allah's Mercy is creative, nurturing, and protective, similar to the bond between a mother and her unborn child.",
    ms: "Berasal daripada akar R-H-M (رحم), yang pada asalnya bermaksud rahim. Perkaitan ini menekankan bahawa Rahmat Allah bersifat kreatif, memelihara, dan melindungi, serupa dengan hubungan antara seorang ibu dan anak dalam kandungannya.",
  },
  "عَلَى": {
    en: "A primary preposition meaning 'on' or 'upon'. In Quranic grammar, it often implies obligation or a high degree of certainty when used in legal contexts, or physical/metaphorical height.",
    ms: "Kata sendi nama utama yang bermaksud 'atas' atau 'ke atas'. Dalam tatabahasa Al-Quran, ia sering membayangkan kewajipan atau tahap kepastian yang tinggi apabila digunakan dalam konteks hukum, atau ketinggian fizikal/metafora.",
  },
  "إِلَى": {
    en: "A preposition denoting direction or goal, meaning 'to' or 'towards'. When attached to pronouns, like 'ilayka' (إِلَيْكَ), it means 'to you'. It marks the end-point of an action or distance.",
    ms: "Kata sendi nama yang menunjukkan arah atau matlamat, bermaksud 'kepada' atau 'menuju'. Apabila disambung dengan kata ganti nama, seperti 'ilayka' (إِلَيْكَ), ia bermaksud 'kepada kamu'. Ia menandakan titik akhir suatu perbuatan atau jarak.",
  },
  "ل": {
    en: "The letter 'Lam' used as a preposition meaning 'for' or 'to'. When attached to pronouns like 'lahum' (لَهُمْ), it means 'for them'. It can also denote possession, emphasis, or purpose.",
    ms: "Huruf 'Lam' yang digunakan sebagai kata sendi nama bermaksud 'bagi' atau 'untuk'. Apabila disambung dengan kata ganti nama seperti 'lahum' (لَهُمْ), ia bermaksud 'bagi mereka'. Ia juga boleh menunjukkan pemilikan, penegasan, atau tujuan.",
  },
  "ثُمَّ": {
    en: "A coordinating conjunction meaning 'then' or 'afterward'. Unlike 'wa' (and) or 'fa' (then), 'thumma' usually implies a significant interval of time or a sequential delay between the two connected actions.",
    ms: "Kata hubung yang bermaksud 'kemudian' atau 'setelah itu'. Berbeza dengan 'wa' (dan) atau 'fa' (lalu), 'thumma' biasanya menunjukkan adanya tempoh masa atau kelewatan antara dua perbuatan yang dihubungkan.",
  },
};

const CORE_MEANINGS: Record<string, { en: string; ms: string }> = {
  "أله": { en: "God, deity, worship, divinity.", ms: "Tuhan, sembahan, ibadah, ketuhanan." },
  "رحم": { en: "Mercy, compassion, womb, to be kind.", ms: "Rahmat, belas kasihan, rahim, berbuat baik." },
  "ملك": { en: "To possess, own, rule, king, dominion.", ms: "Memiliki, memerintah, raja, kekuasaan." },
  "علم": { en: "To know, knowledge, science, world.", ms: "Tahu, ilmu, sains, alam." },
  "ربب": { en: "Lord, master, to sustain, nourish, maintain.", ms: "Tuhan, tuan, memelihara, memberi rezeki." },
  "كتب": { en: "To write, book, prescribe, decree, ordain.", ms: "Tulis, kitab, mewajibkan, menetapkan." },
  "قول": { en: "To say, speech, word, statement, talk.", ms: "Berkata, ucapan, perkataan, kenyataan." },
  "أمن": { en: "Safety, security, faith, belief, trust, peace.", ms: "Keselamatan, iman, kepercayaan, aman." },
  "حمد": { en: "Praise, thanks, commendation, gratitude.", ms: "Puji, syukur, penghargaan." },
  "عبد": { en: "To worship, serve, slave, servant.", ms: "Sembah, khidmat, hamba." },
  "كون": { en: "To be, exist, happen, take place.", ms: "Adalah, wujud, berlaku." },
  "رأي": { en: "To see, think, consider, hold an opinion.", ms: "Lihat, fikir, anggap, pendapat." },
  "أتي": { en: "To come, arrive, bring, give.", ms: "Datang, sampai, bawa, beri." },
  "عمل": { en: "To do, act, work, perform, deed.", ms: "Buat, amal, kerja, perbuatan." },
  "جعل": { en: "To make, set, appoint, create.", ms: "Jadikan, letak, lantik, cipta." },
  "عَلَى": { en: "On, upon, above, over.", ms: "Atas, ke atas, terhadap." },
  "مِن": { en: "From, of, among, some of.", ms: "Dari, daripada, sebahagian dari." },
  "بِ": { en: "With, in, by, through.", ms: "Dengan, dalam, melalui." },
  "لِ": { en: "For, to, belonging to.", ms: "Bagi, untuk, milik." },
  "فِي": { en: "In, inside, within, concerning.", ms: "Dalam, di dalam, tentang." },
  "إِلَى": { en: "To, toward, until.", ms: "Kepada, menuju, sehingga." },
  "مَا": { en: "What, that which / Not (negation).", ms: "Apa, apa yang / Tidak (penafian)." },
  "إِن": { en: "If / Indeed (emphasis).", ms: "Jika / Sesungguhnya (penegasan)." },
  "لَا": { en: "No, not.", ms: "Tidak, bukan." },
  "أَن": { en: "That (conjunction).", ms: "Bahawa." },
  "ذا": { en: "That, those, that which.", ms: "Itu, yang tersebut, yang demikian." },
  "أرض": { en: "Earth, land, ground, soil.", ms: "Bumi, tanah, daratan." },
  "سمو": { en: "Heaven, sky, high, lofty.", ms: "Langit, syurga, tinggi." },
  "نزل": { en: "To descend, reveal, send down.", ms: "Turun, wahyu, menurunkan." },
  "إِذا": { en: "When, whenever, as soon as.", ms: "Apabila, sewaktu, ketika." },
  "يوم": { en: "Day, epoch, age, period.", ms: "Hari, zaman, tempoh." },
};

const GRAMMAR_TIPS: Record<string, { en: string; ms: string }> = {
  P: {
    en: "This is a Preposition. It links words together to show relationship, like 'on' or 'from'. Note how it affects the ending of the next word!",
    ms: "Ini adalah Kata Sendi Nama (Preposition). Ia menghubungkan perkataan untuk menunjukkan perkaitan, seperti 'atas' atau 'dari'. Perhatikan bagaimana ia mengubah baris akhir kata selepasnya!",
  },
  V: {
    en: "This is a Verb. It describes an action. In Arabic, the form changes based on who is doing the action and when it happened.",
    ms: "Ini adalah Kata Kerja (Verb). Ia menerangkan perbuatan. Dalam bahasa Arab, bentuknya berubah mengikut siapa yang melakukan dan bila ia berlaku.",
  },
  N: {
    en: "This is a Noun. It names a person, place, thing, or concept. Nouns can be definite (the) or indefinite (a).",
    ms: "Ini adalah Kata Nama (Noun). Ia menamakan orang, tempat, benda, atau konsep.",
  },
  PRON: {
    en: "This is a Pronoun. It stands in for a noun, like 'he', 'they', or 'them'. Attached pronouns like '-him' often appear at the end of words.",
    ms: "Ini adalah Kata Ganti Nama (Pronoun). Ia menggantikan kata nama, seperti 'dia' atau 'mereka'.",
  },
};

const POS_MAP: Record<string, string> = {
  N: "Noun",
  V: "Verb",
  P: "Preposition",
  PN: "Proper Noun",
  PRON: "Pronoun",
  ADJ: "Adjective",
  ADV: "Adverb",
  CONJ: "Conjunction",
  INTG: "Interrogative",
  NEG: "Negative",
  COND: "Conditional",
  DET: "Determiner",
  NUM: "Number",
  T: "Particle",
};

interface Example {
  arabic: string;
  translation: string;
  surah: number;
  ayah: number;
}

export function LemmaContext({ card }: { card: LemmaMeta }) {
  const language = useLearning((s) => s.language);
  const t = UI_STRINGS[language];

  // The flashcard's example translation must follow the LEARNING language,
  // not the reader's translation setting. A user studying in EN expects English
  // examples even if they normally read the Quran in Malay (or vice versa).
  const activeTranslation = language === "ms" ? "ms.basmeih" : "en.sahih";

  const [examples, setExamples] = useState<Example[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setExamples([]);
      setLoading(true);
      try {
        const refs: { s: number; a: number }[] = [
          { s: card.sampleSurah, a: card.sampleAyah },
        ];

        if (card.root) {
          const occs = await loadRootOccurrences(card.root);
          if (occs) {
            const others = occs
              .filter(
                (o) =>
                  o.lemma === card.lemma &&
                  (o.s !== card.sampleSurah || o.a !== card.sampleAyah)
              )
              .sort(() => 0.5 - Math.random())
              .slice(0, 2);
            for (const o of others) {
              refs.push({ s: o.s, a: o.a });
            }
          }
        }

        if (refs.length < 3) {
          const normalize = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, "");
          const queries = [
            card.sampleText.replace(/[^\u0621-\u064A\s]/g, ""),
            card.lemma.length > 1 ? card.lemma.replace(/[^\u0621-\u064A\s]/g, "") : ""
          ].filter((q, i, self) => q && self.indexOf(q) === i);

          for (const q of queries) {
            if (refs.length >= 3) break;
            try {
              const search = await searchQuran(q, "quran-simple");
              if (search.matches && search.matches.length > 0) {
                const existing = new Set(refs.map(r => `${r.s}:${r.a}`));
                const targetNormalized = normalize(q);
                
                const matches = search.matches
                  .filter(m => {
                    if (existing.has(`${m.surah.number}:${m.numberInSurah}`)) return false;
                    const words = normalize(m.text).split(/\s+/);
                    return words.some(w => w === targetNormalized || w.startsWith(targetNormalized));
                  })
                  .sort((a, b) => a.text.length - b.text.length)
                  .slice(0, 3 - refs.length);
                
                for (const m of matches) {
                  refs.push({ s: m.surah.number, a: m.numberInSurah });
                }
              }
            } catch {
              // ignore search failures
            }
          }
        }

        const results: Example[] = [];
        const seen = new Set<string>();
        
        for (const ref of refs) {
          const key = `${ref.s}:${ref.a}`;
          if (seen.has(key)) continue;
          seen.add(key);

          try {
            const data = await getAyahWithEditions(key, [
              ARABIC_EDITION,
              activeTranslation,
            ]);
            
            const arabicEdition = data.find((d) => d.edition.identifier === ARABIC_EDITION);
            const translationEdition = data.find((d) => d.edition.identifier === activeTranslation);

            const arabic = arabicEdition?.text;
            const translation = translationEdition?.text;

            if (arabic && translation) {
              results.push({ arabic, translation, surah: ref.s, ayah: ref.a });
            }
          } catch {
            // ignore fetch failures
          }
        }

        if (mounted) {
          setExamples(results);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load lemma context:", err);
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [card, activeTranslation]);

  const posLabel = card.pos ? POS_MAP[card.pos] || card.pos : "Unknown";
  
  // High-integrity meaning retrieval:
  // 1. Check hardcoded root/lemma meanings
  // 2. Fallback to verified metadata glosses (already verified against Abdullah Basmeih/Sahih)
  const coreEntry = (card.root && CORE_MEANINGS[card.root]) || CORE_MEANINGS[card.lemma] || CORE_MEANINGS[card.lemma.replace(/[\u064B-\u065F\u0670]/g, "")];
  const coreMeaning = coreEntry
    ? (language === "ms" ? coreEntry.ms : coreEntry.en)
    : effectiveGloss(card, language)?.text ?? null;
  
  const grammarTip = card.pos ? GRAMMAR_TIPS[card.pos] : null;
  const tipText = grammarTip ? (language === "ms" ? grammarTip.ms : grammarTip.en) : null;

  const insightEntry = COMPREHENSIVE_INSIGHTS[card.lemma] || (card.root && COMPREHENSIVE_INSIGHTS[card.root]) || COMPREHENSIVE_INSIGHTS[card.lemma.replace(/[\u064B-\u065F\u0670]/g, "")];
  const insightText = insightEntry ? (language === "ms" ? insightEntry.ms : insightEntry.en) : null;

  const normalizedLemma = card.lemma.replace(/[\u064B-\u065F\u0670]/g, "");

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-bold bg-[color:var(--surface)] shadow-sm">
            <span className="text-[color:var(--muted)] mr-1.5 uppercase tracking-tighter">{t.flash_pos}:</span>
            {posLabel}
          </div>
          {card.root && (
            <div className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-bold bg-[color:var(--surface)] shadow-sm">
              <span className="text-[color:var(--muted)] mr-1.5 uppercase tracking-tighter">{t.flash_root}:</span>
              <span className="arabic text-base align-middle" lang="ar" dir="rtl">
                {card.root}
              </span>
            </div>
          )}
        </div>
        
        {coreMeaning && (
          <div className="rounded-2xl border-2 border-[color:var(--accent-soft)] p-4 bg-[color:var(--accent-soft)]/10 shadow-inner">
            <p className="text-[10px] uppercase tracking-widest text-[color:var(--accent-strong)] font-black mb-1">
              {t.flash_root_meaning}
            </p>
            <p className="text-[15px] text-[color:var(--foreground)] leading-relaxed font-medium">
              {coreMeaning}
            </p>
          </div>
        )}

        {insightText && (
          <div className="rounded-2xl border border-[color:var(--gold)]/30 p-5 bg-[color:var(--gold)]/5 border-l-4 border-l-[color:var(--gold)]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💡</span>
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--gold)] font-black">
                {t.flash_insight}
              </p>
            </div>
            <p className="text-sm text-[color:var(--foreground)] leading-relaxed opacity-90">
              {insightText}
            </p>
          </div>
        )}

        {tipText && (
          <div className="rounded-2xl border border-[color:var(--border)] p-4 bg-[color:var(--surface)]">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-full bg-[color:var(--accent-soft)]/40 flex items-center justify-center text-[color:var(--accent-strong)]">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-black">
                {t.flash_tip}
              </p>
            </div>
            <p className="text-xs text-[color:var(--muted)] leading-relaxed italic">
              {tipText}
            </p>
          </div>
        )}

        <a
          href={`https://www.almaany.com/ar/dict/ar-en/${encodeURIComponent(normalizedLemma)}/`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] py-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--foreground)] transition-all"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          </svg>
          {t.flash_academic_link}
        </a>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[color:var(--border)]" />
          <span className="text-[10px] uppercase tracking-widest text-[color:var(--muted)] font-bold">
            {t.flash_examples}
          </span>
          <div className="h-px flex-1 bg-[color:var(--border)]" />
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-24 w-full animate-pulse rounded-2xl bg-[color:var(--border)]/20" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-[color:var(--border)]/20" />
          </div>
        ) : examples.length > 0 ? (
          <div className="space-y-4">
            {examples.map((ex, idx) => {
              const surah = getSurah(ex.surah);
              const refLabel = surah 
                ? `${surah.englishName} (${ex.surah}:${ex.ayah})` 
                : `Surah ${ex.surah}, Ayah ${ex.ayah}`;
                
              return (
                <div
                  key={`${ex.surah}:${ex.ayah}:${idx}`}
                  className="rounded-2xl border border-[color:var(--border)] p-5 bg-[color:var(--surface)]/50 hover:bg-[color:var(--surface)] transition-colors shadow-sm"
                >
                  <div
                    className="arabic text-xl text-right leading-loose mb-3 text-[color:var(--foreground)]"
                    lang="ar"
                    dir="rtl"
                  >
                    <HighlightedText text={ex.arabic} lemma={card.lemma} sample={card.sampleText} />
                  </div>
                  <div className="text-sm text-[color:var(--foreground)] leading-relaxed mb-3 opacity-90">
                    <HighlightedTranslation
                      text={ex.translation}
                      target={effectiveGloss(card, language)?.text ?? ""}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-[color:var(--muted)] uppercase tracking-widest font-bold">
                      {refLabel}
                    </p>
                    <div className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]/40" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-[color:var(--border)] rounded-2xl bg-[color:var(--surface)]/30">
             <p className="text-xs text-[color:var(--muted)] italic mb-2">
               {t.flash_incorrect}... No additional examples found.
             </p>
             <button 
               onClick={() => window.location.reload()}
               className="text-[10px] uppercase tracking-widest font-bold text-[color:var(--accent-strong)] hover:underline"
             >
               Try reloading data
             </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedTranslation({ text, target }: { text: string; target: string }) {
  if (!target) return <>{text}</>;
  
  const clean = (s: string) => s.toLowerCase().replace(/^(and|the|a|an|of|on|at|in|to|dengan|bagi|dan|iaitu|ini|itu|yang)\s+/g, "").trim();
  const query = clean(target);
  
  if (!query || query.length < 3) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="font-bold underline decoration-2 underline-offset-2 text-[color:var(--foreground)]">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
}

function HighlightedText({ text, lemma, sample }: { text: string; lemma: string; sample: string }) {
  const normalize = (s: string) => s.replace(/[\u064B-\u065F\u0670]/g, "");
  const target = normalize(sample || lemma);
  const normalizedText = normalize(text);
  
  if (!target) return <>{text}</>;

  const matches: { start: number; end: number }[] = [];
  let lastIdx = -1;
  
  while ((lastIdx = normalizedText.indexOf(target, lastIdx + 1)) !== -1) {
    let originalStart = -1;
    let originalEnd = -1;
    let normIdx = 0;
    
    for (let i = 0; i < text.length; i++) {
      if (normIdx === lastIdx && originalStart === -1) {
        originalStart = i;
      }
      if (!/[\u064B-\u065F\u0670]/.test(text[i])) {
        normIdx++;
      }
      if (normIdx === lastIdx + target.length && originalEnd === -1) {
        originalEnd = i + 1;
        while (originalEnd < text.length && /[\u064B-\u065F\u0670]/.test(text[originalEnd])) {
          originalEnd++;
        }
        break;
      }
    }
    
    if (originalStart !== -1 && originalEnd !== -1) {
      matches.push({ start: originalStart, end: originalEnd });
    }
  }

  if (matches.length === 0) return <>{text}</>;

  const result: React.ReactNode[] = [];
  let lastPos = 0;
  
  matches.forEach((m, i) => {
    result.push(text.substring(lastPos, m.start));
    result.push(
      <span key={i} className="text-[color:var(--accent-strong)] font-black border-b-2 border-[color:var(--accent-strong)]/30 px-0.5">
        {text.substring(m.start, m.end)}
      </span>
    );
    lastPos = m.end;
  });
  result.push(text.substring(lastPos));

  return <>{result}</>;
}
