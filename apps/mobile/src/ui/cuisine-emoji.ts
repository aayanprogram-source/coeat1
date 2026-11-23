const table: [RegExp, string][] = [
  [/biryani|rice/i, '🍚'],
  [/north|punjabi|mughlai|curry/i, '🍛'],
  [/south|dosa|idli|udupi/i, '🥘'],
  [/pizza|italian/i, '🍕'],
  [/burger|american|fast/i, '🍔'],
  [/chinese|asian|noodle|thai/i, '🍜'],
  [/dessert|sweet|ice|bakery|cake/i, '🍰'],
  [/cafe|coffee|tea/i, '☕'],
  [/seafood|fish|coastal/i, '🦐'],
  [/veg|salad|health/i, '🥗'],
  [/street|chaat|snack/i, '🌯'],
  [/bbq|grill|kebab|tandoor/i, '🍢'],
];

/** A friendly emoji for a cuisine name, so category rows read at a glance. */
export function cuisineEmoji(name: string): string {
  return table.find(([pattern]) => pattern.test(name))?.[1] ?? '🍽️';
}
