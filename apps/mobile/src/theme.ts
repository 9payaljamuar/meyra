export const colors = {
  gold: '#B8862B',
  goldDark: '#8E6A1F',
  goldLight: '#E4C77E',
  goldSoft: '#F3E7CC',
  ink: '#121212',
  text: '#3A3530',
  muted: '#8E877D',
  line: '#ECE6DC',
  bg: '#FAF7F2',
  card: '#FFFFFF',
  blush: '#E8C4C0',
  blushDark: '#A8504A',
  green: '#2E7D5B',
  red: '#C0392B',
  star: '#E8A317',
};

// Playfair Display for editorial headings and prices; system sans for everything else.
export const fonts = {
  serif: 'PlayfairDisplay-SemiBold',
  serifBold: 'PlayfairDisplay-Bold',
  serifItalic: 'PlayfairDisplay-Italic',
};

export const radius = {sm: 6, md: 10, lg: 16, pill: 999};

export const rupee = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
