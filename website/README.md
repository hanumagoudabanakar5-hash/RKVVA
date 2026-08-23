# Ramakrishna Vivekananda Mission — Interactive Website

A single-file, self-contained interactive tribute website for the
Ramakrishna–Vivekananda movement. No build step, no dependencies, no backend.

## View it

Open `website/index.html` in any modern browser, or serve the folder:

```bash
cd website
python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's inside

Everything lives in `index.html` — HTML, CSS, and JavaScript inline. The only
external request is to Google Fonts (Fraunces, Mulish, Tiro Devanagari Sanskrit).

### Interactive features
- **Animated dawn hero** — a canvas sunrise that shifts between day and night with the theme.
- **Hand-drawn Order emblem** — the waters, lotus, rising sun, encircling serpent, and swan, rendered in SVG.
- **Light / dark theme toggle** — remembered per browser via `localStorage`, and respects the OS preference by default.
- **Quote rotator** — auto-advancing sayings of Sri Ramakrishna, the Holy Mother, and Swami Vivekananda, with manual dots.
- **Clickable movement timeline** — 1836 to today; tap any milestone to expand it.
- **Founder cards** with generative portrait backdrops.
- **Animated statistic counters** that count up on scroll.
- **Date-based "Daily Word"** — a reflection chosen from the day of the year, plus a shuffle button.
- **Contribution selector and newsletter form** — client-side only (no data leaves the page).
- Scroll-reveal animations, active-section nav highlighting, and a responsive mobile menu. Motion respects `prefers-reduced-motion`.

## Design

"Dawn over the Ganga" — a pre-dawn indigo ground with a single saffron accent
drawn from the rising sun in the Ramakrishna Order's own emblem. Fraunces
carries the display type; Mulish sets the body; the Sanskrit motto is set in
Tiro Devanagari Sanskrit.

## Note

This is an independent, non-commercial tribute created to share the ideals and
history of the movement. Names, dates, and quotations are drawn from the public
record; the figures shown are illustrative. It is **not** the official website of
any Ramakrishna Math, Ramakrishna Mission, or affiliated institution.
