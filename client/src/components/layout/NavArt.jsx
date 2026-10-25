/**
 * Small illustrations for the Factions dropdown tiles — original artwork, drawn in SVG so
 * they stay crisp and weigh nothing. `art` comes from the navigation config.
 */
export default function NavArt({ art }) {
  if (art === "cards") return <CardsArt />;
  if (art === "crest") return <CrestArt />;
  return <PlainArt />;
}

function Defs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff2c9" />
        <stop offset="0.45" stopColor="#e3b55a" />
        <stop offset="1" stopColor="#a87a2c" />
      </linearGradient>
      <radialGradient id={`${id}-glow`} cx="0.5" cy="0.55" r="0.6">
        <stop offset="0" stopColor="#e3b55a" stopOpacity="0.28" />
        <stop offset="1" stopColor="#e3b55a" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Gangs: a crest — shield, crossed bars and a diamond — over diagonal hazard hatching. */
function CrestArt() {
  return (
    <svg
      className="nav-art"
      viewBox="0 0 220 124"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <Defs id="crest" />
      <rect width="220" height="124" fill="url(#crest-glow)" />
      <g
        className="nav-art__hatch"
        stroke="#e3b55a"
        strokeOpacity="0.1"
        strokeWidth="6"
      >
        {Array.from({ length: 14 }, (_, i) => (
          <line key={i} x1={i * 22 - 60} y1="134" x2={i * 22 + 40} y2="-10" />
        ))}
      </g>
      <g transform="translate(110 64)">
        <g className="nav-art__fig">
          <path
            d="M-58 22 L58 -22 M-58 -22 L58 22"
            stroke="url(#crest-gold)"
            strokeWidth="5"
            strokeLinecap="square"
          />
          <path
            d="M0 -44 L30 -34 L30 -2 C30 20 16 34 0 44 C-16 34 -30 20 -30 -2 L-30 -34 Z"
            fill="#0b0b0e"
            stroke="url(#crest-gold)"
            strokeWidth="2.5"
          />
          <path
            d="M0 -32 L22 -25 L22 -3 C22 13 12 24 0 32 C-12 24 -22 13 -22 -3 L-22 -25 Z"
            fill="none"
            stroke="#e3b55a"
            strokeOpacity="0.4"
          />
          <path d="M0 -16 L12 0 L0 16 L-12 0 Z" fill="url(#crest-gold)" />
        </g>
      </g>
    </svg>
  );
}

/** Clubs: three playing cards fanned from the bottom, gold-edged ivory faces. */
function CardsArt() {
  const cards = [
    { r: -20, glyph: "♠︎", red: false },
    { r: 20, glyph: "♦︎", red: true },
    { r: 0, glyph: "♥︎", red: true },
  ];
  return (
    <svg
      className="nav-art"
      viewBox="0 0 220 124"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <Defs id="cards" />
      <rect width="220" height="124" fill="url(#cards-glow)" />
      <g stroke="#e3b55a" strokeOpacity="0.12" fill="none">
        <circle cx="110" cy="150" r="70" />
        <circle cx="110" cy="150" r="100" />
        <circle cx="110" cy="150" r="130" />
      </g>
      <g className="nav-art__fig">
        {cards.map((c) => (
          <g key={c.r} className="nav-art__card" style={{ "--r": `${c.r}deg` }}>
            <rect
              x="-24"
              y="-68"
              width="48"
              height="68"
              rx="5"
              fill="#f6efe2"
              stroke="url(#cards-gold)"
              strokeWidth="1.6"
            />
            <rect
              x="-20"
              y="-64"
              width="40"
              height="60"
              rx="3"
              fill="none"
              stroke="#a87a2c"
              strokeOpacity="0.45"
            />
            <text
              x="0"
              y="-26"
              textAnchor="middle"
              fontSize="22"
              fill={c.red ? "#8f1d2c" : "#111"}
            >
              {c.glyph}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function PlainArt() {
  return (
    <svg
      className="nav-art"
      viewBox="0 0 220 124"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <Defs id="plain" />
      <rect width="220" height="124" fill="url(#plain-glow)" />
      <path
        className="nav-art__fig"
        d="M110 40 L130 62 L110 84 L90 62 Z"
        fill="url(#plain-gold)"
      />
    </svg>
  );
}
