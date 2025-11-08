import React from 'react';

const svgProps = (props = {}) => {
  const {
    size = 18,
    strokeWidth = 1.6,
    className,
    ...rest
  } = props;
  const ariaHidden = Object.prototype.hasOwnProperty.call(rest, 'aria-hidden')
    ? rest['aria-hidden']
    : undefined;
  if (ariaHidden !== undefined) {
    delete rest['aria-hidden'];
  }

  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    focusable: 'false',
    'aria-hidden': ariaHidden ?? 'true',
    ...rest,
  };
};

const icons = {
  arrowLeft: (props) => (
    <svg {...svgProps(props)}>
      <path d="M5 12h14" />
      <path d="M12 5l-7 7 7 7" />
    </svg>
  ),
  baby: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="9" r="3" />
      <path d="M9.5 5a2.5 2.5 0 0 1 5 0" />
      <path d="M6.5 20c0-2.8 2.4-5 5.5-5s5.5 2.2 5.5 5" />
    </svg>
  ),
  bath: (props) => (
    <svg {...svgProps(props)}>
      <path d="M4 14h16" />
      <path d="M7 14v3a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-3" />
      <path d="M9 7a2 2 0 1 1 4 0v7" />
      <path d="M9 5h6" />
    </svg>
  ),
  bed: (props) => (
    <svg {...svgProps(props)}>
      <path d="M3 18V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9" />
      <path d="M3 18h18" />
      <path d="M7 13h4" />
    </svg>
  ),
  bell: (props) => (
    <svg {...svgProps(props)}>
      <path d="M18 16v-4a6 6 0 0 0-12 0v4" />
      <path d="M5 16h14" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  ),
  bottle: (props) => (
    <svg {...svgProps(props)}>
      <path d="M10 2h4" />
      <path d="M11 2v3" />
      <path d="M13 2v3" />
      <path d="M9 5h6l1 4H8z" />
      <path d="M9 9h6v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
    </svg>
  ),
  book: (props) => (
    <svg {...svgProps(props)}>
      <path d="M4 5h7a3 3 0 0 1 3 3v11" />
      <path d="M20 5h-7a3 3 0 0 0-3 3v11" />
      <path d="M4 5v14a2 2 0 0 0 2 2h5" />
      <path d="M20 5v14a2 2 0 0 1-2 2h-5" />
    </svg>
  ),
  calendar: (props) => (
    <svg {...svgProps(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
    </svg>
  ),
  chat: (props) => (
    <svg {...svgProps(props)}>
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-4 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </svg>
  ),
  clock: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l3 2" />
    </svg>
  ),
  close: (props) => (
    <svg {...svgProps(props)}>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  ),
  crown: (props) => (
    <svg {...svgProps(props)}>
      <path d="M5 18h14l1-8-4 3-3-6-3 6-4-3z" />
      <path d="M5 18v2h14v-2" />
    </svg>
  ),
  cup: (props) => (
    <svg {...svgProps(props)}>
      <path d="M5 5h13a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4V5" />
      <path d="M5 5v3a6 6 0 0 0 6 6h2" />
      <path d="M8 19h8" />
    </svg>
  ),
  document: (props) => (
    <svg {...svgProps(props)}>
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v6h6" />
      <path d="M10 13h4" />
      <path d="M10 17h6" />
    </svg>
  ),
  exit: (props) => (
    <svg {...svgProps(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  forum: (props) => (
    <svg {...svgProps(props)}>
      <rect x="3" y="6" width="13" height="10" rx="2" />
      <path d="M8 6V4a2 2 0 0 1 2-2h9v10a2 2 0 0 1-2 2h-1" />
      <path d="M6 20l3-4" />
    </svg>
  ),
  globe: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18" />
      <path d="M12 3a15 15 0 0 0 0 18" />
    </svg>
  ),
  heart: (props) => (
    <svg {...svgProps(props)}>
      <path d="M12 20s-6.5-4.5-6.5-8.5a4 4 0 0 1 7-2.4 4 4 0 0 1 7 2.4C19.5 15.5 12 20 12 20z" />
    </svg>
  ),
  history: (props) => (
    <svg {...svgProps(props)}>
      <path d="M3 3v6h6" />
      <path d="M12 8v4l3 2" />
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  ),
  lightbulb: (props) => (
    <svg {...svgProps(props)}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.8V17h8v-2.2A7 7 0 0 0 12 2z" />
    </svg>
  ),
  lock: (props) => (
    <svg {...svgProps(props)}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <path d="M12 15v4" />
    </svg>
  ),
  logIn: (props) => (
    <svg {...svgProps(props)}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h14" />
    </svg>
  ),
  logout: (props) => (
    <svg {...svgProps(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  ),
  menu: (props) => (
    <svg {...svgProps(props)}>
      <path d="M6 12h12" />
      <path d="M6 6h12" />
      <path d="M6 18h12" />
    </svg>
  ),
  moon: (props) => (
    <svg {...svgProps(props)}>
      <path d="M20 12.5A8.5 8.5 0 0 1 11.5 4a7 7 0 1 0 8.5 8.5z" />
    </svg>
  ),
  music: (props) => (
    <svg {...svgProps(props)}>
      <path d="M9 18V5l10-2v13" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="16" r="2" />
    </svg>
  ),
  options: (props) => (
    <svg {...svgProps(props)}>
      <path d="M12 5h.01" />
      <path d="M12 12h.01" />
      <path d="M12 19h.01" />
    </svg>
  ),
  paperclip: (props) => (
    <svg {...svgProps(props)}>
      <path d="M16 8v7a4 4 0 0 1-8 0V7a3 3 0 0 1 6 0v7a2 2 0 0 1-4 0V9" />
    </svg>
  ),
  profile: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5" />
    </svg>
  ),
  shield: (props) => (
    <svg {...svgProps(props)}>
      <path d="M12 3 5 6v6c0 5 3.8 9.6 7 10 3.2-.4 7-5 7-10V6z" />
    </svg>
  ),
  sleep: (props) => (
    <svg {...svgProps(props)}>
      <path d="M19 10a7 7 0 1 1-8-8 5 5 0 0 0 8 8z" />
      <path d="M9 5h3" />
      <path d="M10 7h2" />
    </svg>
  ),
  spark: (props) => (
    <svg {...svgProps(props)}>
      <path d="M12 4v4" />
      <path d="M12 16v4" />
      <path d="M4 12h4" />
      <path d="M16 12h4" />
      <path d="m6.3 6.3 2.8 2.8" />
      <path d="m14.9 14.9 2.8 2.8" />
      <path d="m6.3 17.7 2.8-2.8" />
      <path d="m14.9 9.1 2.8-2.8" />
    </svg>
  ),
  star: (props) => (
    <svg {...svgProps(props)}>
      <path d="m12 3 2.4 5 5.6.8-4 4 1 5.7L12 15.5 7 18.5l1-5.7-4-4 5.6-.8z" />
    </svg>
  ),
  target: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 4v2" />
      <path d="M12 18v2" />
      <path d="M4 12h2" />
      <path d="M18 12h2" />
    </svg>
  ),
  trash: (props) => (
    <svg {...svgProps(props)}>
      <path d="M3 6h18" />
      <path d="M6 6l1 14h10l1-14" />
      <path d="M10 10v6" />
      <path d="M14 10v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  ),
  users: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 20v-1a5 5 0 0 1 5-5h1" />
      <circle cx="17" cy="11" r="3" />
      <path d="M15.5 20H21v-1a4 4 0 0 0-4-4h-1" />
    </svg>
  ),
  userPlus: (props) => (
    <svg {...svgProps(props)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h0.5" />
      <path d="M16 8h5" />
      <path d="M18.5 5.5v5" />
    </svg>
  ),
  warning: (props) => (
    <svg {...svgProps(props)}>
      <path d="M12 5 3.5 19h17z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
};

export const EMOJI_ICON_MAP = {
  '💬': 'chat',
  '🌙': 'moon',
  '🛌': 'bed',
  '😴': 'sleep',
  '💤': 'sleep',
  '💙': 'heart',
  '⭐': 'star',
  '🎯': 'target',
  '📚': 'book',
  '💡': 'lightbulb',
  '🤗': 'users',
  '🍼': 'bottle',
  '🌟': 'star',
  '🧸': 'heart',
  '🎵': 'music',
  '☕️': 'cup',
  '🦉': 'moon',
  '🌈': 'spark',
  '🧘': 'spark',
  '🕰️': 'clock',
  '🧠': 'lightbulb',
  '🍃': 'leaf',
  '🥰': 'heart',
  '📅': 'calendar',
  '✨': 'spark',
  '🪄': 'spark',
  '🪺': 'spark',
  '🛁': 'bath',
  '🧴': 'bottle',
  '🧦': 'spark',
};

icons.leaf = (props) => (
  <svg {...svgProps(props)}>
    <path d="M5 19c6 1 13-4 14-11-4 2-7.5.5-9-3C6 8 5 11 5 13a6 6 0 0 0 6 6" />
  </svg>
);

const MinimalIcon = ({ name, ...props }) => {
  const iconName = name && icons[name] ? name : null;
  const IconComponent = iconName ? icons[iconName] : null;

  if (!IconComponent) {
    return (
      <svg {...svgProps(props)}>
        <circle cx="12" cy="12" r="6" />
      </svg>
    );
  }

  return IconComponent(props);
};

export const resolveIconName = (token, fallback = null) => {
  if (!token) {
    return fallback;
  }

  if (icons[token]) {
    return token;
  }

  return EMOJI_ICON_MAP[token] || fallback;
};

export default MinimalIcon;

