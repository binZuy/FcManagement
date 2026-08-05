"use client";

import { useRouter } from "next/navigation";

interface MonthPickerProps {
  currentMonth: string; // yyyy-MM
  view: string;
}

export function MonthPicker({ currentMonth, view }: MonthPickerProps) {
  const router = useRouter();

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value; // yyyy-MM
    if (value) {
      router.push(`/matches?view=${view}&month=${value}`);
    }
  };

  return (
    <input
      type="month"
      value={currentMonth}
      onChange={handleMonthChange}
      className="accent-emerald-500"
      style={{
        background: "#1e293b",
        color: "#f8fafc",
        border: "1px solid #334155",
        borderRadius: "6px",
        padding: "3px 8px",
        fontSize: "0.78rem",
        fontWeight: 700,
        outline: "none",
        cursor: "pointer",
        height: "32px",
        colorScheme: "dark",
      }}
    />
  );
}
