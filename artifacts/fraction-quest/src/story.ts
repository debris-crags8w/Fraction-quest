/* Story quest: every unit is a chapter where Numi and Hoot help a friend with a fraction problem.
   The story frames a lesson (a short comic before it, a thank-you after it, a character card when the
   chapter is done). It never changes a question, an answer or what unlocks next. */

export type CharacterId = 'chomp' | 'pip' | 'tilly' | 'bolt' | 'bea';
export type Speaker = CharacterId | 'numi' | 'hoot';
export type Panel = { speaker: Speaker; text: string };
export type Chapter = {
  unit: number;
  title: string;
  character: CharacterId;
  /** The comic before the chapter's first lesson. */
  intro: [Panel, Panel, Panel];
  /** What the friend says before each later lesson in the chapter. */
  again: string;
  /** Short lines the friend says on questions (scene setting only, never a hint). */
  asks: string[];
  /** After a lesson in the chapter. */
  thanks: string;
  /** After the last lesson in the chapter, with the card it unlocks. */
  done: string;
  card: { title: string; blurb: string };
};

export const CHARACTERS: Record<Speaker, { name: string; kind: string }> = {
  numi: { name: 'Numi', kind: 'the living fraction' },
  hoot: { name: 'Hoot', kind: 'the fix-it owl' },
  chomp: { name: 'Chomp', kind: 'a crocodile who loves big pieces' },
  pip: { name: 'Pip', kind: 'a frog who loves to hop' },
  tilly: { name: 'Tilly', kind: 'a slow and steady turtle' },
  bolt: { name: 'Bolt', kind: 'a robot who builds things' },
  bea: { name: 'Bea', kind: 'a busy honeybee' },
};

const say = (speaker: Speaker, text: string): Panel => ({ speaker, text });

