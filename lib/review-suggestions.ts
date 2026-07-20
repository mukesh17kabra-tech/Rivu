// Pre-written review suggestions the QR-scan flow shows based on the
// star rating the customer picks. Each array has more than 6-7 entries so
// the "refresh" button can show a genuinely different batch each time.
// {product} gets replaced with the actual product title before showing.

const TEMPLATES: Record<number, string[]> = {
  5: [
    "Absolutely love {product}! Exceeded my expectations in every way.",
    "{product} is amazing — quality is top notch, will buy again.",
    "Best purchase I've made in a while. {product} is fantastic!",
    "Five stars for {product} — exactly what I was looking for.",
    "Super happy with {product}. Fast delivery and great quality too.",
    "Can't recommend {product} enough. Worth every rupee.",
    "{product} works perfectly and looks even better in person.",
    "Outstanding! {product} is everything I hoped for and more.",
    "Perfect purchase. {product} is exactly as described, maybe better.",
  ],
  4: [
    "Really happy with {product}, just a couple of small things could improve.",
    "{product} is great overall — good quality for the price.",
    "Very satisfied with {product}. Would recommend to others.",
    "{product} does what it promises. Minor room for improvement.",
    "Good experience with {product}, delivery could've been faster though.",
    "Solid product. {product} works well, nothing major to complain about.",
    "Happy with my purchase of {product}. Good value overall.",
    "{product} is nice, a small tweak here or there would make it perfect.",
  ],
  3: [
    "{product} is okay, does the job but nothing special.",
    "Average experience with {product}. Meets basic expectations.",
    "{product} is fine — not bad, not amazing either.",
    "It's decent. {product} works but I expected a bit more.",
    "{product} is alright for the price, has some minor issues.",
    "Neutral about {product} — some things good, some could be better.",
    "{product} works as expected, nothing to write home about.",
  ],
  2: [
    "{product} didn't quite meet my expectations, had some issues.",
    "Not fully satisfied with {product}. A few problems I noticed.",
    "{product} is below average — quality could be better.",
    "Had some trouble with {product}, wouldn't recommend easily.",
    "{product} was disappointing in a few ways. Needs improvement.",
    "Expected more from {product}, ran into a couple of issues.",
    "{product} is not great — had to work around some problems.",
  ],
  1: [
    "Unfortunately {product} did not work for me at all.",
    "Very disappointed with {product}. Did not meet expectations.",
    "{product} had major issues, would not recommend.",
    "Not happy with {product} — quality was not what I expected.",
    "{product} stopped working / did not perform as described.",
    "Had a poor experience with {product}. Needs significant improvement.",
    "{product} was a letdown, wouldn't purchase again.",
  ],
};

export function getSuggestions(rating: number, productTitle: string, count = 7): string[] {
  const pool = TEMPLATES[rating] || TEMPLATES[3];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((t) => t.replace(/{product}/g, productTitle));
}
