"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useLearning } from "@/store/learning";
import { SURAHS } from "@/data/surahs";
import { statusOf } from "@/lib/learning";

// Defining the sequence for the Quest. 
// Starting from the shortest/most common (Juz 30 backwards + Fatihah)
const QUEST_SURAHS = [
  1,   // Fatihah
  114, // Nas
  113, // Falaq
  112, // Ikhlas
  111, // Masad
  110, // Nasr
  109, // Kafirun
  108, // Kawthar
  107, // Ma'un
  106, // Quraish
  105, // Fil
  104, // Humaza
  103, // Asr
  102, // Takathur
  101, // Qaria
  100, // Adiyat
  99,  // Zalzala
  98,  // Bayyina
  97,  // Qadr
  96,  // Alaq
  95,  // Tin
  94,  // Sharh
  93,  // Duha
  67,  // Mulk
  36,  // Yasin
  18,  // Kahf
];

export function QuestMap() {
  const language = useLearning((s) => s.language);
  const masteredLemmas = useLearning((s) => {
    return Object.keys(s.lemmas).filter(l => statusOf(s.lemmas[l]) === "strong").length;
  });

  // For a real app, we'd calculate coverage per Surah. 
  // For this prototype, we'll estimate progress based on global mastered count 
  // relative to the surah's position in the quest.
  
  return (
    <div className="relative py-12 px-4 overflow-hidden">
      {/* Background path line (SVG) */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
         <svg width="100%" height="100%" viewBox="0 0 400 1200" preserveAspectRatio="none">
            <path 
              d="M 200 0 Q 350 150 200 300 T 200 600 T 200 900 T 200 1200" 
              fill="none" 
              stroke="var(--gold)" 
              strokeWidth="4" 
              strokeDasharray="12 12"
            />
         </svg>
      </div>

      <div className="flex flex-col items-center gap-16 relative z-10">
        {QUEST_SURAHS.map((num, idx) => {
          const surah = SURAHS.find(s => s.number === num);
          if (!surah) return null;

          // Artificial logic: a surah is "unlocked" if you've mastered enough words
          // or if it's one of the first few.
          const isUnlocked = idx === 0 || masteredLemmas > (idx * 5);
          const isCurrent = isUnlocked && (masteredLemmas <= ((idx + 1) * 5));
          
          // Zig-zag offset
          const offset = idx % 2 === 0 ? "translate-x-12" : "-translate-x-12";

          return (
            <div 
              key={num} 
              className={`flex flex-col items-center transition-all duration-500 ${offset} ${isUnlocked ? "opacity-100" : "opacity-40 grayscale"}`}
            >
              <Link 
                href={isUnlocked ? `/learn/quest/${num}` : "#"}
                className={`
                  relative w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-300
                  ${isCurrent ? "border-[color:var(--gold)] bg-[color:var(--gold)] text-white scale-125 shadow-[0_0_25px_var(--gold-glow)]" : 
                    isUnlocked ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent-strong)]" : 
                    "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)]"}
                `}
              >
                <span className="text-xl font-bold">{num}</span>
                {isCurrent && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                  </span>
                )}
                
                {/* Progress Ring for individual surah (mock) */}
                <svg className="absolute inset-0 -rotate-90" width="100%" height="100%">
                  <circle
                    cx="50%" cy="50%" r="36"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray="226"
                    strokeDashoffset={226 - (Math.min(100, (masteredLemmas / ((idx + 1) * 6)) * 100) * 2.26)}
                    className="opacity-20"
                  />
                </svg>
              </Link>
              
              <div className="mt-3 text-center">
                <p className="font-bold text-sm tracking-tight">{surah.englishName}</p>
                <p className="arabic text-xs opacity-60" lang="ar" dir="rtl">{surah.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