export const CHAPTERS: Chapter[] = [
  { unit: 1, title: 'The bakery mix-up', character: 'chomp',
    intro: [say('chomp', 'I cut the cake for all 4 of us. The big piece is mine!'), say('numi', 'Wait! Those pieces are not the same size. That’s not fair.'), say('hoot', 'Fair shares are equal parts. Can you help us fix the cake?')],
    again: 'I have more cakes to cut. Will you check them for me?',
    asks: ['Show me how it’s done!', 'Okay, okay. I’m watching this time.', 'No sneaky big pieces. Promise!'],
    thanks: 'Okay, okay. Equal parts are fair!', done: 'Sorry I took the big piece. Fair shares for everyone from now on!',
    card: { title: 'Chomp the sneaky sharer', blurb: 'Loves the biggest piece. Now he knows fair shares are equal parts.' } },
  { unit: 2, title: 'Pip’s snack party', character: 'pip',
    intro: [say('pip', 'My party friends are here and I have a big bowl of berries!'), say('numi', 'Let’s make equal groups so everyone gets the same.'), say('hoot', 'A fraction can name part of a group too.')],
    again: 'More friends just hopped in. Can you help me share again?',
    asks: ['Ribbit! Help me with this one.', 'Every friend should get the same.', 'Party snacks need fair groups!'],
    thanks: 'Ribbit! Everyone got a fair share.', done: 'Best party ever! Every group was fair.',
    card: { title: 'Pip the party host', blurb: 'Shares snacks in equal groups so every guest gets the same.' } },
  { unit: 3, title: 'Tilly’s halfway hill', character: 'tilly',
    intro: [say('tilly', 'I’m climbing the hill slowly. Am I halfway yet?'), say('numi', 'Let’s compare with 0, one half and 1.'), say('hoot', 'Landmarks help us tell how big a fraction is.')],
    again: 'I climbed a bit more. Where am I now?',
    asks: ['Slow and steady. Help me check.', 'Let’s look at the landmarks.', 'I like to think before I move.'],
    thanks: 'Thank you! Now I know where I am.', done: 'I made it to the top, one landmark at a time!',
    card: { title: 'Tilly the steady climber', blurb: 'Checks 0, one half and 1 to know how far she has come.' } },
  { unit: 4, title: 'The big pond jump', character: 'pip',
    intro: [say('pip', 'I want to hop all the way to the far lily pad!'), say('numi', 'Let’s split the line into equal jumps.'), say('hoot', 'On a number line every jump is the same size.')],
    again: 'The pond is bigger today. Can you plan my hops?',
    asks: ['Ribbit! Help me plan this one.', 'Equal jumps only. Ready, set, hop!', 'Help me count my hops.'],
    thanks: 'Ribbit! I landed right on the pad.', done: 'I hopped past one whole and back. What a jump!',
    card: { title: 'Pip the jump champion', blurb: 'Hops in equal jumps and lands right where he plans.' } },
  { unit: 5, title: 'Chomp’s tower of treats', character: 'chomp',
    intro: [say('chomp', 'My tower of treats keeps falling over!'), say('numi', 'The biggest treats go at the bottom. Let’s compare them.'), say('hoot', 'Equal-size pieces make comparing easier.')],
    again: 'I have more treats to stack. Which goes where?',
    asks: ['Let’s compare carefully.', 'Don’t let my tower wobble.', 'Help me sort my treats.'],
    thanks: 'My tower stands tall now!', done: 'Biggest at the bottom. My tower will never fall again!',
    card: { title: 'Chomp the tower builder', blurb: 'Compares before he stacks so his tower never wobbles.' } },
  { unit: 6, title: 'Bea’s honey jars', character: 'bea',
    intro: [say('bea', 'Buzz! My honey jars have different labels but look the same.'), say('numi', 'Different names can mean the same amount.'), say('hoot', 'Equivalent fractions name the same size.')],
    again: 'More jars came in from the hive. Can you match them?',
    asks: ['Buzz! Help me with this jar.', 'Same honey, new label?', 'Help me sort my jars.'],
    thanks: 'Buzz buzz! The labels make sense now.', done: 'Every jar has its matching name. Sweet!',
    card: { title: 'Bea the honey helper', blurb: 'Knows that 1/2 and 2/4 fill a jar the same amount.' } },
  { unit: 7, title: 'Bolt builds a whole', character: 'bolt',
    intro: [say('bolt', 'Beep! I need parts that make exactly one whole.'), say('numi', 'Let’s put the pieces together.'), say('hoot', 'Fractions can join to make one whole, and even more.')],
    again: 'Beep boop. I have a new build. Can you help?',
    asks: ['Beep! Will these parts fit?', 'Computing… I need your help.', 'Part by part. Let’s build.'],
    thanks: 'Beep! The parts fit together.', done: 'Build complete. One whole and more!',
    card: { title: 'Bolt the builder bot', blurb: 'Joins fraction parts to build wholes and more.' } },
  { unit: 8, title: 'The honey market', character: 'bea',
    intro: [say('bea', 'Buzz! At my market people buy tenths and hundredths of a jar.'), say('numi', 'Let’s add and take away to fill every order.'), say('hoot', 'Tenths and hundredths are fractions with special names.')],
    again: 'A new customer just landed. Can you help with the order?',
    asks: ['Buzz! How much honey is that?', 'My customers are waiting.', 'Let’s fill this order.'],
    thanks: 'Buzz! That order is just right.', done: 'Every order filled. Best market day ever!',
    card: { title: 'Bea the market keeper', blurb: 'Adds, takes away and measures honey in tenths and hundredths.' } },
  { unit: 9, title: 'Tilly’s race map', character: 'tilly',
    intro: [say('tilly', 'My race map uses different fraction names for the same spots.'), say('numi', 'Let’s rename them so we can compare.'), say('hoot', 'Renaming a fraction does not change its size.')],
    again: 'I found another spot on my map. Can you read it?',
    asks: ['Which spot comes first?', 'Slow and steady. Let’s compare.', 'Can we rename this one?'],
    thanks: 'Now my map makes sense!', done: 'I read the whole map. Ready to race!',
    card: { title: 'Tilly the map reader', blurb: 'Renames fractions to compare spots on her race map.' } },
  { unit: 10, title: 'Chomp’s picnic', character: 'chomp',
    intro: [say('chomp', 'I packed 2 and a half sandwiches. Is that enough for everyone?'), say('numi', 'Let’s add and take away mixed numbers.'), say('hoot', 'Mixed numbers have wholes and a fraction part.')],
    again: 'More friends are coming to my picnic. Help me plan!',
    asks: ['Help me plan my picnic.', 'I want to share fairly this time.', 'Let’s work it out together.'],
    thanks: 'Yum! My picnic is planned.', done: 'Enough food for everyone. What a picnic!',
    card: { title: 'Chomp the picnic planner', blurb: 'Adds mixed numbers so there is enough for every guest.' } },
  { unit: 11, title: 'Bolt’s copy machine', character: 'bolt',
    intro: [say('bolt', 'Beep! My machine makes things bigger or smaller by a fraction.'), say('numi', 'Let’s multiply and divide to see what comes out.'), say('hoot', 'Multiplying by a fraction less than 1 makes things smaller.')],
    again: 'Beep. New setting on my machine. What will happen?',
    asks: ['Beep! Let’s test my machine.', 'Let’s find out together.', 'Computing… your turn.'],
    thanks: 'Beep! My machine works perfectly.', done: 'Every setting tested. Machine complete!',
    card: { title: 'Bolt the scaling bot', blurb: 'Knows how multiplying by a fraction changes size.' } },
  { unit: 12, title: 'Pip’s measuring day', character: 'pip',
    intro: [say('pip', 'I want to measure every hop with my ruler!'), say('numi', 'Let’s use fractions of an inch.'), say('hoot', 'Rulers and line plots use fractions too.')],
    again: 'I hopped again. Can you measure it?',
    asks: ['Ribbit! Let’s measure.', 'Help me read my ruler.', 'Measure carefully with me.'],
    thanks: 'Ribbit! Now I know my hop length.', done: 'Every hop measured and plotted!',
    card: { title: 'Pip the measurer', blurb: 'Measures hops with a ruler and plots them on a line plot.' } },
  { unit: 13, title: 'Bea’s garden', character: 'bea',
    intro: [say('bea', 'Buzz! I need to split my garden into fair plots.'), say('numi', 'Let’s find the fraction of each area.'), say('hoot', 'Equal areas can have different shapes.')],
    again: 'A new patch of flowers is ready. Can you split it?',
    asks: ['Buzz! Help me plan this one.', 'My flowers need equal space.', 'Let’s plan the garden.'],
    thanks: 'Buzz! My garden is fair.', done: 'Every flower has its own fair plot!',
    card: { title: 'Bea the gardener', blurb: 'Splits her garden into fair areas, whatever the shape.' } },
  { unit: 14, title: 'Bolt’s number screen', character: 'bolt',
    intro: [say('bolt', 'Beep! My screen shows decimals and percents. I am confused.'), say('numi', 'Let’s match them to fractions.'), say('hoot', 'Decimals, fractions and percents can name the same amount.')],
    again: 'Beep. New numbers on my screen. Can you read them?',
    asks: ['Beep! What does my screen say?', 'Let’s read these numbers.', 'Computing… help me match.'],
    thanks: 'Beep! My screen makes sense now.', done: 'Every number matched. Screen fixed!',
    card: { title: 'Bolt the decimal bot', blurb: 'Matches decimals and percents to their fractions.' } },
  { unit: 15, title: 'Chomp’s riddles', character: 'chomp',
    intro: [say('chomp', 'I made fraction riddles. Bet you can’t solve them!'), say('numi', 'Let’s think step by step.'), say('hoot', 'Check each step. Mistakes help us learn.')],
    again: 'Here’s a trickier riddle. Ready?',
    asks: ['Can you solve my riddle?', 'Check each step!', 'Think it through with me.'],
    thanks: 'You solved it! Okay, okay, you’re good.', done: 'You solved every riddle. You’re a fraction champion!',
    card: { title: 'Chomp the riddle maker', blurb: 'Makes tricky fraction riddles and loves when you solve them.' } },
];

export const chapterFor = (unit: number): Chapter | undefined => CHAPTERS.find((chapter) => chapter.unit === unit);

/** The comic before a lesson: the chapter intro for its first lesson, otherwise the friend, the lesson and its idea. */
export function lessonComic(chapter: Chapter, lesson: { title: string; skill: string }, firstInChapter: boolean): Panel[] {
  if (firstInChapter) return chapter.intro;
  return [say(chapter.character, chapter.again), say('numi', `Let’s help! Today’s lesson is ${lesson.title.charAt(0).toLowerCase()}${lesson.title.slice(1)}.`), say('hoot', lesson.skill)];
}

/** The friend's line on a question: picked by the question id so it stays the same on a re-render. */
export function storyAsk(chapter: Chapter, questionId: string): string {
  let hash = 0;
  for (const char of questionId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return chapter.asks[hash % chapter.asks.length];
}
