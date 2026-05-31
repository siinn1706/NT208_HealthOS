const MEAL_DIARY_REFRESH_KEY = "meal_diary_refresh_requested";

export function requestMealDiaryRefresh(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MEAL_DIARY_REFRESH_KEY, "1");
  } catch {
    // Some browser privacy modes can block sessionStorage.
  }
}

export function consumeMealDiaryRefreshRequest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.sessionStorage.getItem(MEAL_DIARY_REFRESH_KEY) !== "1") {
      return false;
    }
    window.sessionStorage.removeItem(MEAL_DIARY_REFRESH_KEY);
    return true;
  } catch {
    return false;
  }
}
