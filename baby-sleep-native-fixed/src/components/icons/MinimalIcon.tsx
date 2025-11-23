import React from 'react';
import Svg, { Path, Circle, Rect, Polygon, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';

interface MinimalIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const svgProps = (size: number = 18, strokeWidth: number = 1.6, color: string = 'currentColor') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

const icons: Record<string, (props: { size?: number; color?: string; strokeWidth?: number }) => React.ReactElement> = {
  arrowLeft: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M5 12h14" />
      <Path d="M12 5l-7 7 7 7" />
    </Svg>
  ),
  baby: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="12" cy="9" r="3" />
      <Path d="M9.5 5a2.5 2.5 0 0 1 5 0" />
      <Path d="M6.5 20c0-2.8 2.4-5 5.5-5s5.5 2.2 5.5 5" />
    </Svg>
  ),
  bath: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M4 14h16" />
      <Path d="M7 14v3a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-3" />
      <Path d="M9 7a2 2 0 1 1 4 0v7" />
      <Path d="M9 5h6" />
    </Svg>
  ),
  bed: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M3 18V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9" />
      <Path d="M3 18h18" />
      <Path d="M7 13h4" />
    </Svg>
  ),
  bell: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M18 16v-4a6 6 0 0 0-12 0v4" />
      <Path d="M5 16h14" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </Svg>
  ),
  bottle: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M10 2h4" />
      <Path d="M11 2v3" />
      <Path d="M13 2v3" />
      <Path d="M9 5h6l1 4H8z" />
      <Path d="M9 9h6v9a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
    </Svg>
  ),
  book: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M4 5h7a3 3 0 0 1 3 3v11" />
      <Path d="M20 5h-7a3 3 0 0 0-3 3v11" />
      <Path d="M4 5v14a2 2 0 0 0 2 2h5" />
      <Path d="M20 5v14a2 2 0 0 1-2 2h-5" />
    </Svg>
  ),
  chat: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-5l-4 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </Svg>
  ),
  close: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="m6 6 12 12" />
      <Path d="M18 6 6 18" />
    </Svg>
  ),
  calendar: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Rect x="3" y="5" width="18" height="16" rx="2" />
      <Path d="M16 3v4" />
      <Path d="M8 3v4" />
      <Path d="M3 11h18" />
    </Svg>
  ),
  clock: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v6l3 2" />
    </Svg>
  ),
  cup: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M5 5h13a1 1 0 0 1 1 1v3a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4V5" />
      <Path d="M5 5v3a6 6 0 0 0 6 6h2" />
      <Path d="M8 19h8" />
    </Svg>
  ),
  document: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M7 3h7l5 5v13H7z" />
      <Path d="M14 3v6h6" />
      <Path d="M10 13h4" />
      <Path d="M10 17h6" />
    </Svg>
  ),
  exit: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Svg>
  ),
  forum: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Rect x="3" y="6" width="13" height="10" rx="2" />
      <Path d="M8 6V4a2 2 0 0 1 2-2h9v10a2 2 0 0 1-2 2h-1" />
      <Path d="M6 20l3-4" />
    </Svg>
  ),
  globe: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M3 12h18" />
      <Path d="M12 3a15 15 0 0 1 0 18" />
      <Path d="M12 3a15 15 0 0 0 0 18" />
    </Svg>
  ),
  heart: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M12 20s-6.5-4.5-6.5-8.5a4 4 0 0 1 7-2.4 4 4 0 0 1 7 2.4C19.5 15.5 12 20 12 20z" />
    </Svg>
  ),
  history: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M3 3v6h6" />
      <Path d="M12 8v4l3 2" />
      <Path d="M21 12a9 9 0 1 1-9-9" />
    </Svg>
  ),
  lightbulb: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M9 18h6" />
      <Path d="M10 22h4" />
      <Path d="M12 2a7 7 0 0 0-4 12.8V17h8v-2.2A7 7 0 0 0 12 2z" />
    </Svg>
  ),
  lock: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <Path d="M12 15v4" />
    </Svg>
  ),
  moon: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color || 'currentColor'}>
      <Path d="M20 12.5A8.5 8.5 0 0 1 11.5 4a7 7 0 1 0 8.5 8.5z" fill={color || 'currentColor'} />
    </Svg>
  ),
  music: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M9 18V5l10-2v13" />
      <Circle cx="7" cy="18" r="2" />
      <Circle cx="17" cy="16" r="2" />
    </Svg>
  ),
  shield: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M12 3 5 6v6c0 5 3.8 9.6 7 10 3.2-.4 7-5 7-10V6z" />
    </Svg>
  ),
  search: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="11" cy="11" r="8" />
      <Path d="m21 21-4.35-4.35" />
    </Svg>
  ),
  sleep: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M19 10a7 7 0 1 1-8-8 5 5 0 0 0 8 8z" />
      <Path d="M9 5h3" />
      <Path d="M10 7h2" />
    </Svg>
  ),
  spark: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M12 4v4" />
      <Path d="M12 16v4" />
      <Path d="M4 12h4" />
      <Path d="M16 12h4" />
      <Path d="m6.3 6.3 2.8 2.8" />
      <Path d="m14.9 14.9 2.8 2.8" />
      <Path d="m6.3 17.7 2.8-2.8" />
      <Path d="m14.9 9.1 2.8-2.8" />
    </Svg>
  ),
  star: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="m12 3 2.4 5 5.6.8-4 4 1 5.7L12 15.5 7 18.5l1-5.7-4-4 5.6-.8z" />
    </Svg>
  ),
  target: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="12" cy="12" r="8" />
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 4v2" />
      <Path d="M12 18v2" />
      <Path d="M4 12h2" />
      <Path d="M18 12h2" />
    </Svg>
  ),
  trash: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M3 6h18" />
      <Path d="M6 6l1 14h10l1-14" />
      <Path d="M10 10v6" />
      <Path d="M14 10v6" />
      <Path d="M9 6V4h6v2" />
    </Svg>
  ),
  users: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="9" cy="8" r="3" />
      <Path d="M4 20v-1a5 5 0 0 1 5-5h1" />
      <Circle cx="17" cy="11" r="3" />
      <Path d="M15.5 20H21v-1a4 4 0 0 0-4-4h-1" />
    </Svg>
  ),
  userPlus: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Circle cx="8" cy="8" r="3" />
      <Path d="M3 20v-1a5 5 0 0 1 5-5h0.5" />
      <Path d="M16 8h5" />
      <Path d="M18.5 5.5v5" />
    </Svg>
  ),
  leaf: ({ size = 18, color, strokeWidth = 1.6 }) => (
    <Svg {...svgProps(size, strokeWidth, color)}>
      <Path d="M5 19c6 1 13-4 14-11-4 2-7.5.5-9-3C6 8 5 11 5 13a6 6 0 0 0 6 6" />
    </Svg>
  ),
};

