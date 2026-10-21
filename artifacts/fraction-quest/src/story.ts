/* The Whole Stone: one story across all 15 units. A week before the Fraction Festival the Whole Stone
   cracks into 15 equal pieces. Each chapter (unit) returns one piece and one clue to "who cracked it?".
   Act 1 points at Chomp; chapter 8 reveals he was protecting Bolt; Act 3 puts the stone back together.
   The story frames lessons only: it never changes a question, an answer or what unlocks next. */

export type CharacterId = 'chomp' | 'pip' | 'tilly' | 'bolt' | 'bea';
export type Speaker = CharacterId | 'numi' | 'hoot';
export type Panel = { speaker: Speaker; text: string; /** The face to draw (else worried when the line sounds like trouble). */ mood?: 'happy' | 'worried' };
export type StoryChoice = { label: string; detail: string; reply: Panel };
export type Chapter = {
  unit: number;
  title: string;
  character: CharacterId;
  /** The comic before the chapter's first lesson. */
  intro: [Panel, Panel, Panel];
  /** A small choice when the chapter opens. It changes the next line, never the math. */
  choice: [StoryChoice, StoryChoice];
  /** What the friend says before each later lesson (lessons 2, 3, …). */
  scenes: string[];
  /** The cliffhanger after each lesson except the last (lessons 1, 2, …). */
  cliffs: string[];
  /** The cliffhanger after the chapter's last lesson: it points to the next chapter. */
  cliff: string;
  /** The clue this chapter adds to the notebook. */
  clue: string;
  /** Short lines the friend says on questions (scene setting only, never a hint). */
  asks: string[];
  /** After a lesson that does not finish the chapter. */
  thanks: string;
  /** After the chapter's last lesson, with the card it unlocks. */
  done: string;
  card: { title: string; blurb: string };
};

export const STONE_PIECES = 15;

/** Seasonal props: story text names its treats with blanks ("the festival {cake}") and the theme showing now
   fills them, so a Halloween lesson has pumpkin pies and candy, and a Christmas one gingerbread and candy canes. Only nouns change: never a number or answer. */
export type PropTheme = 'everyday' | 'halloween' | 'christmas';
export const PROPS: Record<PropTheme, Record<string, string>> = {
  everyday: { cake: 'cake', cakes: 'cakes', pie: 'pie', cookies: 'cookies', bar: 'snack bar', bars: 'snack bars', snack: 'snack', snacks: 'snacks', drink: 'lemonade', plant: 'sunflower' },
  halloween: { cake: 'pumpkin pie', cakes: 'pumpkin pies', pie: 'pumpkin pie', cookies: 'bat cookies', bar: 'candy bar', bars: 'candy bars', snack: 'candy', snacks: 'candies', drink: 'pumpkin juice', plant: 'corn stalk' },
  christmas: { cake: 'Christmas cake', cakes: 'Christmas cakes', pie: 'cherry pie', cookies: 'gingerbread cookies', bar: 'peppermint bar', bars: 'peppermint bars', snack: 'candy cane', snacks: 'candy canes', drink: 'hot cocoa', plant: 'holly bush' },
};
export const propTheme = (seasonId: string | null | undefined): PropTheme => (seasonId && seasonId in PROPS ? seasonId as PropTheme : 'everyday');

/** Fill a story line: the child's name ("{name}, we need you!") and the season's props ("{cake}"). */
export function withName(text: string, name: string | null | undefined, theme: PropTheme = 'everyday'): string {
  const filled = text
    .replace(/\{(\w+)\}/g, (token, key: string) => key === 'name' ? token : PROPS[theme][key] ?? token)
    .split('{name}').join(name?.trim() || 'friend');
  // Without a name, a line that opens with it still starts with a capital: "Friend, we need you!"
  return filled.startsWith('friend') ? `F${filled.slice(1)}` : filled;
}

export const CHARACTERS: Record<Speaker, { name: string; kind: string }> = {
  numi: { name: 'Numi', kind: 'the living fraction' },
  hoot: { name: 'Hoot', kind: 'the fix-it owl' },
  chomp: { name: 'Chomp', kind: 'a crocodile who loves big pieces' },
  pip: { name: 'Pip', kind: 'a frog who loves to hop' },
  tilly: { name: 'Tilly', kind: 'a slow and steady turtle' },
  bolt: { name: 'Bolt', kind: 'a robot who builds things' },
  bea: { name: 'Bea', kind: 'a busy honeybee' },
};

/** The comic as read aloud. It says "friend", never the child's name: the name stays on this device, and every
   line plays straight from the pre-made voice pack. */
/** The filmed comics' scenes (story-cinema.tsx): the prologue, chapter openings, chapter endings and finale. */
export type StoryScene = 'prologue' | 'bakery' | 'pond' | 'hill' | 'bridge' | 'tower' | 'honey' | 'workshop' | 'den' | 'race' | 'picnic' | 'machine' | 'stage' | 'garden' | 'lock' | 'festival' | 'chapter-end' | 'epilogue';
export const CHAPTER_SCENES: Record<number, StoryScene> = {
  1: 'bakery', 2: 'pond', 3: 'hill', 4: 'bridge', 5: 'tower', 6: 'honey', 7: 'workshop', 8: 'den', 9: 'race',
  10: 'picnic', 11: 'machine', 12: 'stage', 13: 'garden', 14: 'lock', 15: 'festival',
};

export const storyScript = (panels: Panel[], theme: PropTheme = 'everyday') =>
  panels.map((panel) => `${CHARACTERS[panel.speaker].name} says: ${withName(panel.text, null, theme)}`).join(' ');

const say = (speaker: Speaker, text: string): Panel => ({ speaker, text });
const happySay = (speaker: Speaker, text: string): Panel => ({ speaker, text, mood: 'happy' });
const pick = (label: string, detail: string, speaker: Speaker, reply: string): StoryChoice => ({ label, detail, reply: say(speaker, reply) });

/** The brief setup shown before the first comic, without revealing who cracked the stone. */
export const WHOLE_STONE_OPENING =
  '{name}, the Whole Stone glows in the town square before the Fraction Festival. One night, it cracks into 15 equal pieces that scatter across town. Help Numi find every piece and follow the clues to discover who cracked it.';

/** The comic prologue, shown once after the story setup: who we are, why the stone matters, the crack, the chase. */
export const PROLOGUE: Panel[] = [
  say('numi', 'I’m Numi, and this is Hoot. The Fraction Festival is one week away!'),
  say('hoot', 'The Whole Stone glows in a glass case in the town square. Its light starts the festival.'),
  say('hoot', 'CRACK! It broke into 15 equal pieces. The case snapped shut, and the pieces flew all over town!'),
  say('numi', '{name}, we need you! Each friend in town has a piece. Can you find them all and find out who cracked it?'),
];

/** The ending, after the last chapter: read it again from the Storybook's finale. */
export const EPILOGUE: Panel[] = [
  happySay('hoot', 'Festival night! All 15 pieces are back. Fifteen fifteenths make one whole, and the stone glows again!'),
  happySay('bolt', 'Beep… I am sorry I cracked it. Thank you for helping me fix it.'),
  happySay('chomp', 'Okay, okay. Bolt told the truth. That makes him brave.'),
  happySay('numi', '{name}, you followed every clue. You are the Keeper of the Whole Stone!'),
];

/** A finished chapter's ending, to read again: the friend's thanks, the clue it added, and what happens next. */
export function chapterEnd(chapter: Chapter): Panel[] {
  return [say(chapter.character, chapter.done), say('hoot', `New clue for your notebook: ${chapter.clue}.`), say('numi', chapter.cliff)];
}

