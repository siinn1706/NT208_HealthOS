import {
  dateToHHmm,
  hhmmToToday,
} from "@/components/ui/DateTimeField";

describe("DateTimeField helpers", () => {
  it("dateToHHmm returns empty string for null", () => {
    expect(dateToHHmm(null)).toBe("");
  });

  it("dateToHHmm formats local hours and minutes", () => {
    const d = new Date();
    d.setHours(8, 5, 0, 0);
    expect(dateToHHmm(d)).toBe("08:05");
  });

  it("hhmmToToday parses HH:MM into a Date with today's calendar day", () => {
    const result = hhmmToToday("14:30");
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
    const today = new Date();
    expect(result!.toDateString()).toBe(today.toDateString());
  });

  it("hhmmToToday rejects malformed strings", () => {
    expect(hhmmToToday("not a time")).toBeNull();
    expect(hhmmToToday("8:5")).toBeNull(); // wrong length
    expect(hhmmToToday("")).toBeNull();
  });

  it("hhmmToToday clamps out-of-range hour/minute", () => {
    const out = hhmmToToday("99:99");
    expect(out).not.toBeNull();
    expect(out!.getHours()).toBe(23);
    expect(out!.getMinutes()).toBe(59);
  });
});
