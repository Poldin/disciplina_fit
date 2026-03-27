"use client";

const RATINGS = [
  { value: 1, emoji: "😢", label: "Molto male" },
  { value: 2, emoji: "😕", label: "Male" },
  { value: 3, emoji: "😐", label: "Così così" },
  { value: 4, emoji: "🙂", label: "Bene" },
  { value: 5, emoji: "😄", label: "Benissimo" },
];

type Props = {
  label?: string;
  value: number | null;
  saving: boolean;
  onChange: (value: number) => void;
};

export default function RatingBlock({ label, value, saving, onChange }: Props) {
  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {RATINGS.map((r) => {
          const selected = value === r.value;
          return (
            <button
              key={r.value}
              onClick={() => onChange(r.value)}
              disabled={saving}
              title={r.label}
              aria-label={r.label}
              aria-pressed={selected}
              className={[
                "flex flex-1 flex-col items-center gap-1 rounded-xl border py-2 transition-all duration-150 focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "text-2xl leading-none transition-transform duration-150 sm:text-3xl",
                  selected ? "scale-110" : "group-hover:scale-105",
                ].join(" ")}
              >
                {r.emoji}
              </span>
              <span
                className={[
                  "text-[10px] font-medium leading-tight sm:text-xs",
                  selected
                    ? "text-white dark:text-zinc-900"
                    : "text-zinc-500 dark:text-zinc-400",
                ].join(" ")}
              >
                {r.label}
              </span>
            </button>
          );
        })}
      </div>
      {saving ? (
        <p className="text-right text-xs text-zinc-400 dark:text-zinc-500">
          Salvataggio…
        </p>
      ) : value !== null ? (
        <p className="text-right text-xs text-zinc-400 dark:text-zinc-500">
          ✓ Salvato
        </p>
      ) : null}
    </div>
  );
}