export const CHAPTERS: Chapter[] = [
  { unit: 1, title: 'The bakery mix-up', character: 'chomp',
    intro: [say('chomp', 'I cut the festival {cake} for all 4 of us. The big piece is mine!'), say('numi', 'Wait! Those pieces are not the same size. And look, a stone piece is in the crumbs!'), say('hoot', 'Fair shares are equal parts. Fix the {cake}, {name}, and we can dig out the piece.')],
    choice: [pick('Fix the {cake}', 'Help everyone share fairly', 'numi', 'Good plan. A fair {cake} makes everyone happy.'), pick('Look at the crumbs', 'Add a clue to your notebook', 'hoot', 'Crumbs… and big muddy footprints. Interesting.')],
    scenes: ['The baker wrote fractions on the slices, but I can’t read them. Help?', 'Okay, okay. I’ll take just one slice. How big is one slice?', 'This tray {cake} is cut in odd shapes. Are the pieces still fair?'],
    cliffs: ['Under the crumbs the stone piece glows… right next to big muddy footprints.', 'Numi spots more muddy footprints by the back door.', 'The footprints lead out the bakery door… toward the pond.'],
    cliff: 'Splash! Something shiny just fell into Pip’s pond.',
    clue: 'Big muddy footprints in the crumbs',
    asks: ['Show me how it’s done!', 'Okay, okay. I’m watching this time.', 'No sneaky big pieces. Promise!'],
    thanks: 'Okay, okay. Equal parts are fair!', done: 'Fair shares for everyone. But I did not crack that stone!',
    card: { title: 'Chomp the sneaky sharer', blurb: 'Loves the biggest piece. Now he knows fair shares are equal parts.' } },
  { unit: 2, title: 'Pip’s pond party', character: 'pip',
    intro: [say('pip', 'Ribbit! My party guests are here, and a stone piece fell into the {snack} bowl!'), say('numi', 'Let’s cut the {bars} into equal pieces so we can find it.'), say('hoot', 'More equal parts means smaller parts.')],
    choice: [pick('Cut the {bars}', 'Make equal pieces', 'numi', 'Equal pieces coming up!'), pick('Ask the guests', 'Who saw the splash?', 'pip', 'My guests saw a big green tail by the water. Hmm.')],
    scenes: ['Two same-size {cakes}, cut two ways. Three pieces from each. Which plate has more?'],
    cliffs: ['Something under the lily pads blinks at you… then swims away.'],
    cliff: 'Tilly calls from the hill: “Something is shining up here!”',
    clue: 'A big green tail by the pond',
    asks: ['Ribbit! Help me with this one.', 'Every friend should get the same.', 'Which piece is bigger? Ribbit!'],
    thanks: 'Ribbit! Everyone got a fair share.', done: 'Best party ever! And we found the stone piece!',
    card: { title: 'Pip the party host', blurb: 'Knows that more guests means smaller slices of the same {cake}.' } },
  { unit: 3, title: 'Tilly’s halfway hill', character: 'tilly',
    intro: [say('tilly', 'I saw something shining at the top of the hill. But am I even halfway up?'), say('numi', 'Let’s use benchmarks: 0, one half and 1.'), say('hoot', 'Benchmarks help us tell how big a fraction is.')],
    choice: [pick('Climb with Tilly', 'Use the benchmarks', 'tilly', 'Slow and steady. Thank you for coming with me.'), pick('Look around', 'Search for clues', 'hoot', 'Teeth marks on the trail sign. Big pointy ones.')],
    scenes: ['Let’s check where we are again. I like to be sure.', 'Some parts of the path are bigger than others. Help me save my energy?'],
    cliffs: ['Halfway up, Tilly finds a trail of {cake} crumbs.', 'At the top, the stone piece glows in a bush… and the bridge below is broken!'],
    cliff: 'Down below, Pip can’t get home. The bridge is missing planks!',
    clue: 'Teeth marks on the trail sign',
    asks: ['Slow and steady. Help me check.', 'Let’s look at the benchmarks.', 'I like to think before I move.'],
    thanks: 'Thank you! Now I know where I am.', done: 'I made it to the top! I checked every step.',
    card: { title: 'Tilly the steady climber', blurb: 'Checks 0, one half and 1 to know how far she has come.' } },
  { unit: 4, title: 'The broken bridge', character: 'pip',
    intro: [say('pip', '{name}! Planks are missing on the bridge and I can’t get home!'), say('numi', 'Let’s split the bridge into equal jumps.'), say('hoot', 'On a number line, and on a ruler, every jump is the same size.')],
    choice: [pick('Fix the bridge', 'Help Pip count the planks', 'pip', 'Ribbit! Thank you!'), pick('Study the teeth marks', 'Add a clue to your notebook', 'hoot', 'These marks match the trail sign. Same big teeth.')],
    scenes: ['The planks have numbers now. Where should I land?', 'My house is past the end of the bridge. How far is that?', 'This reed could patch the bridge. How long is it?', 'I found shiny pebbles by the water. Let’s plot their sizes.'],
    cliffs: ['Pip is halfway home… when a shadow runs past with something shiny.', 'The shadow drops a stone piece by the water and runs toward a tall tower.', 'Pip is home. Now he measures things to patch the bridge.', 'Pip’s ruler marks are tiny. Hoot says a line plot can show them all.'],
    cliff: 'Chomp is building a tall tower. Is he hiding something on top?',
    clue: 'Matching teeth marks on the bridge',
    asks: ['Ribbit! Help me plan this one.', 'Equal jumps only. Ready, set, hop!', 'Help me count my hops.'],
    thanks: 'Ribbit! I landed right on the plank.', done: 'I made it home! One equal jump at a time. The bridge still needs new planks, though.',
    card: { title: 'Pip the jump champion', blurb: 'Hops in equal jumps, lands where he plans and measures with a ruler.' } },
  { unit: 5, title: 'Chomp’s tower of treats', character: 'chomp',
    intro: [say('chomp', 'Go away! My tower of treats is private!'), say('numi', 'Your tower keeps wobbling, Chomp. The biggest treats go at the bottom.'), say('hoot', 'Equal-size pieces make comparing easier.')],
    choice: [pick('Help fix the tower', 'Compare the treats', 'chomp', 'Fine. But don’t touch my {snacks}.'), pick('Peek at the top', 'What is Chomp hiding?', 'numi', 'A stone piece glows at the very top. Chomp looks nervous.')],
    scenes: ['Help me put them all in order so my tower stands tall.'],
    cliffs: ['The tower stands… and Chomp quickly hides a pair of shiny boots behind it. “Nobody can look in my den. Nobody!”'],
    cliff: 'Bea needs help at the honey shop. Someone left a strange map there.',
    clue: 'Chomp hid shiny boots behind his tower',
    asks: ['Let’s compare carefully.', 'Don’t let my tower wobble.', 'Help me sort my treats.'],
    thanks: 'My tower stands tall now!', done: 'Here’s your stone piece. Now please don’t look in my den.',
    card: { title: 'Chomp the tower builder', blurb: 'Compares before he stacks so his tower never wobbles.' } },
  { unit: 6, title: 'Bea’s honey jars', character: 'bea',
    intro: [say('bea', 'Buzz! My honey jars have different labels but look the same. And someone left a map!'), say('numi', 'Different names can mean the same amount.'), say('hoot', 'Equivalent fractions name the same size.')],
    choice: [pick('Sort the jars', 'Match the labels', 'bea', 'Buzz! Thank you!'), pick('Read the map', 'Add a clue to your notebook', 'hoot', 'The map shows Bolt’s workshop. It’s in Chomp’s writing!')],
    scenes: ['My honey shelf has marks like a number line. Two marks share one spot!', 'A new jar came from the hive. Can you make a label that matches?', 'This label has a missing number. Can you fill it in?'],
    cliffs: ['One jar hums with a golden glow. A stone piece is inside!', 'Bea lines up her jars on the shelf. One still has no label.', 'Bea whispers: “Chomp bought lots of honey… for a friend who was sad.”'],
    cliff: 'The map leads to Bolt’s workshop. Why would Chomp draw that?',
    clue: 'A map to Bolt’s workshop in Chomp’s writing',
    asks: ['Buzz! Help me with this jar.', 'Same honey, new label?', 'Help me sort my jars.'],
    thanks: 'Buzz buzz! The labels make sense now.', done: 'Every jar has its match. Here, take the stone piece!',
    card: { title: 'Bea the honey helper', blurb: 'Knows that 1/2 and 2/4 fill a jar the same amount.' } },
  { unit: 7, title: 'Bolt’s workshop', character: 'bolt',
    intro: [say('bolt', 'Beep! I need parts that make exactly one whole. Please do not look in my box.'), say('numi', 'Let’s put the parts together.'), say('hoot', 'Fractions can join to make one whole, and even more.')],
    choice: [pick('Build with Bolt', 'Join the parts', 'bolt', 'Beep boop. Thank you.'), pick('Peek in the box', 'Search for clues', 'numi', 'A stone piece is in Bolt’s parts box! His lights flicker.')],
    scenes: ['Beep. Can you split this whole into smaller parts?', 'Beep! Is this wire a whole number of meters?', 'Now I have more than one whole. Computing… help!', 'Beep. Can we write it as wholes and a part?'],
    cliffs: ['Bolt says the stone piece “just rolled in.” His lights blink red.', 'Bolt keeps looking at an empty shelf labeled “rocket boots.”', 'Bolt hums a nervous tune and slides his box under the bench.', 'Bolt beeps quietly: “Chomp has my… never mind.”'],
    cliff: 'Chomp’s den door is open. Now’s your chance to look inside.',
    clue: 'Bolt’s rocket boots are missing',
    asks: ['Beep! Will these parts fit?', 'Computing… I need your help.', 'Part by part. Let’s build.'],
    thanks: 'Beep! The parts fit together.', done: 'Build complete. Here is the stone piece. Beep… sorry I was nervous.',
    card: { title: 'Bolt the builder bot', blurb: 'Joins fraction parts to build wholes and more.' } },
  { unit: 8, title: 'The secret in the den', character: 'chomp',
    intro: [say('chomp', 'Okay, okay. You found Bolt’s rocket boots. I didn’t crack the stone.'), say('chomp', 'The boots bumped it. Bolt was so scared. I hid them so nobody would blame him.'), say('numi', 'You took the blame to protect your friend, Chomp?')],
    choice: [pick('Thank Chomp', 'That was kind', 'chomp', 'Friends look out for friends.'), pick('Ask Chomp to join', 'Find the rest together', 'chomp', 'Yes! Let’s find the rest together.')],
    scenes: ['Now take some away. How much is left in my {snack} jar?', 'I have whole jars and part of a jar. Let’s add them up!', 'I ate some of my jars. Okay, okay. How much is left?', 'Bolt says robots count in tenths. Show me!', 'Hundredths? That’s tiny! Let’s try.', 'Bolt’s boot meter shows a fraction. Can we write it as a decimal?', 'Bolt’s screen shows two decimals. Which is bigger?', 'Bolt’s battery screen is a grid of hundredths. Let’s count the squares.', 'Let’s add tenths and hundredths to fix Bolt’s boots.', 'I eat the same small piece of {pie} every day. How much after a few days?', 'Each friend gets part of a sandwich. How much in all?'],
    cliffs: ['Chomp opens a jar. Inside is a stone piece he was keeping safe!', 'Chomp: “I was saving it to give back. I promise.”', 'Chomp lines up his jars. “Bolt built me this shelf. He’s my friend.”', 'Bolt’s boots need fixing before he can say sorry.', 'Bolt’s screen flashes: “Fixing boots…”', 'The boot meter flickers. It needs a closer look.', 'One boot charges up. The other is still slow.', 'Bolt is almost ready… but still too scared to talk.', 'Bolt’s screen glows: “Battery check done.”', 'The boots whir back to life!', 'Chomp: “Now let’s finish the job. Together.”'],
    cliff: 'Tilly has a race map with three routes. One leads to a stone piece!',
    clue: 'Chomp hid the boots to protect Bolt',
    asks: ['Let’s count it up together.', 'My {snack} jar needs your help.', 'Team Chomp is on it!'],
    thanks: 'We make a good team!', done: 'I’m on your team now. Mystery half solved!',
    card: { title: 'Chomp the loyal friend', blurb: 'Took the blame to protect a friend. Now he helps everyone.' } },
  { unit: 9, title: 'Tilly’s race map', character: 'tilly',
    intro: [say('tilly', 'My race map uses different names for the same spots. One route has a stone piece!'), say('numi', 'Let’s rename the spots so we can compare.'), say('hoot', 'Renaming a fraction does not change its size.')],
    choice: [pick('Read the map', 'Rename the spots', 'tilly', 'Thank you. I like to be sure.'), pick('Ask Chomp', 'He knows shortcuts', 'chomp', 'Take the middle route. Trust me, I’m on your team now!')],
    scenes: ['Two numbers are missing on this sign. Can you find both?', 'Two routes have different names. Let’s compare them.', 'Help me put all the routes in order.', 'My map pins come in different lengths. What does the line plot say?', 'Racers need water. How much is in my jug?'],
    cliffs: ['The middle route sparkles in the sun.', 'Someone is following the team, very quietly.', 'Halfway along, Tilly finds a robot bolt on the path.', 'Tilly stops for a sip. A twig snaps behind a tree.', 'Squeak! Rocket boots behind the tree. Bolt is hiding.'],
    cliff: 'At the picnic spot, Bolt runs off before anyone can say hi.',
    clue: 'Bolt is following the team',
    asks: ['Which spot comes first?', 'Slow and steady. Let’s compare.', 'Can we rename this one?'],
    thanks: 'Now my map makes sense!', done: 'I read the whole map! And I trusted my checking.',
    card: { title: 'Tilly the map reader', blurb: 'Renames fractions to compare spots on her race map.' } },
  { unit: 10, title: 'The team picnic', character: 'chomp',
    intro: [say('chomp', 'I packed sandwiches for the whole team. Is it enough?'), say('numi', 'Let’s add and take away to plan the picnic.'), say('hoot', 'To add different-size parts, make them the same size first.')],
    choice: [pick('Plan the food', 'Count the sandwiches', 'chomp', 'Yum. Let’s do it right.'), pick('Save a spot for Bolt', 'Maybe he’ll come', 'numi', 'We saved a sandwich for Bolt. He’s watching from the bushes.')],
    scenes: ['Pip brought {pie} cut a different way. Can we add it all?', 'I ate some. Oops. How much is left?', 'Mixing everything is tricky. Let’s work it out.', 'Quick! About how much food is left? Close is fine.'],
    cliffs: ['A stone piece is hidden in the picnic basket!', 'Bolt peeks out, then hides again. His sandwich is gone!', 'A note in the basket: “Thank you. I am sorry. — B”', 'Bolt’s boots leave tiny sparks on the path.'],
    cliff: 'The sparks lead to Bolt’s workshop. A big machine is humming.',
    clue: 'A sorry note from Bolt',
    asks: ['Help me plan my picnic.', 'I want to share fairly this time.', 'Let’s work it out together.'],
    thanks: 'Yum! My picnic is planned.', done: 'Enough food for the whole team. Best picnic ever!',
    card: { title: 'Chomp the picnic planner', blurb: 'Makes the parts match before adding, so there is enough for every guest.' } },
  { unit: 11, title: 'Bolt owns up', character: 'bolt',
    intro: [say('bolt', 'Beep… my rocket boots cracked the Whole Stone. I am very sorry.'), say('numi', 'Thank you for telling us, Bolt. That was brave.'), say('hoot', 'Let’s fix it together. Bolt’s machine makes things bigger or smaller.')],
    choice: [pick('Forgive Bolt', 'Everyone makes mistakes', 'bolt', 'Beep! Thank you, friend.'), pick('Fix the bridge', 'Use the machine', 'bolt', 'Setting machine to rebuild mode.')],
    scenes: ['Some bolts already went into the machine. How many is that?', 'The machine wants part of my nut pile. How many is that?', 'My machine picks part of the parts. How much is that?', 'My machine cuts a square into rows and columns. Where do they overlap?', 'My machine needs part of my bolt box. How many is that?', 'How many small pieces fit in this big one?', 'Will this setting make it bigger or smaller?', 'Before it runs, let’s check: bigger, smaller or the same?', 'Split this small part into equal shares.', 'Some jobs share. Some jobs fit pieces. Which is which?'],
    cliffs: ['Bolt’s bolts sit in equal groups. The machine hums awake!', 'The machine blinks: “Feed me a fraction.”', 'The machine prints a new bridge plank. Pip cheers!', 'A stone piece pops out of the machine’s tray!', 'The machine draws a grid and hums a happy tune.', 'The bridge is fixed for good.', 'Bea calls: the festival stage is the wrong size!', 'Bolt sizes the stage parts just right.', 'Bolt checks every dial twice. No more mistakes.', 'One more job before the machine can rest.'],
    cliff: 'Pip needs help measuring the festival stage.',
    clue: 'Bolt told the truth',
    asks: ['Beep! Let’s test my machine.', 'Let’s find out together.', 'Computing… your turn.'],
    thanks: 'Beep! My machine works.', done: 'Mystery solved! I’m sorry, and I’m glad we’re a team.',
    card: { title: 'Bolt the brave bot', blurb: 'Owned up to a big mistake and helped fix it.' } },
  { unit: 12, title: 'Pip measures the stage', character: 'pip',
    intro: [say('pip', 'The festival stage needs measuring, and I have my measuring tape!'), say('numi', 'Let’s find fractions of each length.'), say('hoot', 'Lengths, line plots and fair shares all use fractions.')],
    choice: [pick('Measure the stage', 'Grab the measuring tape', 'pip', 'Ribbit! Ready.'), pick('Measure hops', 'Pip wants to practice', 'pip', 'Every hop counts!')],
    scenes: ['Two boards go end to end. How long together?', 'Let’s even out the cups so they match.', 'Pounds and ounces are mixed up. Help?', 'Let’s share the ribbon fairly for the stage.', 'Split the {cookies} for the stage crew.'],
    cliffs: ['Under the stage floor, something glows.', 'It’s a stone piece, stuck in a crack!', 'Pip wiggles the stone piece free!', 'Chomp and Bolt carry boards together.', 'The stage lights flicker on.'],
    cliff: 'Bea’s festival garden needs fair plots before tomorrow.',
    clue: 'The festival stage is ready',
    asks: ['Ribbit! Let’s measure.', 'Help me check my measuring.', 'Measure carefully with me.'],
    thanks: 'Ribbit! Measured just right.', done: 'Every board measured. Best stage ever!',
    card: { title: 'Pip the measurer', blurb: 'Measures lengths, changes units and shares them fairly.' } },
  { unit: 13, title: 'Bea’s festival garden', character: 'bea',
    intro: [say('bea', 'Buzz! The festival garden needs fair plots, and a stone piece is under the flowers!'), say('numi', 'Let’s find the area of each plot.'), say('hoot', 'Multiply the side lengths to find a plot’s area.')],
    choice: [pick('Plan the garden', 'Make fair plots', 'bea', 'Buzz! A fair garden for all.'), pick('Dig for the piece', 'Find it first', 'chomp', 'I’ll dig gently. Promise!')],
    scenes: ['These plots have fraction sides. How big are they?', 'This flower bed has mixed-number sides. How big is it?', 'Let’s make festival {drink} with the recipe.'],
    cliffs: ['A bee lands on one flower. The stone piece is right below!', 'Chomp digs gently. Got it!', 'The garden looks fair. Bolt looks at the glass case. It snapped shut when the stone cracked.'],
    cliff: 'To put the pieces back, the team must open the glass case. Its lock has a number code.',
    clue: 'The stone’s case is locked',
    asks: ['Buzz! Help me plan this one.', 'My flowers need equal space.', 'Let’s plan the garden.'],
    thanks: 'Buzz! My garden is fair.', done: 'A fair garden for everyone. Buzz buzz!',
    card: { title: 'Bea the gardener', blurb: 'Finds the area of every plot, even with fraction sides.' } },
  { unit: 14, title: 'The lock code', character: 'bolt',
    intro: [say('bolt', 'Beep! The pieces go back in the glass case, but it is locked. The code uses percents.'), say('numi', 'Let’s match them to fractions.'), say('hoot', 'Percent means out of 100. A percent and a fraction can name the same amount.')],
    choice: [pick('Crack the code', 'Help Bolt', 'bolt', 'Computing… with you.'), pick('Read the clues', 'Check your notebook', 'hoot', 'Every clue we found helps here.')],
    scenes: ['The next dial uses a percent. What fraction is that?', 'The last part is a story puzzle. Step by step.'],
    cliffs: ['Click! The first dial turns.', 'Click! The case starts to glow.'],
    cliff: 'The case opens… but one piece is missing! Chomp grins: “Solve my riddles first!”',
    clue: 'The case is open',
    asks: ['Beep! What does my screen say?', 'Let’s read these numbers.', 'Computing… help me match.'],
    thanks: 'Beep! The dial turned.', done: 'Code cracked! Now for the last piece.',
    card: { title: 'Bolt the code cracker', blurb: 'Matches percents to their fractions and solves story codes.' } },
  { unit: 15, title: 'The Fraction Festival', character: 'chomp',
    intro: [say('chomp', 'I hid the last piece somewhere safe. Solve my riddles to find it!'), say('numi', 'It’s festival night, everyone. Let’s do this!'), say('hoot', 'Check each step. Mistakes help us learn.')],
    choice: [pick('Solve the riddles', 'We can do it', 'chomp', 'Ha! Let’s see.'), pick('Gather the team', 'Everyone helps', 'numi', 'Tilly, Pip, Bea and Bolt are all here.')],
    scenes: ['My riddle has a mistake in it. Can you spot it?', 'Part is eaten, then part of the rest. What’s left?', 'The last riddle. The trickiest one. Ready?'],
    cliffs: ['Riddle solved! Chomp points to the stage.', 'Another riddle solved! The crowd gathers.', 'One riddle left. The stone hums.'],
    cliff: 'The Whole Stone glows whole again. Happy Fraction Festival!',
    clue: 'Chomp kept the last piece safe for the festival',
    asks: ['Can you solve my riddle?', 'Check each step!', 'Think it through with me.'],
    thanks: 'Ha! You solved it!', done: 'You solved every riddle. The Whole Stone is whole again!',
    card: { title: 'Chomp the riddle maker', blurb: 'Makes tricky fraction riddles and loves when you solve them.' } },
];

