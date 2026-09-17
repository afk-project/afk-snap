const { comparison, periodLabel, shiftPeriod, startOf } = require("../services/adminReportService");
const adminOnly = require("../middleware/adminOnly");

describe("admin report", () => {
  test("menghitung perbandingan dan margin pertumbuhan", () => {
    expect(comparison(150000, 100000)).toEqual({ current: 150000, previous: 100000, difference: 50000, percent: 50 });
    expect(comparison(0, 0).percent).toBe(0);
  });

  test("membentuk batas periode harian, mingguan, bulanan, dan tahunan", () => {
    const date = new Date("2026-09-16T15:30:00.000Z");
    expect(startOf(date, "daily").toISOString()).toBe("2026-09-16T00:00:00.000Z");
    expect(startOf(date, "weekly").toISOString()).toBe("2026-09-14T00:00:00.000Z");
    expect(startOf(date, "monthly").toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(startOf(date, "yearly").toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(shiftPeriod(startOf(date, "monthly"), "monthly", -1).toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(periodLabel(startOf(date, "yearly"), "yearly")).toBe("2026");
  });

  test("middleware menolak user biasa dan menerima admin", () => {
    const nextUser = jest.fn();
    adminOnly({ user: { role: "user" } }, {}, nextUser);
    expect(nextUser.mock.calls[0][0]).toMatchObject({ status: 403 });
    const nextAdmin = jest.fn();
    adminOnly({ user: { role: "admin" } }, {}, nextAdmin);
    expect(nextAdmin).toHaveBeenCalledWith();
  });
});
