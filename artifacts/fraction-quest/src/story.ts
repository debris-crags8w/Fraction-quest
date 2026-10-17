/* The Whole Stone: one story across all 15 units. A week before the Fraction Festival the Whole Stone
   cracks into 15 equal pieces. Each chapter (unit) returns one piece and one clue to "who cracked it?".
   Act 1 points at Chomp; chapter 8 reveals he was protecting Bolt; Act 3 puts the stone back together.
   The story frames lessons only: it never changes a question, an answer or what unlocks next. */

export type CharacterId = 'chomp' | 'pip' | 'tilly' | 'bolt' | 'bea';
export type Speaker = CharacterId | 'numi' | 'hoot';
export type Panel = { speaker: Speaker; text: string };
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
   fills them, so a Halloween lesson has pumpkin pies and candy. Only nouns change: never a number or answer. */
export type PropTheme = 'everyday' | 'halloween';
export const PROPS: Record<PropTheme, Record<string, string>> = {
  everyday: { cake: 'cake', cakes: 'cakes', pie: 'pie', cookies: 'cookies', bar: 'snack bar', bars: 'snack bars', snack: 'snack', snacks: 'snacks', drink: 'lemonade', plant: 'sunflower' },
  halloween: { cake: 'pumpkin pie', cakes: 'pumpkin pies', pie: 'pumpkin pie', cookies: 'bat cookies', bar: 'candy bar', bars: 'candy bars', snack: 'candy', snacks: 'candies', drink: 'pumpkin juice', plant: 'corn stalk' },
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

const say = (speaker: Speaker, text: string): Panel => ({ speaker, text });
const pick = (label: string, detail: string, speaker: Speaker, reply: string): StoryChoice => ({ label, detail, reply: say(speaker, reply) });

/** The opening, once, before the very first lesson. */
export const PROLOGUE: [Panel, Panel, Panel] = [
  say('numi', 'The Fraction Festival is one week away. The Whole Stone glows in the town square.'),
  say('hoot', 'CRACK! The stone broke into 15 equal pieces, and they flew all over town!'),
  say('numi', '{name}, we need you! Can you find every piece and find out who cracked it?'),
];

export const CHAPTERS: Chapter[] = [
  { unit: 1, title: 'The bakery mix-up', character: 'chomp',
    intro: [say('chomp', 'I cut the festival {cake} for all 4 of us. The big piece is mine!'), say('numi', 'Wait! Those pieces are not the same size. And look, a stone piece is in the crumbs!'), say('hoot', 'Fair shares are equal parts. Fix the {cake}, {name}, and we can dig out the piece.')],
    choice: [pick('Fix the {cake}', 'Help everyone share fairly', 'numi', 'Good plan. A fair {cake} makes everyone happy.'), pick('Look at the crumbs', 'Add a clue to your notebook', 'hoot', 'Crumbs… and big muddy footprints. Interesting.')],
    scenes: ['The baker wrote fractions on the slices, but I can’t read them. Help?', 'Okay, okay. I’ll take just one slice. How big is one slice?'],
    cliffs: ['Under the crumbs the stone piece glows… right next to big muddy footprints.', 'The footprints lead out the bakery door… toward the pond.'],
    cliff: 'Splash! Something shiny just fell into Pip’s pond.',
    clue: 'Big muddy footprints in the crumbs',
    asks: ['Show me how it’s done!', 'Okay, okay. I’m watching this time.', 'No sneaky big pieces. Promise!'],
    thanks: 'Okay, okay. Equal parts are fair!', done: 'Fair shares for everyone. But I did not crack that stone!',
    card: { title: 'Chomp the sneaky sharer', blurb: 'Loves the biggest piece. Now he knows fair shares are equal parts.' } },
  { unit: 2, title: 'Pip’s pond party', character: 'pip',
    intro: [say('pip', 'Ribbit! My party guests are here, and a stone piece fell into the {snack} bowl!'), say('numi', 'Let’s share the {snacks} in equal groups so we can find it.'), say('hoot', 'A fraction can name part of a group too.')],
    choice: [pick('Share the {snacks}', 'Make equal groups', 'numi', 'Equal groups coming up!'), pick('Ask the guests', 'Who saw the splash?', 'pip', 'My guests saw a big green tail by the water. Hmm.')],
    scenes: ['More guests just hopped in! Can we share the {snacks} again?', 'Some guests want more than one share. How much is that?'],
    cliffs: ['Something under the lily pads blinks at you… then swims away.', 'The guests point up the hill. Tilly saw something shine up there!'],
    cliff: 'Tilly calls from the hill: “Something is shining up here!”',
    clue: 'A big green tail by the pond',
    asks: ['Ribbit! Help me with this one.', 'Every friend should get the same.', 'Party {snacks} need fair groups!'],
    thanks: 'Ribbit! Everyone got a fair share.', done: 'Best party ever! And we found the stone piece!',
    card: { title: 'Pip the party host', blurb: 'Shares {snacks} in equal groups so every guest gets the same.' } },
  { unit: 3, title: 'Tilly’s halfway hill', character: 'tilly',
    intro: [say('tilly', 'I saw something shining at the top of the hill. But am I even halfway up?'), say('numi', 'Let’s use landmarks: 0, one half and 1.'), say('hoot', 'Landmarks help us tell how big a fraction is.')],
    choice: [pick('Climb with Tilly', 'Use the landmarks', 'tilly', 'Slow and steady. Thank you for coming with me.'), pick('Look around', 'Search for clues', 'hoot', 'Teeth marks on the trail sign. Big pointy ones.')],
    scenes: ['Let’s check where we are again. I like to be sure.', 'Some parts of the path are bigger than others. Help me save my energy?'],
    cliffs: ['Halfway up, Tilly finds a trail of {cake} crumbs.', 'At the top, the stone piece glows in a bush… and the bridge below is broken!'],
    cliff: 'Down below, Pip can’t get home. The bridge is missing planks!',
    clue: 'Teeth marks on the trail sign',
    asks: ['Slow and steady. Help me check.', 'Let’s look at the landmarks.', 'I like to think before I move.'],
    thanks: 'Thank you! Now I know where I am.', done: 'I made it to the top! I checked every step.',
    card: { title: 'Tilly the steady climber', blurb: 'Checks 0, one half and 1 to know how far she has come.' } },
  { unit: 4, title: 'The broken bridge', character: 'pip',
    intro: [say('pip', '{name}! Planks are missing on the bridge and I can’t get home!'), say('numi', 'Let’s split the bridge into equal jumps.'), say('hoot', 'On a number line every jump is the same size.')],
    choice: [pick('Fix the bridge', 'Help Pip count the planks', 'pip', 'Ribbit! Thank you!'), pick('Study the teeth marks', 'Add a clue to your notebook', 'hoot', 'These marks match the trail sign. Same big teeth.')],
    scenes: ['The planks have numbers now. Where should I land?', 'My house is past the end of the bridge. How far is that?'],
    cliffs: ['Pip is halfway home… when a shadow runs past with something shiny.', 'The shadow drops a stone piece by the water and runs toward a tall tower.'],
    cliff: 'Chomp is building a tall tower. Is he hiding something on top?',
    clue: 'Matching teeth marks on the bridge',
    asks: ['Ribbit! Help me plan this one.', 'Equal jumps only. Ready, set, hop!', 'Help me count my hops.'],
    thanks: 'Ribbit! I landed right on the plank.', done: 'I made it home! One equal jump at a time.',
    card: { title: 'Pip the jump champion', blurb: 'Hops in equal jumps and lands right where he plans.' } },
  { unit: 5, title: 'Chomp’s tower of treats', character: 'chomp',
    intro: [say('chomp', 'Go away! My tower of treats is private!'), say('numi', 'Your tower keeps wobbling, Chomp. The biggest treats go at the bottom.'), say('hoot', 'Equal-size pieces make comparing easier.')],
    choice: [pick('Help fix the tower', 'Compare the treats', 'chomp', 'Fine. But don’t touch my {snacks}.'), pick('Peek at the top', 'What is Chomp hiding?', 'numi', 'A stone piece glows at the very top. Chomp looks nervous.')],
    scenes: ['These treats look so alike. Help me sort them?', 'Help me put them all in order so my tower stands tall.'],
    cliffs: ['The tower stands… and Chomp quickly hides a pair of shiny boots behind it.', 'Chomp mumbles: “Nobody can look in my den. Nobody!”'],
    cliff: 'Bea needs help at the honey shop. Someone left a strange map there.',
    clue: 'Chomp hid shiny boots behind his tower',
    asks: ['Let’s compare carefully.', 'Don’t let my tower wobble.', 'Help me sort my treats.'],
    thanks: 'My tower stands tall now!', done: 'Here’s your stone piece. Now please don’t look in my den.',
    card: { title: 'Chomp the tower builder', blurb: 'Compares before he stacks so his tower never wobbles.' } },
  { unit: 6, title: 'Bea’s honey jars', character: 'bea',
    intro: [say('bea', 'Buzz! My honey jars have different labels but look the same. And someone left a map!'), say('numi', 'Different names can mean the same amount.'), say('hoot', 'Equivalent fractions name the same size.')],
    choice: [pick('Sort the jars', 'Match the labels', 'bea', 'Buzz! Thank you!'), pick('Read the map', 'Add a clue to your notebook', 'hoot', 'The map shows Bolt’s workshop. It’s in Chomp’s writing!')],
    scenes: ['A new jar came from the hive. Can you make a label that matches?', 'This label has a missing number. Can you fill it in?'],
    cliffs: ['One jar hums with a golden glow. A stone piece is inside!', 'Bea whispers: “Chomp bought lots of honey… for a friend who was sad.”'],
    cliff: 'The map leads to Bolt’s workshop. Why would Chomp draw that?',
    clue: 'A map to Bolt’s workshop in Chomp’s writing',
    asks: ['Buzz! Help me with this jar.', 'Same honey, new label?', 'Help me sort my jars.'],
    thanks: 'Buzz buzz! The labels make sense now.', done: 'Every jar has its match. Here, take the stone piece!',
    card: { title: 'Bea the honey helper', blurb: 'Knows that 1/2 and 2/4 fill a jar the same amount.' } },
  { unit: 7, title: 'Bolt’s workshop', character: 'bolt',
    intro: [say('bolt', 'Beep! I need parts that make exactly one whole. Please do not look in my box.'), say('numi', 'Let’s put the parts together.'), say('hoot', 'Fractions can join to make one whole, and even more.')],
    choice: [pick('Build with Bolt', 'Join the parts', 'bolt', 'Beep boop. Thank you.'), pick('Peek in the box', 'Search for clues', 'numi', 'A stone piece is in Bolt’s parts box! His lights flicker.')],
    scenes: ['Beep. Can you split this whole into smaller parts?', 'Now I have more than one whole. Computing… help!', 'Beep. Can we write it as wholes and a part?'],
    cliffs: ['Bolt says the stone piece “just rolled in.” His lights blink red.', 'Bolt keeps looking at an empty shelf labeled “rocket boots.”', 'Bolt beeps quietly: “Chomp has my… never mind.”'],
    cliff: 'Chomp’s den door is open. Now’s your chance to look inside.',
    clue: 'Bolt’s rocket boots are missing',
    asks: ['Beep! Will these parts fit?', 'Computing… I need your help.', 'Part by part. Let’s build.'],
    thanks: 'Beep! The parts fit together.', done: 'Build complete. Here is the stone piece. Beep… sorry I was nervous.',
    card: { title: 'Bolt the builder bot', blurb: 'Joins fraction parts to build wholes and more.' } },
  { unit: 8, title: 'The secret in the den', character: 'chomp',
    intro: [say('chomp', 'Okay, okay. You found Bolt’s rocket boots. I didn’t crack the stone.'), say('chomp', 'The boots bumped it. Bolt was so scared. I hid them so nobody would blame him.'), say('numi', 'You took the blame to protect your friend, Chomp?')],
    choice: [pick('Thank Chomp', 'That was kind', 'chomp', 'Friends look out for friends.'), pick('Ask Chomp to join', 'Find the rest together', 'chomp', 'Yes! Let’s find the rest together.')],
    scenes: ['Now take some away. How much is left in my {snack} jar?', 'Some {snacks} are cut in different sizes. Can we still add them?', 'Bolt says robots count in tenths. Show me!', 'Hundredths? That’s tiny! Let’s try.', 'Let’s add tenths and hundredths to fix Bolt’s boots.', 'I eat the same small piece of {pie} every day. How much after a few days?', 'Each friend gets part of a sandwich. How much in all?'],
    cliffs: ['Chomp opens a jar. Inside is a stone piece he was keeping safe!', 'Chomp: “I was saving it to give back. I promise.”', 'Bolt’s boots need fixing before he can say sorry.', 'Bolt’s screen flashes: “Fixing boots…”', 'Bolt is almost ready… but still too scared to talk.', 'The boots whir back to life!', 'Chomp: “Now let’s finish the job. Together.”'],
    cliff: 'Tilly has a race map with three routes. One leads to a stone piece!',
    clue: 'Chomp hid the boots to protect Bolt',
    asks: ['Let’s count it up together.', 'My {snack} jar needs your help.', 'Team Chomp is on it!'],
    thanks: 'We make a good team!', done: 'I’m on your team now. Mystery half solved!',
    card: { title: 'Chomp the loyal friend', blurb: 'Took the blame to protect a friend. Now he helps everyone.' } },
  { unit: 9, title: 'Tilly’s race map', character: 'tilly',
    intro: [say('tilly', 'My race map uses different names for the same spots. One route has a stone piece!'), say('numi', 'Let’s rename the spots so we can compare.'), say('hoot', 'Renaming a fraction does not change its size.')],
    choice: [pick('Read the map', 'Rename the spots', 'tilly', 'Thank you. I like to be sure.'), pick('Ask Chomp', 'He knows shortcuts', 'chomp', 'Take the middle route. Trust me, I’m on your team now!')],
    scenes: ['Two numbers are missing on this sign. Can you find both?', 'This sign looks strange. Can you read it?', 'Two routes have different names. Let’s compare them.', 'Help me put all the routes in order.'],
    cliffs: ['The middle route sparkles in the sun.', 'Someone is following the team, very quietly.', 'Halfway along, Tilly finds a robot bolt on the path.', 'Squeak! Rocket boots behind a tree. Bolt is hiding.'],
    cliff: 'At the picnic spot, Bolt runs off before anyone can say hi.',
    clue: 'Bolt is following the team',
    asks: ['Which spot comes first?', 'Slow and steady. Let’s compare.', 'Can we rename this one?'],
    thanks: 'Now my map makes sense!', done: 'I read the whole map! And I trusted my checking.',
    card: { title: 'Tilly the map reader', blurb: 'Renames fractions to compare spots on her race map.' } },
  { unit: 10, title: 'The team picnic', character: 'chomp',
    intro: [say('chomp', 'I packed sandwiches for the whole team. Is it enough?'), say('numi', 'Let’s add and take away to plan the picnic.'), say('hoot', 'Mixed numbers have wholes and a fraction part.')],
    choice: [pick('Plan the food', 'Count the sandwiches', 'chomp', 'Yum. Let’s do it right.'), pick('Save a spot for Bolt', 'Maybe he’ll come', 'numi', 'We saved a sandwich for Bolt. He’s watching from the bushes.')],
    scenes: ['Pip brought {pie} cut a different way. Can we add it all?', 'Tilly brought more sandwiches. How many now?', 'I ate some. Oops. How much is left?', 'Let’s share the {snacks}. Everyone gets part of the bowl.', 'Mixing everything is tricky. Let’s work it out.', 'Quick! About how much food is left? Close is fine.'],
    cliffs: ['A stone piece is hidden in the picnic basket!', 'Bolt peeks out, then hides again.', 'Bolt’s sandwich is gone. He took it!', 'A note in the basket: “Thank you. I am sorry. — B”', 'Chomp: “He’s almost ready. Give him time.”', 'Bolt’s boots leave tiny sparks on the path.'],
    cliff: 'The sparks lead to Bolt’s workshop. A big machine is humming.',
    clue: 'A sorry note from Bolt',
    asks: ['Help me plan my picnic.', 'I want to share fairly this time.', 'Let’s work it out together.'],
    thanks: 'Yum! My picnic is planned.', done: 'Enough food for the whole team. Best picnic ever!',
    card: { title: 'Chomp the picnic planner', blurb: 'Adds mixed numbers so there is enough for every guest.' } },
  { unit: 11, title: 'Bolt owns up', character: 'bolt',
    intro: [say('bolt', 'Beep… my rocket boots cracked the Whole Stone. I am very sorry.'), say('numi', 'Thank you for telling us, Bolt. That was brave.'), say('hoot', 'Let’s fix it together. Bolt’s machine makes things bigger or smaller.')],
    choice: [pick('Forgive Bolt', 'Everyone makes mistakes', 'bolt', 'Beep! Thank you, friend.'), pick('Fix the bridge', 'Use the machine', 'bolt', 'Setting machine to rebuild mode.')],
    scenes: ['My machine picks part of the parts. How many is that?', 'How many small pieces fit in this big one?', 'Will this setting make it bigger or smaller?', 'Now with mixed numbers. Computing…', 'Split this small part into equal shares.'],
    cliffs: ['The machine prints a new bridge plank. Pip cheers!', 'A stone piece pops out of the machine’s tray!', 'The bridge is fixed for good.', 'Bea calls: the festival stage is the wrong size!', 'Bolt sizes the stage parts just right.'],
    cliff: 'Pip needs help measuring the festival stage.',
    clue: 'Bolt told the truth',
    asks: ['Beep! Let’s test my machine.', 'Let’s find out together.', 'Computing… your turn.'],
    thanks: 'Beep! My machine works.', done: 'Mystery solved! I’m sorry, and I’m glad we’re a team.',
    card: { title: 'Bolt the brave bot', blurb: 'Owned up to a big mistake and helped fix it.' } },
  { unit: 12, title: 'Pip measures the stage', character: 'pip',
    intro: [say('pip', 'The festival stage needs measuring, and I have my ruler!'), say('numi', 'Let’s use fractions of an inch.'), say('hoot', 'Rulers and line plots use fractions too.')],
    choice: [pick('Measure the stage', 'Grab the ruler', 'pip', 'Ribbit! Ready.'), pick('Measure hops', 'Pip wants to practice', 'pip', 'Every hop counts!')],
    scenes: ['Two boards go end to end. How long together?', 'Read my ruler carefully. Where does it end?', 'Let’s put all my hops on a line plot.', 'What does the line plot tell us?', 'Let’s even out the pieces so they match.', 'Bea sent a measuring puzzle. Ready?', 'Inches and feet are mixed up. Help?', 'Let’s share the ribbon fairly for the stage.', 'Split the {cookies} for the stage crew.'],
    cliffs: ['Under the stage floor, something glows.', 'It’s a stone piece, stuck in a crack!', 'Pip wiggles the stone piece free!', 'The stage is almost ready.', 'Bea buzzes by: “The garden still isn’t fair!”', 'Chomp and Bolt carry boards together.', 'Tilly checks every board twice.', 'The stage lights flicker on.', 'The crew cheers for the new stage.'],
    cliff: 'Bea’s festival garden needs fair plots before tomorrow.',
    clue: 'The festival stage is ready',
    asks: ['Ribbit! Let’s measure.', 'Help me read my ruler.', 'Measure carefully with me.'],
    thanks: 'Ribbit! Measured just right.', done: 'Every board measured. Best stage ever!',
    card: { title: 'Pip the measurer', blurb: 'Measures with a ruler and plots it on a line plot.' } },
  { unit: 13, title: 'Bea’s festival garden', character: 'bea',
    intro: [say('bea', 'Buzz! The festival garden needs fair plots, and a stone piece is under the flowers!'), say('numi', 'Let’s find the fraction of each area.'), say('hoot', 'Equal areas can have different shapes.')],
    choice: [pick('Plan the garden', 'Make fair plots', 'bea', 'Buzz! A fair garden for all.'), pick('Dig for the piece', 'Find it first', 'chomp', 'I’ll dig gently. Promise!')],
    scenes: ['Each friend gets an equal part of the garden.', 'These plots have fraction sides. How big are they?', 'Let’s mark the garden path in equal steps.', 'Let’s make festival {drink} with the recipe.'],
    cliffs: ['A bee lands on one flower. The stone piece is right below!', 'Chomp digs gently. Got it!', 'The garden looks fair and beautiful.', 'Bolt finds a lock on the stone’s glass case.'],
    cliff: 'The stone’s case has a lock with a number code.',
    clue: 'The stone’s case is locked',
    asks: ['Buzz! Help me plan this one.', 'My flowers need equal space.', 'Let’s plan the garden.'],
    thanks: 'Buzz! My garden is fair.', done: 'A fair garden for everyone. Buzz buzz!',
    card: { title: 'Bea the gardener', blurb: 'Splits her garden into fair areas, whatever the shape.' } },
  { unit: 14, title: 'The lock code', character: 'bolt',
    intro: [say('bolt', 'Beep! The stone’s case has a lock. The code uses decimals and percents.'), say('numi', 'Let’s match them to fractions.'), say('hoot', 'Decimals, fractions and percents can name the same amount.')],
    choice: [pick('Crack the code', 'Help Bolt', 'bolt', 'Computing… with you.'), pick('Read the clues', 'Check your notebook', 'hoot', 'Every clue we found helps here.')],
    scenes: ['The next dial uses a percent. What fraction is that?', 'Match this decimal to its fraction.', 'Two dials show decimals. Let’s compare.', 'The last part is a story puzzle. Step by step.'],
    cliffs: ['Click! The first dial turns.', 'Click! Another dial done.', 'Click! The case starts to glow.', 'The case opens… but one piece is still missing!'],
    cliff: 'Chomp grins: “I know where it is. Solve my riddles first!”',
    clue: 'The case is open',
    asks: ['Beep! What does my screen say?', 'Let’s read these numbers.', 'Computing… help me match.'],
    thanks: 'Beep! The dial turned.', done: 'Code cracked! Now for the last piece.',
    card: { title: 'Bolt the code cracker', blurb: 'Matches decimals and percents to their fractions.' } },
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
    prompt: 'Chomp cut a {cake} into 5 equal pieces. What is 1 piece?',
    result: 'Each friend gets one fifth of the {cake}. Fair and square!' },
  'fraction-names': { setup: 'The baker frosted one slice for me. What does the label say?',
    prompt: 'The baker cut a {cake} into 9 equal slices. 1 slice is frosted. What fraction is frosted?',
    result: 'The label says 1/9. Now Chomp can read his slice!' },
  'unit-fractions': { setup: 'Okay, okay. Just one piece for me this time.',
    prompt: 'The {cake} has 12 equal pieces. Chomp takes 1 piece. What fraction is that?',
    result: 'Chomp took just 1/12. There is plenty left for everyone!' },
  // Chapter 2 · Pip’s pond party
  'unit-size': { setup: 'Two {bars} the same size! Which piece should the tiny guests get?',
    prompt: 'One {bar} is cut into thirds and one into sevenths. Which piece is smaller: 1/3 or 1/7?',
    result: 'The tiny guests get the 1/7 pieces. Just right for little frogs!' },
  'sets-unit-fractions': { setup: 'Every party table needs the same number of {snacks}!',
    prompt: 'Pip has 20 {snacks} for the party. What is 1/5 of the {snacks}?',
    result: 'Each table gets 4 {snacks}. Ribbit, fair groups!' },
  'sets-nonunit': { setup: 'Uh oh. Some guests have been snacking already!',
    prompt: 'Pip had 18 {snacks}. The guests ate 3/6 of them. How many did they eat?',
    choices: ['6 {snacks}', '15 {snacks}', '9 {snacks}', '8 {snacks}'],
    result: 'The guests ate 9 {snacks}. Half the bowl is still left!' },
  // Chapter 3 · Tilly’s halfway hill
  'benchmark-half': { setup: 'I packed a drink for the climb. Do I have enough?',
    prompt: 'Tilly’s jug of {drink} is 6/10 full. Is that more or less than half?',
    result: 'More than half a jug! Tilly has plenty of {drink} for the climb.' },
  'benchmarks-zero-one': { setup: 'Look at this tall {plant} by the trail. Is it almost as tall as a meter stick?',
    prompt: 'A {plant} on the hill grew 9/10 of a meter. Is that near 0 or 1 meter?',
    result: 'Almost 1 meter! Tilly uses the tall {plant} as a landmark.' },
  'fraction-magnitude': { setup: 'I climb in little steps. Each one is a tenth of the path.',
    prompt: 'Tilly climbs 1/10 + 1/10 + 1/10 + 1/10 + 1/10 of the path. About how far is that?',
    result: 'About halfway! Tilly stops for a {snack} break.' },
  // Chapter 4 · The broken bridge
  'number-line-basics': { setup: 'The bridge has equal planks. Help me count my hops!',
    prompt: 'The bridge from 0 to 1 has 6 equal planks. Pip hops 5 planks. Where is he?',
    result: 'Pip is at 5/6 of the bridge. Just one plank to go!' },
  'number-line-points': { setup: 'Oops! I dropped my {snack} on the bridge. Where did it land?',
    prompt: 'The bridge has 8 equal spaces. Pip’s {snack} is 5 jumps from 0. What fraction is that?',
    result: 'Found it at 5/8! Pip saves his {snack} for later.' },
  'number-line-beyond-one': { setup: 'My house is past the end of the bridge. Keep counting with me!',
    prompt: 'Pip takes 9 hops of 1/5 each. How far is that?',
    result: 'Pip hopped 9/5, which is 1 and 4/5. He is home!' },
  // Chapter 5 · Chomp’s tower of treats
  'compare-same-denominator': { setup: 'The bigger treat goes at the bottom. Which one is it?',
    prompt: 'Two {bars} are cut into twelfths. Which is bigger, 5/12 or 9/12?',
    result: 'The 9/12 piece goes at the bottom. The tower stands tall!' },
  'compare-same-numerator': { setup: 'These two treats look so alike. Help me pick!',
    prompt: 'Two {cakes} are the same size. Which piece covers more: 3/10 or 3/8?',
    result: '3/8 covers more, so it goes lower. No more wobbles!' },
  'order-fractions': { setup: 'Smallest on top, biggest at the bottom. Help me stack!',
    prompt: 'Chomp’s tower has 1/2, 3/10 and 8/10 of a {bar}. Put them in order, smallest first.',
    result: 'Smallest on top and biggest at the bottom. The tower is perfect!' },
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
