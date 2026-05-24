"use client";

import { useSettings } from "@/store/settings";
import { useLearning } from "@/store/learning";
import { TRANSLATIONS, RECITERS } from "@/lib/editions";
import { classNames } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { UI_STRINGS } from "@/lib/i18n";

export function SettingsPanel() {
  const hydrated = useHydrated();
  const s = useSettings();
  const language = useLearning((x) => x.language);
  const setLanguage = useLearning((x) => x.setLanguage);
  const resetProgress = useLearning((x) => x.resetProgress);
  const t = UI_STRINGS[language];

  if (!hydrated) return <p className="text-sm text-[color:var(--muted)]">{UI_STRINGS.en.set_loading}</p>;

  return (
    <div className="space-y-4">
      <Section title={t.set_display}>
        <Field label={t.set_theme}>
          <SegmentGroup
            value={s.theme}
            onChange={(v) => s.setTheme(v as "light" | "dark" | "system")}
            options={[
              { value: "light", label: t.set_theme_light },
              { value: "dark", label: t.set_theme_dark },
              { value: "system", label: t.set_theme_system },
            ]}
          />
        </Field>
        <Field label={t.set_arabic_font} hint={`${s.arabicFontSize}px`}>
          <input
            type="range"
            min={18}
            max={64}
            step={2}
            value={s.arabicFontSize}
            onChange={(e) => s.setArabicFontSize(Number(e.target.value))}
            className="w-full"
            aria-label={t.set_arabic_font}
          />
        </Field>
        <Field label={t.set_trans_font} hint={`${s.translationFontSize}px`}>
          <input
            type="range"
            min={12}
            max={28}
            step={1}
            value={s.translationFontSize}
            onChange={(e) => s.setTranslationFontSize(Number(e.target.value))}
            className="w-full"
            aria-label={t.set_trans_font}
          />
        </Field>
        <Toggle
          label={t.set_highlight}
          value={s.highlightCurrentVerse}
          onChange={s.setHighlightCurrentVerse}
        />
      </Section>

      <Section title={t.set_learning}>
        <Field label={t.set_lang}>
          <SegmentGroup
            value={language}
            onChange={(v) => setLanguage(v as "en" | "ms")}
            options={[
              { value: "en", label: t.set_lang_en },
              { value: "ms", label: t.set_lang_ms },
            ]}
          />
        </Field>
        <p className="text-xs text-[color:var(--muted)]">
          {t.set_learning_note}
        </p>
        <div className="pt-3 mt-3 border-t border-[color:var(--border)]">
          <button
            onClick={() => {
              if (confirm(t.set_reset_progress_conf)) resetProgress();
            }}
            className="text-xs text-[color:var(--danger)] hover:underline"
          >
            {t.set_reset_progress}
          </button>
        </div>
      </Section>

      <Section title={t.set_word_study}>
        <Toggle
          label={t.set_word_study_toggle}
          value={s.wordStudyMode}
          onChange={s.setWordStudyMode}
        />
        <p className="text-xs text-[color:var(--muted)]">
          {t.set_word_study_desc}
        </p>
      </Section>

      <Section title={t.set_translation}>
        <Field label={t.set_default_trans}>
          <select
            value={s.translationId}
            onChange={(e) => s.setTranslation(e.target.value)}
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--accent)]"
            aria-label={t.set_default_trans}
          >
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.language} — {t.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title={t.set_audio}>
        <Field label={t.set_default_reciter}>
          <select
            value={s.reciterId}
            onChange={(e) => s.setReciter(e.target.value)}
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--accent)] max-w-full"
            aria-label={t.set_default_reciter}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <Toggle
          label={t.set_autoplay}
          value={s.autoplayNext}
          onChange={s.setAutoplayNext}
        />
      </Section>

      <Section title={t.set_reset_title}>
        <p className="text-sm text-[color:var(--muted)]">
          {t.set_reset_desc}
        </p>
        <button
          onClick={() => {
            if (confirm(t.set_reset_conf)) s.reset();
          }}
          className="mt-3 rounded-full border border-[color:var(--border)] px-4 py-2 text-sm hover:bg-[color:var(--accent-soft)]/40"
        >
          {t.set_reset_btn}
        </button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)] mb-4">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 justify-between">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-[color:var(--muted)]">{hint}</div>}
      </div>
      <div className="flex-1 min-w-[12rem] flex justify-end">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={classNames(
          "relative h-6 w-11 rounded-full transition-colors",
          value ? "bg-[color:var(--accent)]" : "bg-[color:var(--border)]"
        )}
      >
        <span
          className={classNames(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            value && "translate-x-5"
          )}
        />
      </button>
    </label>
  );
}

function SegmentGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-full border border-[color:var(--border)] overflow-hidden text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={classNames(
            "px-3 py-1.5",
            value === o.value
              ? "bg-[color:var(--accent)] text-white"
              : "hover:bg-[color:var(--accent-soft)]/40"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
