// Pre-written review suggestions the QR-scan flow and storefront widget
// show based on the star rating the customer picks. {product} gets
// replaced with the actual product title. Each language has its own
// natural phrasing per rating band, not machine-translated word-for-word.
//
// Kept as static hand-written templates (no translation API) — zero
// per-request cost, no external dependency, and better phrasing quality
// than a literal API translation for short marketing-style sentences.

type TemplateSet = Record<number, string[]>;

const TEMPLATES_EN: TemplateSet = {
  5: [
    "Absolutely love {product}! Exceeded my expectations in every way.",
    "{product} is amazing — quality is top notch, will buy again.",
    "Best purchase I've made in a while. {product} is fantastic!",
    "Five stars for {product} — exactly what I was looking for.",
    "Super happy with {product}. Fast delivery and great quality too.",
    "Can't recommend {product} enough. Worth every penny.",
    "{product} works perfectly and looks even better in person.",
  ],
  4: [
    "Really happy with {product}, just a couple of small things could improve.",
    "{product} is great overall — good quality for the price.",
    "Very satisfied with {product}. Would recommend to others.",
    "{product} does what it promises. Minor room for improvement.",
    "Good experience with {product}, delivery could've been faster though.",
    "Happy with my purchase of {product}. Good value overall.",
  ],
  3: [
    "{product} is okay, does the job but nothing special.",
    "Average experience with {product}. Meets basic expectations.",
    "{product} is fine — not bad, not amazing either.",
    "It's decent. {product} works but I expected a bit more.",
    "{product} is alright for the price, has some minor issues.",
  ],
  2: [
    "{product} didn't quite meet my expectations, had some issues.",
    "Not fully satisfied with {product}. A few problems I noticed.",
    "{product} is below average — quality could be better.",
    "Had some trouble with {product}, wouldn't recommend easily.",
    "{product} was disappointing in a few ways. Needs improvement.",
  ],
  1: [
    "Unfortunately {product} did not work for me at all.",
    "Very disappointed with {product}. Did not meet expectations.",
    "{product} had major issues, would not recommend.",
    "Not happy with {product} — quality was not what I expected.",
    "{product} stopped working / did not perform as described.",
  ],
};

const TEMPLATES_HI: TemplateSet = {
  5: [
    "{product} बहुत ही बढ़िया है! उम्मीद से भी ज़्यादा अच्छा निकला।",
    "{product} की quality शानदार है, दोबारा ज़रूर खरीदूँगा।",
    "बहुत दिनों बाद इतनी अच्छी खरीदारी की। {product} फैंटास्टिक है!",
    "{product} बिल्कुल वैसा ही है जैसा चाहिए था — पूरे 5 स्टार।",
    "{product} से बहुत खुश हूँ। Delivery भी जल्दी हुई, quality भी बढ़िया।",
    "{product} बिल्कुल सही काम करता है, देखने में भी बहुत अच्छा है।",
  ],
  4: [
    "{product} से खुश हूँ, बस कुछ छोटी चीज़ें बेहतर हो सकती थीं।",
    "{product} overall अच्छा है — कीमत के हिसाब से अच्छी quality।",
    "{product} से संतुष्ट हूँ, दूसरों को भी recommend करूँगा।",
    "{product} अपना काम अच्छे से करता है, थोड़ी सी improvement हो सकती है।",
    "{product} खरीद कर खुश हूँ। अच्छी value है पैसों की।",
  ],
  3: [
    "{product} ठीक-ठाक है, काम कर जाता है पर कुछ खास नहीं।",
    "{product} के साथ average experience रहा। बेसिक ज़रूरतें पूरी हो जाती हैं।",
    "{product} ठीक है — न बहुत अच्छा, न बुरा।",
    "ठीक-ठाक है। {product} काम करता है पर थोड़ी और उम्मीद थी।",
  ],
  2: [
    "{product} उम्मीद पर खरा नहीं उतरा, कुछ दिक्कतें आईं।",
    "{product} से पूरी तरह संतुष्ट नहीं हूँ। कुछ समस्याएँ दिखीं।",
    "{product} average से भी कम है — quality बेहतर हो सकती थी।",
    "{product} में थोड़ी दिक्कत आई, आसानी से recommend नहीं करूँगा।",
  ],
  1: [
    "दुर्भाग्य से {product} मेरे लिए बिल्कुल काम नहीं आया।",
    "{product} से बहुत निराश हूँ। उम्मीद पर बिल्कुल खरा नहीं उतरा।",
    "{product} में बड़ी दिक्कतें आईं, recommend नहीं करूँगा।",
    "{product} से खुश नहीं हूँ — quality उम्मीद जैसी नहीं थी।",
  ],
};

