/* A theme for every month. Halloween (October) and Christmas (December) live in seasons.ts with their own
   costumes and artwork; this is the data for the other ten months. One entry gives a month the same theme parts:
   map colours, a greeting, a name for points, food words and one story line. Like the two holidays, a month theme
   only changes the look, the points name, food words and story line: never a question, an answer or a picture.
   Numi's costumes for these months (two each, earned after 3 and 5 lessons that month) come in a later change, so
   no month here has any yet. */

export type MonthThemeId = 'january' | 'february' | 'march' | 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'november';

export type MonthTheme = {
  id: MonthThemeId;
  /** The calendar month, 0 to 11 as in Date.getMonth(). */
  month: number;
  /** The month's name, for kickers and the saved key ("january-2026"). */
  name: string;
  /** The theme's name, the banner's big line. */
  title: string;
  greeting: string;
  /** What points are called while the theme is on. */
  points: string;
  /** Map colours. The banner fades from `from` into `to`; map lessons take `node` with an `edge`; `text` is the
      banner's text colour (white when left out, so every entry must keep it readable on `from`). */
  map: { from: string; to: string; node: string; edge: string; text?: string };
  /** Singular treats: lesson text swaps pizza, cake and juice for these ("pizzas" and "cakes" add an s). */
  foods: { pizza: string; cake: string; juice: string };
  /** Numi's one story line, shown wherever a season's lines are shown. */
  line: string;
};

export const MONTH_THEMES: MonthTheme[] = [
  { id: 'january', month: 0, name: 'January', title: 'Snow day', greeting: 'Snow day!', points: 'snowflakes',
    map: { from: '#3a6ea5', to: '#9cc7ef', node: '#fff', edge: '#1f4a78' },
    foods: { pizza: 'giant pancake', cake: 'snowball cake', juice: 'hot cocoa' }, line: 'Help the penguins share the fish fairly.' },
  { id: 'february', month: 1, name: 'February', title: 'Friendship hearts', greeting: 'Happy friendship month!', points: 'hearts',
    map: { from: '#d6336c', to: '#ff9ec0', node: '#fff', edge: '#9b1d4b' },
    foods: { pizza: 'heart pizza', cake: 'strawberry cake', juice: 'pink lemonade' }, line: 'Let’s share the friendship cookies fairly.' },
  { id: 'march', month: 2, name: 'March', title: 'Windy kites', greeting: 'Up, up and away!', points: 'kites',
    map: { from: '#2f9e44', to: '#8ce99a', node: '#fff', edge: '#1b6b2c', text: '#0a2410' },
    foods: { pizza: 'picnic pie', cake: 'carrot cake', juice: 'lemonade' }, line: 'Help me cut the kite string into equal pieces.' },
  { id: 'april', month: 3, name: 'April', title: 'Rainbow showers', greeting: 'Hello, rainbows!', points: 'raindrops',
    map: { from: '#1098ad', to: '#99e9f2', node: '#fff', edge: '#0b6b7a', text: '#04282e' },
    foods: { pizza: 'rainbow pizza', cake: 'rainbow cake', juice: 'berry juice' }, line: 'Let’s fill the puddle one part at a time.' },
  { id: 'may', month: 4, name: 'May', title: 'Garden bloom', greeting: 'Happy blooming!', points: 'flowers',
    map: { from: '#e8a317', to: '#ffe066', node: '#fff', edge: '#8a5a00', text: '#3b2a00' },
    foods: { pizza: 'garden pizza', cake: 'honey cake', juice: 'honey lemonade' }, line: 'Let’s plant the seeds in equal rows.' },
  { id: 'june', month: 5, name: 'June', title: 'Beach days', greeting: 'Surf’s up!', points: 'shells',
    map: { from: '#0c8599', to: '#ffd8a8', node: '#fff', edge: '#0b5f6e', text: '#000' },
    foods: { pizza: 'watermelon', cake: 'ice cream cake', juice: 'coconut water' }, line: 'Help me share the watermelon fairly.' },
  { id: 'july', month: 6, name: 'July', title: 'Campfire nights', greeting: 'Happy camping!', points: 'marshmallows',
    map: { from: '#1b2a4a', to: '#3b5bdb', node: '#ffd43b', edge: '#f08c00' },
    foods: { pizza: 'campfire pizza', cake: 's’mores cake', juice: 'lemonade' }, line: 'Let’s count the stars over the tent.' },
  { id: 'august', month: 7, name: 'August', title: 'Under the sea', greeting: 'Dive in!', points: 'starfish',
    map: { from: '#1864ab', to: '#4dabf7', node: '#fff', edge: '#0b3d6b' },
    foods: { pizza: 'sand dollar cookie', cake: 'ocean cake', juice: 'sea-blue juice' }, line: 'Help the fish swim in equal groups.' },
  { id: 'september', month: 8, name: 'September', title: 'Apple harvest', greeting: 'Happy apple days!', points: 'apples',
    map: { from: '#c92a2a', to: '#8ce99a', node: '#fff', edge: '#7a1515' },
    foods: { pizza: 'apple pie', cake: 'apple cake', juice: 'apple juice' }, line: 'Let’s share the apple slices fairly.' },
  { id: 'november', month: 10, name: 'November', title: 'Falling leaves', greeting: 'Happy autumn!', points: 'acorns',
    map: { from: '#a0522d', to: '#f59f00', node: '#fff', edge: '#6b3a1a' },
    foods: { pizza: 'sweet potato pie', cake: 'maple cake', juice: 'warm cider' }, line: 'Let’s rake the leaves into equal piles.' },
];
