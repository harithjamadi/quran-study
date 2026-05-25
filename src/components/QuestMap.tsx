"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { SURAHS } from "@/data/surahs";
import { statusOf } from "@/lib/learning";

// Surah metadata with associated imagery and "required mastered words" for unlocking.
const QUEST_SURAHS = [
  { 
    num: 1, 
    name: "Al-Fatihah", 
    image: "🕌", 
    color: "bg-emerald-500", 
    req: 0 
  },
  { 
    num: 114, 
    name: "An-Naas", 
    image: "👥", 
    color: "bg-blue-500", 
    req: 5 
  },
  { 
    num: 113, 
    name: "Al-Falaq", 
    image: "🌄", 
    color: "bg-purple-500", 
    req: 12 
  },
  { 
    num: 112, 
    name: "Al-Ikhlas", 
    image: "☝️", 
    color: "bg-gold-500", 
    req: 20 
  },
  { 
    num: 111, 
    name: "Al-Masad", 
    image: "⛓️", 
    color: "bg-red-500", 
    req: 28 
  },
  { 
    num: 110, 
    name: "An-Nasr", 
    image: "🚩", 
    color: "bg-orange-500", 
    req: 35 
  },
  { 
    num: 109, 
    name: "Al-Kafirun", 
    image: "🚫", 
    color: "bg-indigo-500", 
    req: 45 
  },
  { 
    num: 108, 
    name: "Al-Kawthar", 
    image: "⛲", 
    color: "bg-cyan-500", 
    req: 55 
  },
];

export function QuestMap() {
  const language = useLearning((s) => s.language);
  const lemmas = useLearning((s) => s.lemmas);
  const [selectedLocked, setSelectedLocked] = useState<(typeof QUEST_SURAHS[0]) | null>(null);
  
  // REAL mastery logic: check how many words are actually 'strong' in the store
  const masteredCount = useMemo(() => {
    return Object.values(lemmas).filter(l => statusOf(l) === "strong").length;
  }, [lemmas]);

  return (
    <div className="relative py-20 px-4 overflow-hidden min-h-[1000px] bg-gradient-to-b from-[color:var(--surface)]/40 to-[color:var(--background)]">
      {/* Locked Requirement Popup */}
      {selectedLocked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedLocked(null)}>
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-pop" onClick={e => e.stopPropagation()}>
             <div className="text-center space-y-6">
                <div className="mx-auto h-20 w-20 rounded-2xl bg-[color:var(--border)] flex items-center justify-center text-4xl grayscale opacity-50">
                  {selectedLocked.image}
                </div>
                <div>
                   <h3 className="text-xl font-black uppercase tracking-tight">{selectedLocked.name}</h3>
                   <p className="text-sm text-[color:var(--muted-strong)] mt-1">
                     {language === "ms" ? "Misi ini masih terkunci" : "This mission is locked"}
                   </p>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">
                      <span>{language === "ms" ? "Progres" : "Progress"}</span>
                      <span>{masteredCount} / {selectedLocked.req}</span>
                   </div>
                   <div className="h-4 bg-[color:var(--border)] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[color:var(--gold)] transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (masteredCount / selectedLocked.req) * 100)}%` }} 
                      />
                   </div>
                   <p className="text-[11px] font-medium text-[color:var(--muted)] leading-relaxed">
                     {language === "ms" 
                       ? `Anda perlu menguasai ${selectedLocked.req} perkataan (tahap Kukuh) untuk membuka surah ini.` 
                       : `You need to master ${selectedLocked.req} words (Strong level) to unlock this Surah.`}
                   </p>
                </div>

                <button 
                  onClick={() => setSelectedLocked(null)}
                  className="w-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                >
                  OK
                </button>
             </div>
          </div>
        </div>
      )}

      {/* The Winding Path (SVG) */}
      <div className="absolute inset-0 pointer-events-none flex justify-center">
         <svg width="400" height="100%" viewBox="0 0 400 1200" preserveAspectRatio="none" className="opacity-20">
            <path 
              d="M 200 0 Q 380 150 200 300 T 200 600 T 200 900 T 200 1200" 
              fill="none" 
              stroke="var(--gold)" 
              strokeWidth="8" 
              strokeLinecap="round"
              strokeDasharray="20 20"
            />
         </svg>
      </div>

      <div className="flex flex-col items-center gap-24 relative z-10">
        {QUEST_SURAHS.map((item, idx) => {
          const surah = SURAHS.find(s => s.number === item.num);
          if (!surah) return null;

          const isUnlocked = masteredCount >= item.req;
          const isNext = !isUnlocked && (idx === 0 || masteredCount >= QUEST_SURAHS[idx-1].req);
          
          // Zig-zag offset
          const offset = idx % 2 === 0 ? "translate-x-8 sm:translate-x-16" : "-translate-x-8 sm:-translate-x-16";

          return (
            <div 
              key={item.num} 
              className={`group flex flex-col items-center transition-all duration-700 ${offset}`}
            >
              <div className="relative">
                <div 
                  onClick={() => !isUnlocked && setSelectedLocked(item)}
                  className="relative"
                >
                  <Link
                    href={isUnlocked ? `/learn/surah-quest/${item.num}` : "#"}
                    className={`
                      relative w-28 h-28 rounded-[2rem] flex flex-col items-center justify-center border-4 transition-all duration-500 overflow-hidden
                      ${isUnlocked ? "border-[color:var(--gold)] bg-[color:var(--surface)] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.3)] hover:scale-110 hover:-translate-y-2 cursor-pointer" : 
                        isNext ? "border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface)] opacity-90 cursor-pointer hover:border-[color:var(--muted)]" :
                        "border-[color:var(--border)] bg-transparent opacity-40 grayscale cursor-pointer"}
                    `}
                    onClick={(e) => {
                      if (!isUnlocked) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {/* Surah Icon/Image */}
                    <span className={`text-4xl mb-1 ${!isUnlocked && "opacity-30 blur-sm"}`}>
                      {item.image}
                    </span>
                    
                    {isUnlocked ? (
                      <span className="text-xl font-black text-[color:var(--foreground)]">{item.num}</span>
                    ) : (
                      <div className="flex flex-col items-center">
                         <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[color:var(--muted)]">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                         </svg>
                         <span className="text-[9px] font-bold mt-2 uppercase tracking-tighter text-[color:var(--muted)]">
                           {item.req} {language === "ms" ? "dikuasai" : "mastered"}
                         </span>
                      </div>
                    )}

                    {/* Locked Overlay */}
                    {!isUnlocked && !isNext && (
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center" />
                    )}
                  </Link>
                </div>

                {/* Progress Banner for Unlocked */}
                {isUnlocked && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[color:var(--gold)] text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    {language === "ms" ? "BUKA" : "PLAY"}
                  </div>
                )}
              </div>
              
              <div className={`mt-5 text-center transition-all ${!isUnlocked && "opacity-50"}`}>
                <p className="font-black text-sm uppercase tracking-widest text-[color:var(--foreground)]">{surah.englishName}</p>
                <p className="arabic text-xs mt-1 text-[color:var(--gold-strong)] dark:text-[color:var(--gold)]" lang="ar" dir="rtl">{surah.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
