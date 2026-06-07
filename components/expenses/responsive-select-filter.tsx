"use client";

import { useRouter } from "next/navigation";

interface Option {
  value: string;
  label: string;
}

interface ResponsiveSelectFilterProps {
  label: string;
  emoji: string;
  currentValue: string;
  options: Option[];
  baseUrl: string;
  paramName: string;
  otherParams: Record<string, string>;
}

export function ResponsiveSelectFilter({
  label,
  emoji,
  currentValue,
  options,
  baseUrl,
  paramName,
  otherParams,
}: ResponsiveSelectFilterProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const query = new URLSearchParams();
    query.set(paramName, val);
    Object.entries(otherParams).forEach(([k, v]) => {
      query.set(k, v);
    });
    router.push(`${baseUrl}?${query.toString()}`);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
        {emoji} {label}
      </span>
      <select
        value={currentValue}
        onChange={handleChange}
        className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-750 focus:border-teal-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
