const { Op } = require("sequelize");
const { GenerationJob, PaymentOrder, User, Wallet } = require("../models");

const PERIOD_CONFIG = Object.freeze({
  daily: { buckets: 14, label: "Harian" },
  weekly: { buckets: 12, label: "Mingguan" },
  monthly: { buckets: 12, label: "Bulanan" },
  yearly: { buckets: 5, label: "Tahunan" },
});

function startOf(date, period, offsetMinutes = 0) {
  const value = new Date(new Date(date).getTime() + offsetMinutes * 60000);
  let result;
  if (period === "yearly") result = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  else if (period === "monthly") result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
  else result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  if (["yearly", "monthly"].includes(period)) return new Date(result.getTime() - offsetMinutes * 60000);
  const day = result;
  if (period === "weekly") day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return new Date(day.getTime() - offsetMinutes * 60000);
}

function shiftPeriod(date, period, amount, offsetMinutes = 0) {
  const value = new Date(new Date(date).getTime() + offsetMinutes * 60000);
  if (period === "yearly") value.setUTCFullYear(value.getUTCFullYear() + amount);
  else if (period === "monthly") value.setUTCMonth(value.getUTCMonth() + amount);
  else value.setUTCDate(value.getUTCDate() + amount * (period === "weekly" ? 7 : 1));
  return new Date(value.getTime() - offsetMinutes * 60000);
}

function periodLabel(date, period, timeZone = "UTC") {
  if (period === "yearly") return new Intl.DateTimeFormat("id-ID", { year: "numeric", timeZone }).format(date);
  if (period === "monthly") return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone }).format(date);
  if (period === "weekly") {
    const end = new Date(date);
    end.setUTCDate(end.getUTCDate() + 6);
    const short = (value) => new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone }).format(value);
    return `${short(date)}–${short(end)}`;
  }
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone }).format(date);
}

function comparison(current, previous) {
  const difference = current - previous;
  const percent = previous === 0 ? (current > 0 ? 100 : 0) : (difference / previous) * 100;
  return { current, previous, difference, percent: Number(percent.toFixed(1)) };
}

function inRange(value, start, end) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return time >= start.getTime() && time < end.getTime();
}

function sum(items, field) {
  return items.reduce((total, item) => total + Number(item[field] || 0), 0);
}

function summarize({ orders, users, generations }, start, end) {
  const periodOrders = orders.filter((item) => inRange(item.paidAt, start, end));
  const periodUsers = users.filter((item) => inRange(item.createdAt, start, end));
  const periodGenerations = generations.filter((item) => inRange(item.createdAt, start, end));
  const completed = periodGenerations.filter((item) => item.status === "completed");
  return {
    revenue: sum(periodOrders, "amount"),
    transactions: periodOrders.length,
    creditsSold: sum(periodOrders, "credits"),
    newUsers: periodUsers.length,
    generations: periodGenerations.length,
    completedGenerations: completed.length,
    creditsUsed: sum(completed, "cost"),
  };
}

async function buildAdminReport(period = "daily", now = new Date()) {
  if (!PERIOD_CONFIG[period]) period = "daily";
  const config = PERIOD_CONFIG[period];
  const offsetMinutes = Number(process.env.REPORT_TIMEZONE_OFFSET_MINUTES || 420);
  const timeZone = process.env.REPORT_TIMEZONE || "Asia/Jakarta";
  const currentStart = startOf(now, period, offsetMinutes);
  const currentEnd = shiftPeriod(currentStart, period, 1, offsetMinutes);
  const previousStart = shiftPeriod(currentStart, period, -1, offsetMinutes);
  const seriesStart = shiftPeriod(currentStart, period, -(config.buckets - 1), offsetMinutes);

  const [orders, users, generations, totalUsers, walletCredits] = await Promise.all([
    PaymentOrder.findAll({ where: { status: "paid", paidAt: { [Op.gte]: seriesStart, [Op.lt]: currentEnd } }, attributes: ["amount", "credits", "paidAt"], raw: true }),
    User.findAll({ where: { createdAt: { [Op.gte]: seriesStart, [Op.lt]: currentEnd } }, attributes: ["createdAt"], raw: true }),
    GenerationJob.findAll({ where: { createdAt: { [Op.gte]: seriesStart, [Op.lt]: currentEnd } }, attributes: ["createdAt", "status", "cost"], raw: true }),
    User.count(),
    Wallet.sum("balance"),
  ]);

  const data = { orders, users, generations };
  const current = summarize(data, currentStart, currentEnd);
  const previous = summarize(data, previousStart, currentStart);
  const series = Array.from({ length: config.buckets }, (_, index) => {
    const start = shiftPeriod(seriesStart, period, index, offsetMinutes);
    const end = shiftPeriod(start, period, 1, offsetMinutes);
    return { label: periodLabel(start, period, timeZone), start: start.toISOString(), ...summarize(data, start, end) };
  });

  return {
    period,
    periodLabel: config.label,
    timezone: timeZone,
    range: { currentStart, currentEnd, previousStart },
    summary: current,
    previous,
    comparison: Object.fromEntries(Object.keys(current).map((key) => [key, comparison(current[key], previous[key])])),
    totals: { users: totalUsers, walletCredits: Number(walletCredits || 0) },
    series,
  };
}

module.exports = { PERIOD_CONFIG, buildAdminReport, comparison, periodLabel, shiftPeriod, startOf };