const TEMPLATES_ES: TemplateSet = {
  5: [
    "¡Me encanta {product}! Superó mis expectativas en todo sentido.",
    "{product} es increíble — la calidad es excelente, volveré a comprar.",
    "La mejor compra que he hecho en mucho tiempo. ¡{product} es fantástico!",
    "Cinco estrellas para {product} — justo lo que buscaba.",
    "Muy contento con {product}. Entrega rápida y buena calidad.",
  ],
  4: [
    "Muy contento con {product}, solo un par de cosas podrían mejorar.",
    "{product} es bueno en general — buena calidad por el precio.",
    "Muy satisfecho con {product}. Lo recomendaría a otros.",
    "{product} cumple lo que promete, con pequeño margen de mejora.",
  ],
  3: [
    "{product} está bien, cumple su función pero nada especial.",
    "Experiencia promedio con {product}. Cumple lo básico.",
    "{product} está bien — ni malo ni increíble.",
  ],
  2: [
    "{product} no cumplió del todo mis expectativas, tuve algunos problemas.",
    "No estoy totalmente satisfecho con {product}. Noté algunos problemas.",
    "{product} está por debajo del promedio — la calidad podría ser mejor.",
  ],
  1: [
    "Lamentablemente {product} no funcionó para mí en absoluto.",
    "Muy decepcionado con {product}. No cumplió las expectativas.",
    "{product} tuvo problemas graves, no lo recomendaría.",
  ],
};

const TEMPLATES_FR: TemplateSet = {
  5: [
    "J'adore {product} ! Il a dépassé mes attentes à tous points de vue.",
    "{product} est incroyable — la qualité est excellente, je rachèterai.",
    "Le meilleur achat que j'ai fait depuis longtemps. {product} est fantastique !",
    "Cinq étoiles pour {product} — exactement ce que je cherchais.",
  ],
  4: [
    "Très content de {product}, juste quelques petites choses à améliorer.",
    "{product} est très bien dans l'ensemble — bonne qualité pour le prix.",
    "Très satisfait de {product}. Je le recommanderais.",
  ],
  3: [
    "{product} est correct, fait le travail mais rien de spécial.",
    "Expérience moyenne avec {product}. Répond aux attentes de base.",
    "{product} est bien — ni mauvais, ni incroyable.",
  ],
  2: [
    "{product} n'a pas tout à fait répondu à mes attentes, quelques soucis.",
    "Pas totalement satisfait de {product}. Quelques problèmes remarqués.",
    "{product} est en dessous de la moyenne — la qualité pourrait être meilleure.",
  ],
  1: [
    "Malheureusement {product} n'a pas du tout fonctionné pour moi.",
    "Très déçu de {product}. N'a pas répondu aux attentes.",
    "{product} a eu de gros problèmes, je ne le recommanderais pas.",
  ],
};

const TEMPLATES_DE: TemplateSet = {
  5: [
    "Ich liebe {product}! Hat meine Erwartungen in jeder Hinsicht übertroffen.",
    "{product} ist erstaunlich — top Qualität, kaufe ich wieder.",
    "Der beste Kauf seit langem. {product} ist fantastisch!",
    "Fünf Sterne für {product} — genau das, was ich gesucht habe.",
  ],
  4: [
    "Sehr zufrieden mit {product}, nur ein paar Kleinigkeiten könnten besser sein.",
    "{product} ist insgesamt sehr gut — gute Qualität für den Preis.",
    "Sehr zufrieden mit {product}. Würde es weiterempfehlen.",
  ],
  3: [
    "{product} ist okay, erfüllt den Zweck, aber nichts Besonderes.",
    "Durchschnittliche Erfahrung mit {product}. Erfüllt die Grundanforderungen.",
    "{product} ist in Ordnung — weder schlecht noch großartig.",
  ],
  2: [
    "{product} hat meine Erwartungen nicht ganz erfüllt, einige Probleme.",
    "Nicht ganz zufrieden mit {product}. Ein paar Probleme bemerkt.",
    "{product} ist unterdurchschnittlich — die Qualität könnte besser sein.",
  ],
  1: [
    "Leider hat {product} bei mir überhaupt nicht funktioniert.",
    "Sehr enttäuscht von {product}. Hat die Erwartungen nicht erfüllt.",
    "{product} hatte große Probleme, würde ich nicht empfehlen.",
  ],
};

