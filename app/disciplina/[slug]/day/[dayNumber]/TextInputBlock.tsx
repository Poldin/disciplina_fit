"use client";

import { useState } from "react";

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
};

export default function TextInputBlock({
  label,
  placeholder,
  value,
  saving,
  onChange,
  onSave,
}: Props) {
  const [savedValue, setSavedValue] = useState(value);
  const isDirty = value !== savedValue;

  function handleSave() {
    setSavedValue(value);
    onSave();
  }

  return (
    <div className="space-y-2">
      {label ? (
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      ) : null}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Scrivi qui…"}
        rows={3}
        className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-400 focus:bg-white focus:outline-none dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
      />
      <div className="flex items-center justify-end gap-2">
        {!isDirty && value.length > 0 && !saving ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            ✓ Salvato
          </span>
        ) : null}
        {isDirty || saving ? (
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Salvataggio…" : "Salva"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
