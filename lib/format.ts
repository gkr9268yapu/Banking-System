import { CURRENCY_SYMBOL } from "@/lib/config";

// Turns 5000 into "$5,000.00". Only for showing money, never for calculating it.
export function formatMoney(amount: number): string {
  const text = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = amount < 0 ? "-" : "";
  return `${sign}${CURRENCY_SYMBOL}${text}`;
}

// Turns "Ayesha Rai" into "AR" for avatar circles.
export function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Picks tidy Y axis values for a chart, like 0, 1K, 2K, 3K, 4K.
// It tries steps of 1, 2, 2.5, 5 and 10 (times 10, 100, 1000 ...)
// and takes the smallest step that needs 4 steps or fewer to reach the biggest bar.
export function getNiceTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0, 250, 500, 750, 1000];

  const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue / 4)));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((multiplier) => multiplier * magnitude)
      .find((candidate) => maxValue / candidate <= 4) ?? 10 * magnitude;

  const ticks: number[] = [];
  for (let tick = 0; tick < maxValue + step; tick += step) {
    ticks.push(tick);
    if (tick >= maxValue) break;
  }
  return ticks;
}

// Chart axis labels: 0, 500, 1K, 2K ... (1500 becomes 1.5K).
export function formatAxisK(value: number): string {
  if (value < 1000) return String(value);
  return `${Number((value / 1000).toFixed(1))}K`;
}

// Y axis values for a chart of COUNTS (such as transactions per day).
// Counts are whole numbers, so every tick must be a whole number too:
// 0, 1, 2, 3 for small counts, or 0, 2, 4, 6, 8 for bigger ones.
export function getCountTicks(maxValue: number): number[] {
  const top = Math.max(1, Math.ceil(maxValue));
  const step = Math.ceil(top / 4);

  const ticks: number[] = [];
  for (let tick = 0; ; tick += step) {
    ticks.push(tick);
    if (tick >= top) break;
  }
  return ticks;
}

// Readable names for the transaction types stored in the database.
const TYPE_LABELS: Record<string, string> = {
  TRANSFER: "Transfer",
  QR_PAY: "QR payment",
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdrawal",
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}