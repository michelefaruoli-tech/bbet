"use client";

export function YearSelector({ year, years }: { year: number; years: number[] }) {
  return (
    <form method="get" className="flex items-center gap-2">
      <label htmlFor="year" className="text-sm text-slate-600">Anno</label>
      <select
        id="year"
        name="year"
        defaultValue={year}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        onChange={(e) => e.currentTarget.form?.submit()}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </form>
  );
}