const TEMPLATES_PT: TemplateSet = {
  5: [
    "Adoro {product}! Superou minhas expectativas em todos os sentidos.",
    "{product} é incrível — qualidade excelente, vou comprar de novo.",
    "A melhor compra que fiz em muito tempo. {product} é fantástico!",
    "Cinco estrelas para {product} — exatamente o que eu procurava.",
  ],
  4: [
    "Muito satisfeito com {product}, só algumas coisinhas para melhorar.",
    "{product} é ótimo no geral — boa qualidade pelo preço.",
    "Muito satisfeito com {product}. Recomendaria a outros.",
  ],
  3: [
    "{product} está ok, cumpre a função mas nada de especial.",
    "Experiência mediana com {product}. Atende ao básico.",
    "{product} está bom — nem ruim, nem incrível.",
  ],
  2: [
    "{product} não atendeu totalmente às minhas expectativas, alguns problemas.",
    "Não estou totalmente satisfeito com {product}. Notei alguns problemas.",
    "{product} está abaixo da média — a qualidade poderia ser melhor.",
  ],
  1: [
    "Infelizmente {product} não funcionou para mim.",
    "Muito decepcionado com {product}. Não atendeu às expectativas.",
    "{product} teve problemas sérios, não recomendaria.",
  ],
};

const TEMPLATES_AR: TemplateSet = {
  5: [
    "أحب {product} حقًا! تجاوز توقعاتي من كل النواحي.",
    "{product} رائع — الجودة ممتازة، سأشتري مرة أخرى.",
    "أفضل عملية شراء قمت بها منذ فترة طويلة. {product} رائع!",
    "خمس نجوم لـ {product} — بالضبط ما كنت أبحث عنه.",
  ],
  4: [
    "سعيد جدًا بـ {product}، فقط بضعة أشياء صغيرة يمكن تحسينها.",
    "{product} جيد بشكل عام — جودة جيدة مقابل السعر.",
    "راضٍ جدًا عن {product}. سأوصي به للآخرين.",
  ],
  3: [
    "{product} جيد، يقوم بالمهمة لكن لا شيء مميز.",
    "تجربة متوسطة مع {product}. يلبي المتطلبات الأساسية.",
    "{product} لا بأس به — ليس سيئًا وليس رائعًا.",
  ],
  2: [
    "{product} لم يلبِّ توقعاتي تمامًا، واجهت بعض المشاكل.",
    "لست راضيًا تمامًا عن {product}. لاحظت بعض المشاكل.",
    "{product} دون المتوسط — يمكن أن تكون الجودة أفضل.",
  ],
  1: [
    "للأسف {product} لم يعمل معي على الإطلاق.",
    "خيبة أمل كبيرة من {product}. لم يلبِّ التوقعات.",
    "واجه {product} مشاكل كبيرة، لن أوصي به.",
  ],
};

const TEMPLATES_ZH: TemplateSet = {
  5: [
    "太喜欢{product}了！各方面都超出了我的预期。",
    "{product}非常棒——质量一流，还会再买。",
    "这是我很久以来买过最好的东西。{product}太棒了！",
    "给{product}五星好评——正是我想要的。",
  ],
  4: [
    "对{product}很满意，只有一些小地方可以改进。",
    "{product}整体不错——性价比很高。",
    "对{product}很满意，会推荐给其他人。",
  ],
  3: [
    "{product}还可以，能用但没什么特别的。",
    "{product}体验一般，满足基本需求。",
    "{product}还行——不差也不算特别好。",
  ],
  2: [
    "{product}没有完全达到我的预期，有一些问题。",
    "对{product}不是很满意，发现了一些问题。",
    "{product}低于平均水平——质量可以更好。",
  ],
  1: [
    "很遗憾{product}对我来说完全不好用。",
    "对{product}非常失望，没有达到预期。",
    "{product}有严重问题，不推荐购买。",
  ],
};

