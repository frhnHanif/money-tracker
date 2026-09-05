import { addMonths, addYears, startOfDay } from "date-fns";

export type SubInterval = "monthly" | "yearly";

export interface SubscriptionLike {
  id: number;
  name: string;
  price: number;
  interval: SubInterval;
  billingDay: number;
  status: "active" | "inactive";
  lastPaidAt: string | null;
  notes?: string | null;
  createdAt?: string | Date;
}

const addInterval = (date: Date, interval: SubInterval) =>
  interval === "monthly" ? addMonths(date, 1) : addYears(date, 1);

/** Normalize a billing day into a valid day for the given month (31 -> last day). */
function dayInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

/**
 * Next due date. If the subscription was ever paid, the cycle follows the
 * actual payment date (lastPaid + interval). Otherwise it falls back to the
 * billing day of the current (or next) month.
 */
export function nextDue(sub: SubscriptionLike, refDate: Date = new Date()): Date {
  if (sub.lastPaidAt) {
    return addInterval(startOfDay(new Date(sub.lastPaidAt)), sub.interval);
  }
  const now = startOfDay(refDate);
  const candidate = dayInMonth(now.getFullYear(), now.getMonth() + 1, sub.billingDay);
  return candidate < now ? addInterval(candidate, sub.interval) : candidate;
}

/**
 * Whether the subscription is paid for the current period: the last payment
 * already happened (lastPaid <= now) and the period has not lapsed yet
 * (now < nextDue). If now has passed the due date without a new payment,
 * it counts as unpaid (overdue).
 */
export function isPaidThisCycle(sub: SubscriptionLike, refDate: Date = new Date()): boolean {
  if (!sub.lastPaidAt) return false;
  const now = startOfDay(refDate);
  const due = nextDue(sub, refDate);
  const lastPaid = startOfDay(new Date(sub.lastPaidAt));
  return lastPaid <= now && now < due;
}

/** Days until next due; negative when overdue. */
export function daysUntil(sub: SubscriptionLike, refDate: Date = new Date()): number {
  const due = nextDue(sub, refDate);
  const now = startOfDay(refDate);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

/** Price normalized to a monthly equivalent. */
export function monthlyPrice(sub: SubscriptionLike): number {
  return sub.interval === "yearly" ? sub.price / 12 : sub.price;
}

export const formatInterval = (sub: SubscriptionLike) =>
  sub.interval === "yearly" ? "tahunan" : "bulanan";