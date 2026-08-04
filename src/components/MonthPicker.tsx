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
      style={{
        background: "rgba(30, 41, 59, 0.6)",
        color: "var(--card-foreground)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "3px 8px",
        fontSize: "0.78rem",
        fontWeight: 700,
        outline: "none",
        cursor: "pointer",
        height: "32px",
      }}
    />
  );
}
