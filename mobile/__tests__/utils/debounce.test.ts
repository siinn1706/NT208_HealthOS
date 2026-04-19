import { debounce } from "@/utils/debounce";

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("only fires once after the trailing delay", () => {
    const spy = jest.fn();
    const debounced = debounce(spy, 200);
    debounced("a");
    debounced("b");
    debounced("c");
    jest.advanceTimersByTime(199);
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("c");
  });

  it("each call resets the timer", () => {
    const spy = jest.fn();
    const debounced = debounce(spy, 100);
    debounced();
    jest.advanceTimersByTime(80);
    debounced();
    jest.advanceTimersByTime(80);
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(20);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