const TEMPLATES_JA: TemplateSet = {
  5: [
    "{product}が大好きです！あらゆる面で期待以上でした。",
    "{product}は素晴らしい——品質も最高で、また買います。",
    "久しぶりの最高の買い物でした。{product}は最高です！",
    "{product}に五つ星——まさに探していたものです。",
  ],
  4: [
    "{product}にとても満足しています。少し改善点はあります。",
    "{product}は全体的に良い——価格に見合った品質です。",
    "{product}にとても満足していて、他の人にもおすすめしたいです。",
  ],
  3: [
    "{product}はまあまあです。使えますが特別ではありません。",
    "{product}は平均的な体験でした。基本的な要件は満たしています。",
    "{product}は普通です——悪くも良くもない。",
  ],
  2: [
    "{product}は期待に完全には応えられず、いくつか問題がありました。",
    "{product}に完全には満足していません。いくつか問題に気づきました。",
    "{product}は平均以下です——品質はもっと良くなるはずです。",
  ],
  1: [
    "残念ながら{product}は全く役に立ちませんでした。",
    "{product}にとても失望しました。期待に応えられませんでした。",
    "{product}には大きな問題があり、おすすめできません。",
  ],
};

const TEMPLATES_ID: TemplateSet = {
  5: [
    "Sangat suka {product}! Melebihi ekspektasi saya dalam segala hal.",
    "{product} luar biasa — kualitasnya top, akan beli lagi.",
    "Pembelian terbaik yang pernah saya lakukan. {product} fantastis!",
    "Lima bintang untuk {product} — persis yang saya cari.",
  ],
  4: [
    "Sangat puas dengan {product}, hanya beberapa hal kecil yang bisa ditingkatkan.",
    "{product} bagus secara keseluruhan — kualitas bagus sesuai harga.",
    "Sangat puas dengan {product}. Akan merekomendasikan ke yang lain.",
  ],
  3: [
    "{product} lumayan, berfungsi tapi tidak ada yang istimewa.",
    "Pengalaman rata-rata dengan {product}. Memenuhi kebutuhan dasar.",
    "{product} biasa saja — tidak buruk, tidak juga luar biasa.",
  ],
  2: [
    "{product} tidak sepenuhnya memenuhi ekspektasi saya, ada beberapa masalah.",
    "Tidak sepenuhnya puas dengan {product}. Ada beberapa masalah yang saya lihat.",
    "{product} di bawah rata-rata — kualitasnya bisa lebih baik.",
  ],
  1: [
    "Sayangnya {product} sama sekali tidak berfungsi untuk saya.",
    "Sangat kecewa dengan {product}. Tidak memenuhi ekspektasi.",
    "{product} memiliki masalah besar, tidak akan merekomendasikan.",
  ],
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "es", label: "Español (Spanish)" },
  { code: "fr", label: "Français (French)" },
  { code: "de", label: "Deutsch (German)" },
  { code: "pt", label: "Português (Portuguese)" },
  { code: "ar", label: "العربية (Arabic)" },
  { code: "zh", label: "中文 (Chinese)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "id", label: "Bahasa Indonesia" },
] as const;

// Growth gets a curated 6-language subset (broad global coverage without
// giving away the full 10 that Pro pays for); Free is English-only; Pro
// gets everything. Used both to gate the merchant's own default-language
// picker and the customer-facing storefront dropdown.
export const ALLOWED_LANGUAGES_BY_PLAN: Record<string, string[]> = {
  free: ["en"],
  growth: ["en", "hi", "es", "fr", "ar", "zh"],
  pro: SUPPORTED_LANGUAGES.map((l) => l.code),
};

const LANGUAGES: Record<string, TemplateSet> = {
  en: TEMPLATES_EN,
  hi: TEMPLATES_HI,
  es: TEMPLATES_ES,
  fr: TEMPLATES_FR,
  de: TEMPLATES_DE,
  pt: TEMPLATES_PT,
  ar: TEMPLATES_AR,
  zh: TEMPLATES_ZH,
  ja: TEMPLATES_JA,
  id: TEMPLATES_ID,
};

export function getSuggestions(
  rating: number,
  productTitle: string,
  count = 6,
  language = "en"
): string[] {
  const templates = LANGUAGES[language] || LANGUAGES.en;
  const pool = templates[rating] || templates[3];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((t) => t.replace(/{product}/g, productTitle));
}