export const EMOJI_ICON_MAP: Record<string, string> = {
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

const resolveIconName = (token: string | null | undefined, fallback: string | null = null): string | null => {
  if (!token) {
    return fallback;
  }

  if (icons[token]) {
    return token;
  }

  return EMOJI_ICON_MAP[token] || fallback;
};

const MinimalIcon: React.FC<MinimalIconProps> = ({ name, size = 18, color = '#333', strokeWidth = 1.6 }) => {
  if (!name) {
    // If no name provided, use chat as default
    const IconComponent = icons['chat'];
    return IconComponent ? IconComponent({ size, color, strokeWidth }) : null;
  }

  const IconComponent = icons[name];

  if (!IconComponent) {
    // Log missing icons for debugging
    if (__DEV__) {
      console.warn(`MinimalIcon: Icon "${name}" not found. Available icons:`, Object.keys(icons).sort().join(', '));
    }
    // Try to use chat as fallback instead of circle
    const fallbackIcon = icons['chat'];
    if (fallbackIcon) {
      return fallbackIcon({ size, color, strokeWidth });
    }
    // Last resort: show circle
    return (
      <Svg {...svgProps(size, strokeWidth, color)}>
        <Circle cx="12" cy="12" r="6" />
      </Svg>
    );
  }

  return IconComponent({ size, color, strokeWidth });
};

export { resolveIconName };
export default MinimalIcon;

