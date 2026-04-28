export const GlassEagle = () => {
  return (
    <svg
      viewBox="0 0 640 640"
      className="pointer-events-none absolute -left-24 top-1/2 h-[min(70vh,620px)] w-[min(72vw,620px)] -translate-y-1/2 opacity-60 blur-[0.4px]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wingGradient" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="40%" stopColor="rgba(209,231,255,0.35)" />
          <stop offset="100%" stopColor="rgba(157,194,240,0.08)" />
        </linearGradient>
        <linearGradient id="coreGradient" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.82)" />
          <stop offset="100%" stopColor="rgba(170,205,244,0.18)" />
        </linearGradient>
      </defs>

      <path
        d="M74 382c66-58 140-84 218-90 16-36 40-63 75-88 42-30 88-48 142-54-40 30-72 63-98 101 50 16 90 47 129 91-57-15-107-22-162-18-7 30-22 58-44 82-34 36-76 57-132 71-50 13-94 11-128 0z"
        fill="url(#wingGradient)"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="3"
      />
      <path
        d="M210 398c30-9 54-25 72-49 17-21 27-46 31-74 9 32 10 62 3 92-9 39-31 71-64 96-23-20-37-42-42-65z"
        fill="url(#coreGradient)"
        stroke="rgba(255,255,255,0.48)"
        strokeWidth="2.4"
      />
      <path
        d="M321 206c10-24 26-44 48-60 22-17 47-29 77-35-18 16-33 33-45 53 17 4 32 11 46 21-23 0-44 3-63 11-22 8-43 20-63 38z"
        fill="rgba(232,245,255,0.62)"
        stroke="rgba(255,255,255,0.58)"
        strokeWidth="2.2"
      />
    </svg>
  );
};
