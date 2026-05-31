/* Sync with deriveAccentTokens() + getContrastColor() in src/lib/accent-utils.ts */
(function () {
  try {
    var a = localStorage.getItem("healthos-accent");
    if (!a || !/^#[0-9A-Fa-f]{6}$/.test(a)) return;
    function H(x) {
      var r = parseInt(x.slice(1, 3), 16) / 255,
        g = parseInt(x.slice(3, 5), 16) / 255,
        b = parseInt(x.slice(5, 7), 16) / 255,
        M = Math.max(r, g, b),
        m = Math.min(r, g, b),
        l = (M + m) / 2;
      if (M === m) return { h: 0, s: 0, l: Math.round(l * 100) };
      var d = M - m,
        s = l > 0.5 ? d / (2 - M - m) : d / (M + m),
        h = 0;
      switch (M) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }
    function X(h, s, l) {
      s /= 100;
      l /= 100;
      var k = function (n) {
          return (n + h / 30) % 12;
        },
        q = s * Math.min(l, 1 - l),
        f = function (n) {
          return l - q * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        },
        t = function (x) {
          return Math.round(x * 255)
            .toString(16)
            .padStart(2, "0");
        };
      return ("#" + t(f(0)) + t(f(8)) + t(f(4))).toUpperCase();
    }
    function Y(c) {
      var linearizeChannel = function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return (
        0.2126 * linearizeChannel(parseInt(c.slice(1, 3), 16)) +
        0.7152 * linearizeChannel(parseInt(c.slice(3, 5), 16)) +
        0.0722 * linearizeChannel(parseInt(c.slice(5, 7), 16))
      );
    }
    function C(b) {
      var o = ["#0B0F14", "#000000", "#FFFFFF"],
        i,
        q,
        B = o[0],
        m = 0;
      for (i = 0; i < o.length; i++) {
        q = (Math.max(Y(o[i]), Y(b)) + 0.05) / (Math.min(Y(o[i]), Y(b)) + 0.05);
        if (q >= 4.5) return o[i];
        if (q > m) {
          m = q;
          B = o[i];
        }
      }
      return B;
    }
    var D = (function () {
        var e = localStorage.getItem("theme");
        if (e === "dark") return 1;
        if (e === "light") return 0;
        try {
          return matchMedia("(prefers-color-scheme: dark)").matches ? 1 : 0;
        } catch {
          return document.documentElement.classList.contains("dark") ? 1 : 0;
        }
      })(),
      z = H(a),
      h = z.h,
      s = Math.min(z.s, 75),
      l = z.l,
      P = D ? X(h, s, Math.min(l + 15, 70)) : X(h, s, Math.max(l, 35)),
      F = C(P),
      G = D
        ? X(h, Math.max(s - 10, 20), Math.min(l + 10, 75))
        : X(h, Math.max(s - 10, 20), Math.min(l + 20, 80)),
      S = document.documentElement.style;
    S.setProperty("--primary", P);
    S.setProperty("--primary-foreground", F);
    S.setProperty("--ring", P);
    S.setProperty("--chart-1", P);
    S.setProperty("--chart-2", G);
  } catch {
    /* noop — AccentColorProvider repairs on mount */
  }
})();
