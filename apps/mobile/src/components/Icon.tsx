import React from 'react';
import Svg, {Circle, Line, Path, Polygon, Polyline} from 'react-native-svg';

export type IconName =
  | 'home' | 'search' | 'heart' | 'bag' | 'user' | 'star' | 'sliders'
  | 'back' | 'right' | 'x' | 'plus' | 'minus' | 'check' | 'trash'
  | 'package' | 'store' | 'shield';

type Props = {name: IconName; size?: number; color?: string; fill?: string; strokeWidth?: number};

export default function Icon({name, size = 22, color = '#000', fill = 'none', strokeWidth = 1.8}: Props) {
  const p = {stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  let body: React.ReactNode;
  switch (name) {
    case 'home':
      body = (<><Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p} /><Polyline points="9 22 9 12 15 12 15 22" {...p} /></>);
      break;
    case 'search':
      body = (<><Circle cx="11" cy="11" r="8" {...p} /><Line x1="21" y1="21" x2="16.65" y2="16.65" {...p} /></>);
      break;
    case 'heart':
      body = <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" {...p} fill={fill} />;
      break;
    case 'bag':
      body = (<><Path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" {...p} /><Line x1="3" y1="6" x2="21" y2="6" {...p} /><Path d="M16 10a4 4 0 0 1-8 0" {...p} /></>);
      break;
    case 'user':
      body = (<><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} /><Circle cx="12" cy="7" r="4" {...p} /></>);
      break;
    case 'star':
      body = <Polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" {...p} fill={fill} />;
      break;
    case 'sliders':
      body = <Path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" {...p} />;
      break;
    case 'back': body = <Path d="M15 18l-6-6 6-6" {...p} />; break;
    case 'right': body = <Path d="M9 18l6-6-6-6" {...p} />; break;
    case 'x': body = <Path d="M18 6L6 18M6 6l12 12" {...p} />; break;
    case 'plus': body = <Path d="M12 5v14M5 12h14" {...p} />; break;
    case 'minus': body = <Path d="M5 12h14" {...p} />; break;
    case 'check': body = <Path d="M20 6L9 17l-5-5" {...p} />; break;
    case 'trash':
      body = <Path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...p} />;
      break;
    case 'package':
      body = (<><Path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" {...p} /><Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" {...p} /></>);
      break;
    case 'store':
      body = <Path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6" {...p} />;
      break;
    case 'shield':
      body = (<><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p} /><Path d="M9 12l2 2 4-4" {...p} /></>);
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