export const chapterFor = (unit: number): Chapter | undefined => CHAPTERS.find((chapter) => chapter.unit === unit);

/** The comic before a lesson: the chapter intro for its first lesson, otherwise the friend's scene, the lesson and its idea. */
export function lessonComic(chapter: Chapter, lesson: { title: string; skill: string }, index: number): Panel[] {
  if (index === 0) return chapter.intro;
  const scene = chapter.scenes[index - 1] ?? chapter.scenes[chapter.scenes.length - 1];
  return [say(chapter.character, scene), say('numi', `Let’s help! Today’s lesson is ${lesson.title.charAt(0).toLowerCase()}${lesson.title.slice(1)}.`), say('hoot', lesson.skill)];
}

/** The cliffhanger after lesson `index` of a chapter with `total` lessons. */
export const lessonCliff = (chapter: Chapter, index: number, total: number) =>
  index >= total - 1 ? chapter.cliff : chapter.cliffs[index] ?? chapter.cliff;

/** The friend's line on a question: picked by the question id so it stays the same on a re-render. */
export function storyAsk(chapter: Chapter, questionId: string): string {
  let hash = 0;
  for (const char of questionId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return chapter.asks[hash % chapter.asks.length];
}

/** The chapter friend's reaction after the child checks an answer. Words only: it cheers or encourages, never hints. */
export const REACTIONS: Record<CharacterId, { right: string[]; retry: string[] }> = {
  chomp: { right: ['Chomp chomp! You got it!', 'Grr… fine. That was right.', 'Wow. Even I’m impressed.'], retry: ['Not yet! You can do it.', 'Almost! Have another go.', 'Hmm. Look one more time.'] },
  pip: { right: ['Ribbit! Right on the lily pad!', 'Hop hooray! You got it!', 'That’s a perfect hop!'], retry: ['A little splash! Try again.', 'Almost! Hop back and look again.', 'No worries. Try one more time!'] },
  tilly: { right: ['Slow and steady wins. Yes!', 'You got it. Nice and careful!', 'Right! I knew you could.'], retry: ['Take your time. Try again.', 'No rush. Look once more.', 'Almost there. Step by step!'] },
  bolt: { right: ['Beep beep beep! Correct!', 'Calculating… you got it!', 'System says: awesome!'], retry: ['Beep boop. Try again!', 'No problem. Let’s retry!', 'Rebooting… have another go!'] },
  bea: { right: ['Bzz! Sweet as honey!', 'You got it! Bzz bzz!', 'Buzz-tastic work!'], retry: ['Bzz… not yet. Try again!', 'Buzz back and look again.', 'Almost! One more try.'] },
};
export function storyReaction(character: CharacterId, result: 'correct' | 'retry', key: string): string {
  const lines = REACTIONS[character][result === 'correct' ? 'right' : 'retry'];
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return lines[hash % lines.length];
}

/** A lesson's story problem: its last (checkpoint) question told inside the chapter. The model, the answer and
   every number stay the lesson's own; only the words change, so the math is the same one the lesson checks.
   `setup` is the friend's line before it (words only), `result` is what the answer changes in the story. */
export type StoryProblem = { setup: string; prompt: string; choices?: string[]; result: string };
export const STORY_PROBLEMS: Record<string, StoryProblem> = {
  // Chapter 1 · The bakery mix-up
  'equal-parts': { setup: 'The baker gave me a {cake} to share. I cut it fair this time. Honest!',
    prompt: 'Chomp cut a {cake} into 3 equal pieces. What is 1 piece?',
    result: 'Each friend gets one third of the {cake}. Fair and square!' },
  'fraction-names': { setup: 'The baker frosted one slice for me. What does the label say?',
    prompt: 'The baker cut a {cake} into 8 equal slices. 1 slice is frosted. What fraction is frosted?',
    result: 'The label says 1/8. Now Chomp can read his slice!' },
  'unit-fractions': { setup: 'Okay, okay. Just one piece for me this time.',
    prompt: 'The {cake} has 6 equal pieces. Chomp takes 1 piece. What fraction is that?',
    result: 'Chomp took just 1/6. There is plenty left for everyone!' },
  'fraction-of-area': { setup: 'This tray {cake} is cut in long strips. Are they fair?',
    prompt: 'The baker’s tray {cake} is split into 3 equal-area strips. Color 1. What fraction of the whole is colored?',
    result: '1/3 of the {cake} gets frosting. Fair strips, Chomp!' },
  // Chapter 2 · Pip’s pond party
  'unit-size': { setup: 'Two {bars} the same size! Which piece should the tiny guests get?',
    prompt: 'One {bar} is cut into thirds and one into sixths. Which piece is smaller: 1/3 or 1/6?',
    result: 'The tiny guests get the 1/6 pieces. Just right for little frogs!' },
  'compare-same-numerator': { setup: 'Two treats for the guests. Which piece is bigger?',
    prompt: 'Two {cakes} are the same size. Which piece covers more: 3/8 or 3/6?',
    result: '3/6 covers more, so the hungriest frog gets it. Ribbit!' },
  // Chapter 3 · Tilly’s halfway hill
  'benchmark-half': { setup: 'I packed a drink for the climb. Do I have enough?',
    prompt: 'Tilly’s jug of {drink} is 4/6 full. Is that more or less than half?',
    result: 'More than half a jug! Tilly has plenty of {drink} for the climb.' },
  'benchmarks-zero-one': { setup: 'Look at this tall {plant} by the trail. Is it almost as tall as a meter stick?',
    prompt: 'A {plant} on the hill grew 7/8 of a meter. Is that near 0, 1/2 or 1 meter?',
    result: 'Almost 1 meter! Tilly uses the tall {plant} as a benchmark.' },
  'fraction-magnitude': { setup: 'I climb in little steps. Each one is an eighth of the path.',
    prompt: 'Tilly climbs 1/8 + 1/8 + 1/8 + 1/8 of the path. About how far is that?',
    result: 'About halfway! Tilly stops for a {snack} break.' },
  // Chapter 4 · The broken bridge
  'number-line-basics': { setup: 'The bridge has equal planks. Help me count my hops!',
    prompt: 'The bridge from 0 to 1 has 6 equal planks. Pip hops 5 planks. Where is he?',
    result: 'Pip is at 5/6 of the bridge. Just one plank to go!' },
  'number-line-points': { setup: 'Oops! I dropped my {snack} on the bridge. Where did it land?',
    prompt: 'The bridge has 8 equal spaces. Pip’s {snack} is 5 jumps from 0. What fraction is that?',
    result: 'Found it at 5/8! Pip saves his {snack} for later.' },
  'number-line-beyond-one': { setup: 'My house is past the end of the bridge. Keep counting with me!',
    prompt: 'Pip takes 10 hops of 1/6 each. How far is that?',
    result: 'Pip hopped 10/6, which is 1 and 4/6. He is home!' },
  'ruler-measurement': { setup: 'This reed could patch the bridge. Help me measure it!',
    prompt: 'Pip’s blue reed starts at zero and ends at a tick with no number. Use the ruler. How long is it in inches?',
    result: 'The reed is 1 2/4 inches long. Just right for a frog-size patch!' },
  'build-line-plots': { setup: 'I found shiny pebbles by the bridge. Let’s plot how long they are.',
    prompt: 'Plot the pebbles Pip found: 1/4, 3/4, 3/4, 3/4, 4/4 inch long. How many pebbles are 3/4 inch long?',
    result: '3 pebbles are 3/4 inch long. The line plot shows it!' },
  // Chapter 5 · Chomp’s tower of treats
  'compare-same-denominator': { setup: 'The bigger treat goes at the bottom. Which one is it?',
    prompt: 'Two {bars} are cut into fourths. Which is bigger, 1/4 or 3/4?',
    result: 'The 3/4 piece goes at the bottom. The tower stands tall!' },
  'order-fractions': { setup: 'Smallest on top, biggest at the bottom. Help me stack!',
    prompt: 'Chomp’s tower has 1/2, 3/8 and 7/8 of a {bar}. Put them in order, smallest first.',
    result: 'Smallest on top and biggest at the bottom. The tower is perfect!' },
  // Chapter 6 · Bea’s honey jars
  'equivalent-models': { setup: 'Two labels, same honey? Help me find the match!',
    prompt: 'Bea’s honey jar is 1/3 full. Which label means the same amount?',
    result: '2/6 and 1/3 fill the jar the same. Bea sticks on the new label!' },
  'equivalent-number-line': { setup: 'My honey shelf has marks like a number line. Two marks share one spot!',
    prompt: 'A honey jar sits at 3/4 of Bea’s shelf. Which fraction with a denominator of 8 is at the same spot?',
    result: '3/4 = 6/8. Same spot on the shelf, new name!' },
  'build-equivalents': { setup: 'A new jar came from the hive. Can you make a label that matches?',
    prompt: 'A new jar from the hive is 5/10 full. Which label means the same amount?',
    result: '5/10 is the same as 1/2. The jar gets a one half label!' },
  'missing-equivalent': { setup: 'A label got torn. One number is missing!',
    prompt: 'This label is torn: 4/6 = 2/? Which number is missing?',
    result: '4/6 = 2/3. Bea writes the missing number on the label.' },
  // Chapter 7 · Bolt’s workshop
  'compose-to-one': { setup: 'Beep! My gears need exactly one whole cup of oil.',
    prompt: 'Bolt pours 3/6 cup of oil into a gear, then 3/6 cup more. How much in all?',
    result: '6/6 cup is exactly one whole cup. The gears spin smoothly!' },
  'decompose-fractions': { setup: 'Beep. Can you split this part into two smaller parts?',
    prompt: 'Bolt splits a part into two pieces: 7/10 = 5/10 + what?',
    result: '7/10 = 5/10 + 2/10. Both pieces fit in the robot arm!' },
  'whole-numbers-as-fractions': { setup: 'Beep! Is this wire a whole number of meters?',
    prompt: 'Bolt’s wire is 24/8 meters long. How many whole meters is that?',
    result: '24/8 is 3 whole meters. Bolt winds it onto 3 spools!' },
  'improper-fractions': { setup: 'Computing… one of these rods is longer than a whole.',
    prompt: 'Bolt measures four rods. Which one is more than one whole?',
    result: '9/8 is one whole and one more eighth. That rod is extra long!' },
  'mixed-improper': { setup: 'Beep! I like to write long numbers the short way.',
    prompt: 'Bolt has 10/6 meters of wire. What is that as wholes and a fraction?',
    result: '10/6 is 1 and 4/6. Bolt writes it the short way.' },
  // Chapter 8 · The secret in the den
  'add-like-denominators': { setup: 'Bolt brought more {snacks} for my jar. Let’s add them up!',
    prompt: 'Chomp’s {snack} jar is partly full. Bolt adds more. What is 3/5 + 1/5?',
    result: '3/5 + 1/5 = 4/5. The jar is almost full!' },
  'subtract-like-denominators': { setup: 'Just one small bite from my jar. Okay, okay!',
    prompt: 'Chomp eats a little from his {snack} jar. What is 4/5 − 1/5?',
    result: '4/5 − 1/5 = 3/5. Chomp still has plenty left!' },
  'add-mixed-numbers': { setup: 'I have one full jar and a bit more. Bolt brought extra!',
    prompt: 'Chomp has some jars of {snacks}. Bolt brings more. 1 1/3 + 1/3 = ?',
    result: '1 1/3 + 1/3 = 1 2/3 jars. Chomp’s shelf is filling up!' },
  'subtract-mixed-numbers': { setup: 'I only had a few bites. Okay, okay, maybe more than a few.',
    prompt: 'Chomp had some jars of {snacks}, then ate some. Oops! 2 1/3 − 1 2/3 = ?',
    result: '2 1/3 − 1 2/3 = 2/3 of a jar left. Oops, Chomp!' },
  'tenths-decimals': { setup: 'Robots count in tenths. Which boot has more charge?',
    prompt: 'Bolt’s boots show their charge in tenths. Which is bigger, 0.8 or 5/10?',
    result: '0.8 is 8/10, so that boot has more charge. Beep!' },
  'hundredths-decimals': { setup: 'My boot meter only reads decimals. Help!',
    prompt: 'Bolt’s boot meter needs a decimal. Which decimal equals 9/10?',
    result: '9/10 is 0.9. The meter blinks green!' },
  'decimal-fraction-equivalence': { setup: 'Bolt’s boot meter shows a fraction. Can we write it as a decimal?',
    prompt: 'Bolt’s left boot screen only shows decimals. Write 9/10 as a decimal.',
    result: '9/10 is 0.9. The left boot screen lights up!' },
  'compare-decimals': { setup: 'Bolt’s screen shows two numbers. Which is bigger?',
    prompt: 'Bolt’s boot screen shows two battery readings. Compare: 0.11 __ 0.1.',
    result: '0.11 > 0.1. Bolt picks the stronger battery!' },
  'compare-decimals-grid': { setup: 'Which battery has the most charge? Let’s count hundredths on the grids.',
    prompt: 'Bolt checks his three batteries. Put 0.8, 0.75 and 0.09 in order, biggest first.',
    result: '0.8 > 0.75 > 0.09. Bolt puts the fullest battery in first!' },
  'add-tenths-hundredths': { setup: 'Let’s join two pieces to fix Bolt’s boot strap.',
    prompt: 'One piece of Bolt’s boot strap is 4/10 m. Another is 25/100 m. How long are they together?',
    result: '4/10 is 40/100, so the strap is 65/100 m. The boots are fixed!' },
  'unit-fraction-multiples': { setup: 'I eat the same small piece every day. How much after a few days?',
    prompt: 'Chomp eats the same small piece of {pie} each day. Write 3 × 1/5 as one fraction.',
    result: '3 × 1/5 = 3/5. That is a lot of {pie}, Chomp!' },
  'multiply-whole-by-fraction': { setup: 'Each friend gets part of a sandwich tray. How much in all?',
    prompt: 'Each friend gets the same part of a sandwich tray. 4 × 5/12 = ?',
    result: '4 × 5/12 = 20/12. That is more than one whole tray!' },
  // Chapter 9 · Tilly’s race map
  'simplify-fractions': { setup: 'This spot has a long name. Can we make it simpler?',
    prompt: 'Tilly wants a simpler name for a spot on her map. Write 2/12 in simplest form.',
    result: '2/12 is 1/6. A simpler name for the same spot!' },
  'equivalent-missing-both': { setup: 'Two signs, one spot. A number is missing!',
    prompt: 'Two signs name the same spot. Fill the missing numerator: 1/2 = ?/6.',
    result: '1/2 = 3/6. Both signs point to the same spot!' },
  'compare-unlike-fractions': { setup: 'Two routes have different names. Which one is shorter?',
    prompt: 'Tilly compares two routes. Pick the sign: 2/5 __ 2/3.',
    result: '2/5 < 2/3, so Tilly takes the shorter route!' },
  'order-unlike-fractions': { setup: 'Help me put all the routes in order.',
    prompt: 'Tilly’s routes are 2/3, 1/6 and 5/12 of a mile. Put them in order, smallest first.',
    result: '1/6, then 5/12, then 2/3. Tilly plans every route!' },
  'read-line-plots': { setup: 'My map pins come in different lengths. Let’s read the line plot.',
    prompt: 'Plot the pins on Tilly’s race map: 3/8, 5/8, 6/8, 8/8 inch long. What is the difference between the longest and shortest?',
    result: '8/8 − 3/8 = 5/8 inch. The line plot tells us fast!' },
  'measurement-word-problems': { setup: 'Racers need a drink. How much is in my jug?',
    prompt: 'Tilly’s 2-liter jug of {drink} for the race is 1/4 full. How many milliliters are inside?',
    result: '1/4 of 2 liters is 500 milliliters. Enough for slow and steady sips!' },
  // Chapter 10 · The team picnic
  'add-related-fractions': { setup: 'I packed {pie} cut in thirds and in sixths. How much in all?',
    prompt: 'Chomp packs two pieces of {pie} for the picnic. What is 2/3 + 1/6?',
    result: '2/3 is 4/6, so the basket has 5/6 of a {pie}!' },
  'add-unlike-fractions': { setup: 'Pip’s {pie} is cut a different way. Can we add it all?',
    prompt: 'Pip brought {pie} cut a different way. Rename: 1/2 = 4/8. Then 1/8 + 1/2 = ?',
    result: '1/8 + 4/8 = 5/8 of a {pie}. Yum!' },
  'subtract-unlike-fractions': { setup: 'I packed lots of sandwiches. Some are already gone!',
    prompt: 'The team ate part of Chomp’s sandwich tray. 11/12 − 1/4 = ?',
    result: '1/4 is 3/12, so 8/12 of the tray is left. Plenty!' },
  'mixed-unlike-operations': { setup: 'Mixing everything is tricky. Let’s work it out.',
    prompt: 'Picnic math! Rename: 3/5 = 6/10 and 1/2 = 5/10. Then 2 3/5 − 1 1/2 = ?',
    result: '2 3/5 − 1 1/2 = 1 1/10. That is a sandwich left for Bolt!' },
  'estimate-fraction-operations': { setup: 'Quick! About how much food is left? Close is fine.',
    prompt: 'Is there a whole {pie} left? Without finding the exact sum, compare 1/4 + 1/2 with 1: __ 1.',
    result: '1/4 + 1/2 is less than 1. Not quite a whole {pie} left!' },
  // Chapter 11 · Bolt owns up
  'sets-unit-fractions': { setup: 'My machine needs equal groups of bolts first!',
    prompt: 'Bolt has 20 bolts for his machine. What is 1/5 of the bolts?',
    result: 'Each group has 4 bolts. Beep! Equal groups!' },
  'sets-nonunit': { setup: 'Some bolts already went into the machine!',
    prompt: 'Bolt had 18 bolts. The machine used 3/6 of them. How many did it use?',
    choices: ['6 bolts', '15 bolts', '9 bolts', '3 bolts'],
    result: 'The machine used 9 bolts. Half the box is still left!' },
  'fraction-of-quantity': { setup: 'The machine wants part of my nut pile!',
    prompt: 'Bolt has 40 nuts for his machine. What is 2/10 of the nuts?',
    result: '2/10 of 40 is 8. The machine gobbles 8 nuts. Beep!' },
  'multiply-fractions': { setup: 'My machine picks part of the parts. How much is that?',
    prompt: 'Bolt’s machine takes half of a part. What is 1/2 of 5/12?',
    result: '1/2 of 5/12 is 5/24. The machine prints a tiny part!' },
  'fraction-times-fraction': { setup: 'My machine cuts rows one way and columns the other. Where do they overlap?',
    prompt: 'Bolt’s machine cuts a panel into a grid. 3/5 × 2/3 = ?',
    result: '3/5 × 2/3 = 6/15 of the panel. The machine prints it!' },
  'fraction-of-collection': { setup: 'My machine needs part of my bolt box. How many?',
    prompt: 'Bolt has 60 bolts in a box. What is 3/10 of the bolts?',
    result: '3/10 of 60 is 18 bolts. Just enough for a bridge plank!' },
  'divide-whole-by-unit-fraction': { setup: 'How many small scoops fit in this big tank?',
    prompt: 'Bolt fills his machine with oil. How many 1/8-cup scoops fill 3 cups? 3 ÷ 1/8 = ?',
    result: '24 scoops! Check: 24 × 1/8 = 3 cups.' },
  'multiplication-scaling': { setup: 'Will this setting make it bigger or smaller?',
    prompt: 'Bolt sets his machine. Without multiplying, compare 3/4 × 20 with 20: __ 20.',
    result: '3/4 × 20 is less than 20. The machine made it smaller!' },
  'bigger-or-smaller': { setup: 'Beep. Does multiplying always make things bigger?',
    prompt: 'Bolt says multiplying always makes a number bigger. Is he right?',
    result: 'Not always! A factor less than 1 makes it smaller. Bolt fixes his dial.' },
  'unit-fraction-divided-whole': { setup: 'Split this small part into equal shares.',
    prompt: '2 friends share 1/8 of a pan of {cake}. 1/8 ÷ 2 = ?',
    result: 'Each friend gets 1/16 of the pan. Check: 2 × 1/16 = 1/8.' },
  'share-or-fit': { setup: 'Is this a sharing job or a fitting job?',
    prompt: 'Bolt bags clay for the machine. How many 1/4-pound bags can be filled from 3 pounds of clay?',
    result: '3 ÷ 1/4 = 12 bags. Check: 12 × 1/4 = 3 pounds.' },
  // Chapter 12 · Pip measures the stage
  'fraction-of-length': { setup: 'Let’s use part of my ribbon for the stage.',
    prompt: 'Pip has 36 meters of ribbon for the stage. How long is 5/12 of it?',
    result: '5/12 of 36 is 15 meters. Pip hangs it on the stage!' },
  'fractional-measure-addition': { setup: 'Two boards go end to end. How long together?',
    prompt: 'Two stage boards go end to end. One is 1/2 meter. Another is 3/8 meter. How long are they together?',
    result: '1/2 is 4/8, so together they are 7/8 meter!' },
  'line-plot-leveling': { setup: 'Let’s even out the cups so they match.',
    prompt: 'Three cups of {drink} hold 2/4, 3/4, 5/4 liter. Plot them, then share the total equally. How many liters go in each?',
    result: 'Each cup gets 5/6 liter. Now they all match!' },
  'fractional-unit-conversions': { setup: 'Pounds and ounces are mixed up. Help?',
    prompt: 'Pip’s stage nails come by the pound. How many ounces are in 1/2 pound?',
    result: '1/2 pound is 8 ounces of nails. Enough for the stage!' },
  'fractional-sharing': { setup: 'Let’s share the ribbon fairly for the stage.',
    prompt: '1 ribbon is shared fairly by 4 stage helpers. How much does each helper get?',
    result: 'Each helper gets 1/4 of the ribbon. Fair shares!' },
  'fraction-as-division': { setup: 'The stage rope is cut into fourths. Where does it end?',
    prompt: 'Pip’s stage rope is measured in fourths of a meter. Between which two whole numbers is 13/4?',
    result: '13/4 = 13 ÷ 4 = 3 1/4. The rope ends between 3 and 4 meters!' },
  // Chapter 13 · Bea’s festival garden
  'fraction-probability': { setup: 'Buzz! Which seed will I pick for the garden?',
    prompt: 'Bea has a bag of 12 seeds. 7 are flower seeds. What is the chance of picking a flower seed?',
    result: 'The chance is 7/12. More flowers than not!' },
  'fractional-side-area': { setup: 'These plots have fraction sides. How big are they?',
    prompt: 'Bea’s garden plot is 1 unit by 3/4 unit. Color the overlapping area on the 3-by-4 grid. What is its area in square units?',
    result: 'The plot is 9/12 square units. That is the same as 3/4!' },
  'multiply-mixed-numbers': { setup: 'This flower bed has mixed-number sides. How big is it?',
    prompt: 'Bea’s flower bed is 1 1/2 meters by 2 1/3 meters. What is its area?',
    result: 'The bed is 3 3/6 square meters. Room for lots of flowers!' },
  'fraction-recipes': { setup: 'Let’s bake for the festival with my recipe.',
    prompt: 'Bea’s {cake} recipe uses 5/12 cup of flour. She makes 2 batches. How much flour does she need?',
    result: '2 × 5/12 = 10/12 cup of flour. Buzz, baking time!' },
  // Chapter 14 · The lock code
  'fractions-to-percent': { setup: 'The first dial uses a percent. Help me set it!',
    prompt: 'The first dial needs a percent. Write 9/10 as a percent.',
    result: '9/10 is 90%. Click! The first dial turns.' },
  'percent-to-fraction': { setup: 'This dial shows a percent. What fraction is that?',
    prompt: 'The next dial shows a percent. Write 90% as a fraction with a denominator of 100.',
    result: '90% is 90/100. Click! Another dial done.' },
  'multi-step-fraction-stories': { setup: 'The last part is a story puzzle. Step by step.',
    prompt: 'The last code: 2/6 of Bea’s garden is planted. Then 3/6 more is planted. How much is still empty?',
    result: '1/6 is still empty. Click! The case opens!' },
  // Chapter 15 · The Fraction Festival
  'find-the-whole': { setup: 'Can you solve my first riddle?',
    prompt: 'Chomp’s riddle: a piece of ribbon is 10 meters long. It is 5/6 of the whole ribbon. How long is the whole ribbon?',
    result: 'The whole ribbon is 12 meters. Riddle solved!' },
  'spot-the-mistake': { setup: 'My riddle has a mistake in it. Can you spot it?',
    prompt: 'Chomp says 2/3 = 3/4 because he added 1 to the numerator and denominator. Which fraction in sixths is really equal to 2/3?',
    result: '2/3 = 4/6. Chomp made that mistake on purpose. Sneaky!' },
  'fraction-of-remainder': { setup: 'Part goes to one friend, then part of the rest. What’s left?',
    prompt: 'Chomp has 50 {snacks}. He gives 1/5 of them to Pip. Then he gives 1/2 of the rest to Bea. How many does Chomp have now?',
    result: 'Chomp has 20 {snacks} left. Sharing is caring!' },
  'divide-fractions': { setup: 'The last riddle. The trickiest one. Ready?',
    prompt: 'The last riddle: how many 3/8 cup scoops of {drink} fill a 3/4 cup?',
    result: '2 scoops! The Whole Stone glows whole again.' },
};
export const storyProblemFor = (missionId: string): StoryProblem | null => STORY_PROBLEMS[missionId] ?? null;

/** The stone question after a chapter: how much of the Whole Stone is back? Four choices with the usual mix-ups. */
export function stoneQuestion(found: number): { choices: string[]; correct: number } {
  const right = `${found}/${STONE_PIECES}`;
  const wrong = [`${STONE_PIECES}/${found}`, `${found}/${STONE_PIECES - found || 1}`, `${STONE_PIECES - found}/${STONE_PIECES}`, `1/${STONE_PIECES}`, `${found}/${STONE_PIECES + 1}`]
    .filter((choice, index, all) => choice !== right && all.indexOf(choice) === index).slice(0, 3);
  // A steady spot for the right answer that still moves from chapter to chapter.
  const correct = found % 4;
  const choices = [...wrong];
  choices.splice(correct, 0, right);
  return { choices, correct };
}

/* ---------- the detective quest's words (also read aloud from the voice pack) ---------- */

export type SuspectBoard = 1 | 2;
/** Board 1 opens after chapter 4, board 2 after chapter 7. */
export const BOARD_AFTER: Record<SuspectBoard, number> = { 1: 4, 2: 7 };
export const SUSPECTS: Record<SuspectBoard, CharacterId[]> = { 1: ['chomp', 'pip', 'tilly'], 2: ['chomp', 'bolt', 'bea', 'pip', 'tilly'] };

/** The chapter choice that looks for a clue (the second one, in chapters 1–7) gives a bonus clue: its reply. */
export function bonusClue(chapter: Chapter): string | null {
  const option = chapter.choice[1];
  return /clue|search|who saw|hiding/i.test(option.detail) ? option.reply.text : null;
}


/** What Hoot says about a guess: kind, with a nudge back to the clues; never the final answer. */
export function suspectReply(board: SuspectBoard, suspect: CharacterId): { good: boolean; text: string } {
  if (board === 1) {
    return suspect === 'chomp'
      ? { good: true, text: 'Good detective work! The big footprints, the green tail and the pointy teeth all match Chomp. But Chomp says he didn’t do it… keep collecting clues.' }
      : { good: false, text: `Hmm. ${CHARACTERS[suspect].name} was busy helping us. Look at your clues again: big footprints, a green tail, pointy teeth. Who has those?` };
  }
  if (suspect === 'bolt') return { good: true, text: 'Sharp thinking! The map leads to Bolt’s workshop, and his rocket boots are missing. Keep a close eye on Bolt.' };
  if (suspect === 'chomp') return { good: true, text: 'Chomp hid the boots and drew the map… but why draw a map to Bolt’s workshop? Something doesn’t add up. Keep reading!' };
  return { good: false, text: `Hmm. ${CHARACTERS[suspect].name} has been helping all along. Look at your clues: whose boots are missing, and where does the map lead?` };
}


/** What each chapter choice earns, shown with its reply. */
export function choiceNotes(chapter: Chapter): [string, string] {
  const thanks = `You earned ${CHARACTERS[chapter.character].name}’s thank-you sticker!`;
  return [thanks, bonusClue(chapter) ? 'Bonus clue added to your notebook!' : thanks];
}

/** Story mode: the friend's ask at the top of a hands-on lesson. */
export const HANDS_ON_ASKS: Record<string, string> = {
  sort: 'Help me share it fairly. Every friend must get the same amount!',
  'sort-cake': 'Help me share it fairly. Every friend must get the same amount!',
  tile: 'How many pieces this size make the whole thing?',
  match: 'Can different pieces make the same amount?',
};

/** When the truth comes out (chapters 8 and 11), the story remembers the child's suspect board guess. */
export const DETECTIVE_NOTES = {
  8: { chomp: 'Detective note: you suspected Chomp. The clues pointed at him… but he was protecting a friend!', bolt: 'Detective note: you suspected Bolt. You might be onto something!' },
  11: { bolt: 'Detective note: you figured it out back in chapter 7. Great detective work, {name}!', other: 'Detective note: the clues were all there: the map, the missing boots and the sorry note.' },
} as const;
export function detectiveNote(unit: number, guesses: Record<string, string>): string | undefined {
  const guess = guesses['2'] ?? guesses['1'];
  if (!guess) return undefined;
  if (unit === 8) return guess === 'chomp' ? DETECTIVE_NOTES[8].chomp : guess === 'bolt' ? DETECTIVE_NOTES[8].bolt : undefined;
  if (unit === 11) return guess === 'bolt' ? DETECTIVE_NOTES[11].bolt : DETECTIVE_NOTES[11].other;
  return undefined;
}
