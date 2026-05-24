"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { UI_STRINGS } from "@/lib/i18n";
import { effectiveGloss, type LemmaMeta } from "@/lib/learning";
import { loadLemmaFrequency, lemmaAudioUrl } from "@/lib/frequency";
import { getSurah } from "@/data/surahs";

interface Props {
  surahNumber: number;
}

type Stage = "memorize" | "quiz" | "finish";

export function QuestSession({ surahNumber }: Props) {
  const language = useLearning((s) => s.language);
  const addXp = useLearning((s) => s.addXp);
  const dayStreak = useLearning((s) => s.dayStreak);
  const t = UI_STRINGS[language];

  const [stage, setStage] = useState<Stage>("memorize");
  const [words, setWords] = useState<LemmaMeta[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [quizType, setQuizType] = useState<"mcq_ar" | "mcq_gloss" | "true_false">("mcq_gloss");
  const [options, setOptions] = useState<LemmaMeta[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [lastSelected, setLastSelected] = useState<string | null>(null);
  const [score, setStats] = useState({ correct: 0, total: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function init() {
      const freq = await loadLemmaFrequency();
      if (!freq) return;

      let surahWords = freq.filter(l => l.sampleSurah === surahNumber).slice(0, 8);
      if (surahWords.length < 5) {
        const fillers = freq.filter(l => l.sampleSurah !== surahNumber).slice(0, 5 - surahWords.length);
        surahWords.push(...fillers);
      }

      setWords(surahWords);
      setLoading(false);
    }
    init();
  }, [surahNumber]);

  useEffect(() => {
    if (stage === "quiz" && words.length > 0) {
      prepareQuestion();
    }
  }, [stage, currentIdx]);

  function playWordAudio(w: LemmaMeta) {
    if (!w.sampleWord) return;
    const url = lemmaAudioUrl(w.sampleSurah, w.sampleAyah, w.sampleWord);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});
    } else {
      const a = new Audio(url);
      a.play().catch(() => {});
      audioRef.current = a;
    }
  }

  function prepareQuestion() {
    const current = words[currentIdx];
    const types: ("mcq_ar" | "mcq_gloss" | "true_false")[] = ["mcq_gloss", "mcq_ar", "true_false"];
    setQuizType(types[Math.floor(Math.random() * types.length)]);
    
    const others = words.filter(w => w.lemma !== current.lemma).sort(() => 0.5 - Math.random());
    setOptions([current, ...others.slice(0, 3)].sort(() => 0.5 - Math.random()));
    setFeedback(null);
    setLastSelected(null);
  }

  function handleAnswer(lemma: string) {
    if (feedback) return;
    const current = words[currentIdx];
    const isCorrect = lemma === current.lemma;
    
    setLastSelected(lemma);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      setStats(s => ({ ...s, correct: s.correct + 1 }));
      setCombo(c => {
        const next = c + 1;
        if (next > maxCombo) setMaxCombo(next);
        return next;
      });
      addXp(10 + combo);
    } else {
      setCombo(0);
    }
    
    setTimeout(() => {
      if (currentIdx + 1 < words.length) {
        setCurrentIdx(currentIdx + 1);
      } else {
        setStats(s => ({ ...s, total: words.length }));
        setStage("finish");
      }
    }, 1500);
  }

  if (loading) return <div className="p-20 text-center animate-pulse text-[color:var(--muted)]">Memuatkan misi...</div>;

  if (stage === "memorize") {
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-fade-in py-10">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-2">{t.quest_memorize}</h1>
          <p className="text-[color:var(--muted)]">Surah {getSurah(surahNumber)?.englishName}</p>
        </header>

        <div className="grid gap-3">
          {words.map((w, idx) => (
            <div key={idx} className="card-raised flex items-center justify-between p-5 bg-[color:var(--surface)] border border-[color:var(--border)]">
              <div className="flex items-center gap-4">
                 <button 
                   onClick={() => playWordAudio(w)} 
                   className="h-10 w-10 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center text-[color:var(--accent-strong)] hover:scale-110 transition-transform"
                   aria-label="Play audio"
                 >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                 </button>
                 <span className="arabic text-3xl" lang="ar" dir="rtl">{w.sampleText || w.lemma}</span>
              </div>
              <span className="text-lg font-medium text-[color:var(--foreground)] opacity-90">{effectiveGloss(w, language)?.text}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setStage("quiz")}
          className="w-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-bold py-5 rounded-2xl text-xl shadow-lg shadow-[color:var(--accent-glow)] transition-all active:scale-95"
        >
          {t.quest_start.toUpperCase()}
        </button>
      </div>
    );
  }

  if (stage === "finish") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-12 py-20 animate-fade-up">
        <div className="relative inline-block">
           <div className="absolute inset-0 bg-[color:var(--gold)] blur-3xl opacity-20 animate-pulse" />
           <div className="relative bg-gradient-to-tr from-[color:var(--accent-strong)] to-[color:var(--gold)] p-12 rounded-[40px] shadow-2xl text-white">
              <span className="text-8xl">⚡</span>
           </div>
        </div>

        <div>
           <h1 className="text-4xl font-black text-[color:var(--gold-strong)] dark:text-[color:var(--gold)] mb-2">
             {language === "ms" ? `Streak Hari-${dayStreak}!` : `Streak Day ${dayStreak}!`}
           </h1>
           <p className="text-xl text-[color:var(--muted-strong)]">{t.quest_welcome_back}</p>
           <p className="mt-4 text-sm text-[color:var(--muted)]">Score: {score.correct}/{score.total} · Max Combo: {maxCombo}</p>
        </div>

        <Link 
          href="/learn"
          className="block w-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-bold py-5 rounded-2xl text-xl shadow-xl transition-all"
        >
          {t.quest_continue.toUpperCase()}
        </Link>
      </div>
    );
  }

  const current = words[currentIdx];
  const progress = ((currentIdx + 1) / words.length) * 100;

  return (
    <div className="max-w-xl mx-auto h-[80vh] flex flex-col py-10">
      <div className="mb-10 space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/learn" className="text-2xl text-[color:var(--muted)] hover:text-[color:var(--foreground)]">×</Link>
          
          <div className="flex items-center gap-6">
            <span className="text-xs font-bold text-[color:var(--muted-strong)] uppercase tracking-widest">
              {t.sess_card_of.replace("{pos}", (currentIdx + 1).toString()).replace("{total}", words.length.toString())}
            </span>
            
            {combo >= 2 && (
              <span className="flex items-center gap-1.5 text-orange-500 font-black animate-bounce text-sm">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                {combo} COMBO
              </span>
            )}
          </div>
          <div className="w-8" />
        </div>
        
        <div className="h-3 bg-[color:var(--border)] rounded-full overflow-hidden shadow-inner">
          <div className="h-full bg-gradient-to-r from-[color:var(--gold)] to-[color:var(--accent)] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10">
        {quizType === "mcq_gloss" && (
          <>
            <p className="text-2xl font-bold text-[color:var(--muted-strong)] uppercase tracking-widest opacity-60 mb-2">
              {t.flash_question}
            </p>
            <p className="text-3xl font-bold text-[color:var(--foreground)]">"{effectiveGloss(current, language)?.text}"</p>
            <div className="grid grid-cols-2 gap-4 w-full">
              {options.map(opt => {
                const isCorrect = opt.lemma === current.lemma;
                const wasSelected = opt.lemma === lastSelected;
                
                return (
                  <button 
                    key={opt.lemma}
                    onClick={() => handleAnswer(opt.lemma)}
                    className={`
                      card-raised p-8 text-4xl arabic rounded-3xl border-b-8 transition-all
                      ${feedback === "correct" && isCorrect ? "bg-green-600 border-green-800 text-white scale-105 shadow-[0_0_25px_rgba(22,163,74,0.5)]" : 
                        feedback === "wrong" && isCorrect ? "bg-green-600 border-green-800 text-white" :
                        feedback === "wrong" && wasSelected ? "bg-red-600 border-red-800 text-white opacity-80 shadow-[0_0_15px_rgba(220,38,38,0.3)]" :
                        feedback ? "opacity-30 grayscale" :
                        "bg-[color:var(--surface)] border-[color:var(--border-strong)] text-[color:var(--foreground)] hover:bg-[color:var(--accent-soft)] hover:border-[color:var(--accent)]"}
                    `}
                  >
                    {opt.sampleText || opt.lemma}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {quizType === "mcq_ar" && (
          <>
            <button 
              onClick={() => playWordAudio(current)}
              className="group relative arabic text-7xl text-[color:var(--foreground)] mb-6 hover:scale-105 transition-transform" 
              lang="ar" 
              dir="rtl"
            >
              {current.sampleText || current.lemma}
              <span className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[color:var(--accent-soft)] p-2.5 rounded-full text-[color:var(--accent-strong)]">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </button>
            <div className="grid gap-3 w-full">
              {options.map(opt => {
                const isCorrect = opt.lemma === current.lemma;
                const wasSelected = opt.lemma === lastSelected;
                
                return (
                  <button 
                    key={opt.lemma}
                    onClick={() => handleAnswer(opt.lemma)}
                    className={`
                      p-5 text-xl font-bold rounded-2xl border-b-4 transition-all
                      ${feedback === "correct" && isCorrect ? "bg-green-600 border-green-800 text-white scale-105 shadow-[0_0_20px_rgba(22,163,74,0.4)]" : 
                        feedback === "wrong" && isCorrect ? "bg-green-600 border-green-800 text-white" :
                        feedback === "wrong" && wasSelected ? "bg-red-600 border-red-800 text-white opacity-80" :
                        feedback ? "opacity-30 grayscale" :
                        "bg-[color:var(--surface)] border-[color:var(--border-strong)] text-[color:var(--foreground)] hover:bg-[color:var(--accent-soft)] hover:border-[color:var(--accent)]"}
                    `}
                  >
                    {effectiveGloss(opt, language)?.text}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {quizType === "true_false" && (
          <>
             <div className="space-y-4">
                <button onClick={() => playWordAudio(current)} className="arabic text-7xl text-[color:var(--foreground)] hover:scale-105 transition-transform" lang="ar" dir="rtl">
                   {current.sampleText || current.lemma}
                </button>
                <div className="flex items-center justify-center gap-4 text-4xl text-[color:var(--accent)]">
                   <span>↓</span><span>↑</span>
                </div>
                <p className="text-3xl font-bold text-[color:var(--muted-strong)]">"{effectiveGloss(Math.random() > 0.5 ? current : options[0], language)?.text}"</p>
             </div>
             <div className="flex gap-4 w-full">
                <button 
                  onClick={() => handleAnswer("wrong_choice")}
                  className={`flex-1 border-b-8 p-5 rounded-2xl font-bold text-white text-xl transition-all ${feedback === "wrong" ? "bg-red-700 border-red-900 opacity-60 scale-95" : "bg-red-500 border-red-700 hover:bg-red-600"}`}
                >
                  {t.quest_false.toUpperCase()}
                </button>
                <button 
                  onClick={() => handleAnswer(current.lemma)}
                  className={`flex-1 border-b-8 p-5 rounded-2xl font-bold text-white text-xl transition-all ${feedback === "correct" ? "bg-green-700 border-green-900 scale-105 shadow-[0_0_25px_rgba(22,163,74,0.4)]" : "bg-green-500 border-green-700 hover:bg-green-600"}`}
                >
                  {t.quest_true.toUpperCase()}
                </button>
             </div>
          </>
        )}
      </div>
    </div>
  );
}
