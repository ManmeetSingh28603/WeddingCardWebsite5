/*
 * The walk player: an invitation the guest walks into by scrolling. Plain JS, no build step.
 *
 * The page (web/src/lib/server/walk-html.ts) sets window.SAATH = { root, data, draft, walk }:
 * the wedding record (the same WeddingData the painted engine reads), where the media lives,
 * and a walk definition (public/invite/walks/<id>/walk.json). A tall scroll track holds a fixed
 * stage; the scroll position is a playhead in "screens" (one screen = one stage height of scroll),
 * eased towards the scroll target, and each scene draws itself on one canvas for its stretch of
 * the playhead. The invitation's words are DOM blocks laid over the canvas, anchored to calm
 * zones of the picture, faded in and out by the playhead, with their ink and a soft shade chosen
 * by measuring the pixels under them.
 *
 * ?f=<family> greets a family and shows only the functions it is invited to; ?lang=hi|en picks
 * the language; ?video hides the controls (catalogue previews); ?at=<screens> starts part way in.
 * In the builder's preview (SAATH.draft) the record comes from localStorage["saath-draft"].
 *
 * ───────── The walk definition (walk.json) ─────────
 *
 * {
 *   id, name: {en, hi}, base: "<painted collection the walk borrows cards from>",
 *   art: "<folder of the media, relative to root>", music: "<file, relative to root>",
 *   poster: "<first picture, preloaded>", ornament: "<divider image>", paper: "<paper texture>",
 *   palette: { ink, paper, accent, gold, night, ivory },
 *   invocation: "<the line that opens the blessing block, unless the couple chose another or none>",
 *   functions: { <slot>: { art, trim: [x0,y0,x1,y1], wall, accent } },  slots: haldi, mehendi,
 *              sangeet, wedding, reception (any function maps to one, as in the painted engine)
 *   scenes: [ Scene, ... ]          in walking order
 * }
 *
 * Coordinates are fractions of a scene's world: its picture (0..1 across its width and height).
 * A box is [x0, y0, x1, y1]; y may be negative where the picture is extended upwards.
 *
 * Every scene has:
 *   type      "still" | "doors" | "room" | "film"
 *   length    screens of scroll it takes (the walk is 6 to 9 screens in all)
 *   chapter   { en, hi }, its name in the bottom bar (a room takes its function's name)
 *   camera    { from: View | "prev", to: View, ease: "inOut" | "out" | "in" | "linear" }
 *             View = { box, mode: "fit" (show all of the box) | "fill" (fill the screen with it),
 *             align: [ax, ay] (where the box sits when the screen's shape differs) }.
 *             "prev" starts where the previous scene's camera ended (same picture). The camera
 *             zooms about the point both views share, so a push-in feels like a step forward.
 *   copy      [{ block, zone: box | "auto", align: "top" | "middle" | "bottom", at: [a, b] }]
 *             block: arrival (greeting, names, dates) | note (the family's own note) | blessing
 *             (the parents) | story (story and photos) | function (a room's function) | venue |
 *             reply | date (a save-the-date card: initials, the day and the city, for a card or
 *             board in the picture, with sign: true). at: the part of the scene (0..1; seconds for a film) where it is fully shown.
 *             sign: true puts the words on a surface in the picture (the zone is the surface): laid
 *             out at a readable width, scaled as one piece to fit inside it, with no shade.
 *             tone: "dark" | "light" fixes the words' tone where the ground is mixed (sky and stone).
 *             veil: 0..1, the least shade under the words, for words set over something moving in
 *             the film (Jheel Mahal's blessing stands in front of the water gate as it closes).
 *   blessing  true for a scene of the design's deity (Ram Mandir's darshan), left out when the
 *             couple turns the painting off (data.blessing === false)
 *   exit      { type: "cut" } (the next scene starts on the same view) | { type: "fade", length }
 *             | { type: "zoom", portal: box, shape: "arch" | "rect", rise, length }: the camera
 *             flies into the portal (a doorway in the picture) and the next scene opens inside it,
 *             deeper than the doorway, until it fills the screen. length is in screens. through
 *             (0..1, arch only) dissolves the doorway's frame left inside the portal's box into
 *             the next scene over that last part of the zoom, so the cut shows nothing (Shalimar).
 *
 * still:  image { src, w, h }; extend { top, mirror, tone, dark }: room above the picture (a
 *         mirrored band of its top edge darkening into tone), for words over a dusk wall or sky;
 *         layers [{ src, box, part, depth, glow }]: pictures over it (depth > 1 is nearer and moves
 *         more; glow flickers it like lamplight; part [x0,y0,x1,y1] draws only that part of a mostly
 *         transparent cut-out, which saves drawing the rest); split { hole, depth, margin }: cut the picture
 *         into a far layer (inside hole) and a near one (the rest, at depth), for parallax
 *         through a doorway; petals { count, color } and stars { count, zone }: small life.
 * doors:  a still (image = the open painting) plus closed, fore (and forePart), leaves [x0,y0,x1,y1], seam,
 *         swing [a, b] (where in the scene the leaves turn) and angle (degrees). The two leaves are
 *         cut from the closed painting and swung in perspective about their outer edges.
 * room:   each: "function" makes one room per function the guest's family is invited to, from
 *         functions[slot]: a wall in its colour, its painting standing on the floor, framed by
 *         arch (the near wall). floor (y of the floor line), depth { art, arch }, budget (screens
 *         shared by all rooms, so many functions don't make the walk long). The copy zone is
 *         "auto": the wall between the arch's crown and the painting. rest: true makes rooms only
 *         for functions no slot film shows, each placed by its date among the slot films.
 *         plain: true | { ground, stars } draws no walls and no arch: the painting alone on a calm
 *         ground with a few stars, its edges feathered, the words above it (Shalimar). A
 *         function's feather (a fraction, or [left, top, right, bottom]) widens that.
 * slot:   any scene with slot: "haldi" | "mehendi" | ... plays only when the family is invited to
 *         a function in that slot, and carries it for a `function` copy block (one film a function).
 * film:   film: "film.json" (beside walk.json) or inline { fps, count, width, height, dir, ext,
 *         duration, cuts, first }, the prototype's image-sequence format (one image per frame,
 *         numbered 0000.webp...; first, when set, is the folder's frame the film starts at, so a
 *         film cut from a longer one reuses its frames). poster (optional) is shown until frames
 *         arrive. Frames load coarse to fine, nearest the guest first; neighbouring frames are blended. Every film's first
 *         frame and the frames under its words come before the rest, and a scene's words wait for
 *         its picture, with a small loader meanwhile (they come anyway after 7 s). In the site's
 *         phone mockup (?phone=1) a film loads every other frame. secondsPerScreen
 *         (optional) sets length from the duration. Copy "at" is in seconds; zones are in frame
 *         fractions, so a film made from keyframes can say where each keyframe's calm ground is.
 */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const params = new URLSearchParams(location.search);
  const SAATH = window.SAATH || {};
  const ROOT = SAATH.root || "/invite/";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // ?film: the video export films the walk (workers/export, 3 November 2026). It's shown like a
  // catalogue preview (?video: no controls, no settling), but every film loads, and the exporter
  // moves the walk itself through window.__walk.
  const filming = params.has("film");
  const video = params.has("video") || filming;
  const preview = video && !filming;
  const debug = params.has("debug");
  // The family and the wedding's link name come from the page (a family's own link, <slug>/<key>,
  // doesn't say either in its query), or from ?f= and the address.
  const familyParam = (SAATH.family || params.get("f") || "").trim().slice(0, 40);
  const slug = (SAATH.slug || decodeURIComponent(location.pathname.split("/")[2] || "") || "invite").replace(/[^a-z0-9-]/gi, "") || "invite";
  const conn = navigator.connection || {};
  const lean = !!conn.saveData || /2g/.test(conn.effectiveType || "");
  // Inside the site's iPhone mockup (?phone=1, the paywall's and the builder's small phone) a film
  // loads every other frame, blended, half the bytes for a picture a third of the size.
  const small = params.get("phone") === "1";
  // A small phone that also asks for ?hold=1 (the paywall's) keeps its films until the visitor first
  // touches, scrolls or presses a key inside it: the poster and the words show meanwhile, so a visitor
  // who only looks at the opening never fetches the first film (about 3.5 MB for a lake).
  let holding = small && params.has("hold");
  const media =(src) => (/^(data:|blob:|https?:|\/)/.test(src) ? src : `${ROOT}couples/${slug}/${src}`);

  // ───────── Words ─────────
  // A name in the words around it: "the Sharma family" after "For" or "From", a person's name and
  // "Rakesh Roy & family" as they are, and "family" as परिवार on a Hindi page.
  const theFam = (f) => (/\sfamily$/i.test(f) && !/(&|\band)\s+family$/i.test(f) ? `the ${f}` : f);
  const hiFam = (f) => f.replace(/\s+family$/i, " परिवार");
  const UI = {
    en: {
      locale: "en-IN", amp: "&", andJoin: "&", pairJoin: "&",
      invited: "You're invited", dear: (f) => `For ${theFam(f)}`,
      gettingMarried: "are getting married",
      noteK: "A note for you", noteSign: (c) => `With love, ${c}`,
      blessK: "With the blessings of our elders", blessClose: "warmly invite you to the wedding of their children",
      ownVoice: "Together with our families, we invite you to our wedding", and: "and",
      storyK: "Our story", seePhotos: "See our photos", photoOf: (c) => `${c}, a photo`, saveDate: "Save the date", readStory: "Read our whole story",
      addCal: "Add to calendar", wear: "Wear", dressK: "Dress code",
      venueK: "Where we'll be", maps: "Open in Google Maps", directions: "Directions",
      // A function with no set end (onwards, 11 November 2026), as engine.js says it.
      fromTime: (h) => `${h} onwards`,
      replyK: (d, h) => `${d}, at ${h}`, replyT: "Will you join us?", replyBy: (d) => `Please let us know by ${d}.`, replyAny: "It wouldn't be the same without you.",
      reply: "Reply to the invitation", readAll: "Read the whole invitation",
      thanksT: "Thank you", thanksLede: "For coming, for every blessing, and for making it ours.",
      walkIn: "Scroll to walk in", walkOn: "Walk on", backTop: "Back to the door",
      invitation: "Invitation", close: "Close", skip: "Skip the walk and read the invitation", walkLabel: (c) => `A walk through the wedding of ${c}`,
      music: "Play music", musicOff: "Pause music", langSwitch: "हिं", langLabel: "हिंदी में पढ़ें",
      blessing: "With the blessings of our elders, you are invited to the wedding of",
      daughter: "Daughter of", son: "Son of", with: "with", closeLine: "",
      evT: "The celebrations", venueT: "Where we'll be", travelT: "Getting there", stayT: "Where to stay",
      storyT: "Our story", photosT: "Us, so far", dearAll: "Dear friends and family",
      familyT: "Our families", blessT: "With the blessings of", darshan: "Eager to see you", swagat: "Waiting to welcome you", kids: "Don't you dare miss it",
      kidsLine: (k) => `${k} say: you must come to the wedding!`,
      rsvpT: "Will you join us?", rsvpLede: (d) => `Please let us know how many of you are coming to each function, by ${d}.`,
      familyLabel: "Your name", familyPh: "e.g. Shreya Sharma",
      fewer: (n) => `One fewer for ${n}`, more: (n) => `One more for ${n}`,
      send: "Send your reply", rsvpNote: "Your reply reaches them as soon as you send it, and WhatsApp opens with it written out too.",
      needFamily: "Add your name, so they know who's coming.",
      confirmT: "Your reply", confirmFrom: (f) => `From ${theFam(f)}`, notComing: "Not coming",
      confirmNote: (c) => `It goes to ${c} as soon as you send it. WhatsApp opens with it written out too.`,
      confirmSend: "Send", confirmBack: "Change",
      doneT: "Thank you", doneLine: (c) => `Your reply has reached ${c}.`, doneChange: "Change your reply",
      saveFailed: "Your reply didn't reach them from here. Press send in WhatsApp so they still get it.",
      // Without the RSVP manager, the reply goes on WhatsApp only.
      waSend: "Send on WhatsApp", waNote: "This opens WhatsApp with your reply written out. Nothing is sent until you press send.",
      waConfirmNote: (c) => `WhatsApp opens with it written out. Press send there and it reaches ${c}.`, waConfirmSend: "Open WhatsApp",
      contactsT: "If you need anything", call: "Call", callTo: (n) => `Call ${n}`,
      shagunT: "Shagun", shagunLede: "If you'd like to send your blessings from afar.", pay: "Send by UPI",
      upiK: "UPI ID", upiTap: "Tap to copy", upiCopied: "Copied", upiCopy: "Copy the UPI ID",
      songT: "Our song", songPlay: "Play our song", songFrom: (s) => `Plays on ${s}`,
      painted: "See the painted invitation", made: "Invite made with",
      notReady: "This invitation isn't ready yet.",
      waIntro: (f, c) => `Namaste! RSVP${f ? ` from ${theFam(f)}` : ""} for ${c}'s wedding:`,
    },
    hi: {
      locale: "hi-IN", amp: "संग", andJoin: "एवं", pairJoin: "और",
      invited: "आप सादर आमंत्रित हैं", dear: (f) => `${hiFam(f)} के लिए`,
      gettingMarried: "का शुभ विवाह",
      noteK: "आपके लिए दो शब्द", noteSign: (c) => `सप्रेम, ${c}`,
      blessK: "पूज्य बुज़ुर्गों के आशीर्वाद से", blessClose: "अपने बच्चों के शुभ विवाह में आपको सपरिवार सादर आमंत्रित करते हैं।",
      ownVoice: "अपने परिवारों के साथ, हम आपको अपने विवाह में आमंत्रित करते हैं", and: "एवं",
      storyK: "हमारी कहानी", seePhotos: "हमारी तस्वीरें देखें", photoOf: (c) => `${c} की तस्वीर`, saveDate: "शुभ तिथि", readStory: "पूरी कहानी पढ़ें",
      addCal: "कैलेंडर में जोड़ें", wear: "पहनावा", dressK: "पहनावा",
      venueK: "कहाँ मिलेंगे", maps: "गूगल मैप में देखें", directions: "रास्ता देखें",
      fromTime: (h) => `${h} बजे से`,
      replyK: (d, h) => `${d}, ${h} बजे`, replyT: "क्या आप आएँगे?", replyBy: (d) => `कृपया ${d} तक बताइए।`, replyAny: "आपके बिना यह अधूरा होगा।",
      reply: "निमंत्रण का उत्तर दें", readAll: "पूरा निमंत्रण पढ़ें",
      thanksT: "धन्यवाद", thanksLede: "आने के लिए, हर आशीर्वाद के लिए, और इस दिन को हमारा बनाने के लिए।",
      walkIn: "भीतर चलने के लिए सरकाएँ", walkOn: "आगे चलें", backTop: "वापस द्वार पर",
      invitation: "निमंत्रण", close: "बंद करें", skip: "सैर छोड़कर निमंत्रण पढ़ें", walkLabel: (c) => `${c} के विवाह की सैर`,
      music: "संगीत चलाएँ", musicOff: "संगीत रोकें", langSwitch: "EN", langLabel: "Read in English",
      blessing: "पूज्य बुज़ुर्गों के आशीर्वाद से",
      daughter: "सुपुत्री", son: "सुपुत्र", with: "संग", closeLine: "के शुभ विवाह में आप सपरिवार सादर आमंत्रित हैं।",
      evT: "उत्सव", venueT: "कहाँ मिलेंगे", travelT: "कैसे पहुँचें", stayT: "कहाँ ठहरें",
      storyT: "हमारी कहानी", photosT: "अब तक का सफ़र", dearAll: "प्रिय परिवारजन और मित्रो",
      familyT: "हमारे परिवार", blessT: "आशीर्वाद", darshan: "दर्शनाभिलाषी", swagat: "स्वागतोत्सुक", kids: "बाल मनुहार",
      kidsLine: (k) => `${k} की मनुहार: शादी में ज़रूर आना!`,
      rsvpT: "क्या आप आएँगे?", rsvpLede: (d) => `कृपया ${d} तक बताइए कि हर समारोह में आप कितने लोग आएँगे।`,
      familyLabel: "आपका नाम", familyPh: "जैसे, श्रेया शर्मा",
      fewer: (n) => `${n} के लिए एक कम`, more: (n) => `${n} के लिए एक और`,
      send: "अपना उत्तर भेजें", rsvpNote: "भेजते ही आपका उत्तर उन तक पहुँच जाएगा, और व्हाट्सऐप में भी लिखा हुआ खुलेगा।",
      needFamily: "अपना नाम लिखें, ताकि उन्हें पता चले कौन आ रहा है।",
      confirmT: "आपका उत्तर", confirmFrom: (f) => `${hiFam(f)} की ओर से`, notComing: "नहीं आ पाएँगे",
      confirmNote: (c) => `भेजते ही यह ${c} तक पहुँच जाएगा। व्हाट्सऐप में भी यह लिखा हुआ खुलेगा।`,
      confirmSend: "भेजें", confirmBack: "बदलें",
      doneT: "धन्यवाद", doneLine: (c) => `आपका उत्तर ${c} तक पहुँच गया है।`, doneChange: "उत्तर बदलें",
      saveFailed: "आपका उत्तर यहाँ से नहीं पहुँच पाया। व्हाट्सऐप में भेजें दबाएँ, ताकि उन्हें मिल जाए।",
      waSend: "व्हाट्सऐप पर भेजें", waNote: "इससे व्हाट्सऐप में आपका उत्तर लिखा हुआ खुलेगा। भेजें दबाने तक कुछ नहीं जाएगा।",
      waConfirmNote: (c) => `व्हाट्सऐप में यह लिखा हुआ खुलेगा। वहाँ भेजें दबाएँ, तो यह ${c} तक पहुँच जाएगा।`, waConfirmSend: "व्हाट्सऐप खोलें",
      contactsT: "किसी भी ज़रूरत के लिए", call: "कॉल करें", callTo: (n) => `${n} को कॉल करें`,
      shagunT: "शगुन", shagunLede: "अगर आप दूर से आशीर्वाद भेजना चाहें।", pay: "UPI से भेजें",
      upiK: "UPI आईडी", upiTap: "कॉपी करने के लिए छुएँ", upiCopied: "कॉपी हो गया", upiCopy: "UPI आईडी कॉपी करें",
      songT: "हमारा गीत", songPlay: "हमारा गीत सुनें", songFrom: (s) => `${s} पर सुनें`,
      painted: "चित्रित निमंत्रण देखें", made: "निमंत्रण बना",
      notReady: "यह निमंत्रण अभी तैयार नहीं है।",
      waIntro: (f, c) => `नमस्ते! ${c} के विवाह के लिए${f ? ` ${hiFam(f)} का` : ""} उत्तर:`,
    },
  };

  // The invocation each community's card opens with (the painted engine's packs).
  const PACKS = {
    "north-hindu": "॥ श्री गणेशाय नमः ॥", marwari: "॥ श्री गणेशाय नमः ॥", gujarati: "॥ श्री गणेशाय नमः ॥", marathi: "॥ श्री गणेशाय नमः ॥",
    tamil: "உ", bengali: "শ্রী শ্রী প্রজাপতয়ে নমঃ", assamese: "শ্ৰী শ্ৰী প্ৰজাপতয়ে নমঃ", muslim: "بسم الله الرحمن الرحيم", sikh: null, christian: null, none: null,
  };
  // A function's slot from the name guests see, then its id (one added in the editor has an id like
  // "event-mf2k1"): the same rules as the painted engine's (engine.js SLOTS).
  const SLOTS = [
    ["haldi", /haldi|हल्दी|holud|हलुद|halad|हळद|nuoni|নোৱনি|হলুদ|ਹਲਦੀ|vatna|ਵਟਣਾ|maiyan|ਮਾਈਆਂ|mayun|مایوں|ہلدی/, /pithi|पीठी|ubtan|\btel\b|telbaan|ابٹن/],
    ["mehendi", /mehe?ndi|mehandi|मेहंदी|मेंहदी|मेहँदी|मेहेंदी|মেহেন্দি|মেহেন্দী|ਮਹਿੰਦੀ|مہندی/, /henna|\balta\b/],
    ["sangeet", /sangeet|sangit|संगीत|jaago|ਜਾਗੋ|সঙ্গীত|ਸੰਗੀਤ|سنگیت/, /garba|dandiya|cocktail|mehfil|giddha|ਗਿੱਧਾ|qawwali|قوالی/],
    ["reception", /reception|रिसेप्शन|bou ?bh?aa?t|bow ?bh?aa?t|बौभात|রিসেপশন|ৰিচেপচন|ਰਿਸੈਪਸ਼ਨ|ریسیپشن|বৌভাত/, /walima|valima|dinner|banquet|feast|भोज|ولیمہ|ولیمے/],
  ];
  const WEDDING = /wedding|shaadi|shadi|vivah|nikah|phera|lagan|anand|mandap|biye|bibaha?o?|शादी|विवाह|निकाह|फेरे|मंडप|बिये|\bbiya\b|lagna|laavan|লগ্ন|বিয়া|বিবাহ|लग्न|ਵਿਆਹ|ਅਨੰਦ|ਲਾਵਾਂ|نکاح|شادی/;
  const fnName = (e) => `${e.name?.en || ""} ${e.name?.hi || ""}`.toLowerCase();
  const findIn = (list, s) => { for (const [k, a, b] of list) { if (a.test(s)) return [k, 0]; if (b?.test(s)) return [k, 1]; } return null; };
  // A function's Hindi name is kept only while it names the same function as its English one: the
  // usual Wedding renamed to a Gaaye Holud in English kept विवाह under it (engine.js FN_WORDS,
  // 3 November 2026).
  const FN_WORDS = [...SLOTS, ["roka", /roka|रोका|ਰੋਕਾ/], ["engagement", /engag|sagai|सगाई|mangni|मंगनी|kurmai|ਕੁੜਮਾਈ|juroon|joron|জোৰণ|sakharpuda|साखरपुडा|বাগদান|منگنی/, /\bring\b|sakhar|nichay|aa?shirbaa?d|आशीर्वाद|আশীর্বাদ|আঙঠি/], ["pool", /pool|swim|पूल|स्विम/], ["baraat", /ba+ra+t|बारात|ghu[dr]+ ?cha[dr]+h?i|gho[dr]i|घुड़चढ़ी|घोड़ी/], ["sehra", /sehe?ra|सेहरा/], ["dinner", /dinner|banquet|feast|भोज/], ["wedding", WEDDING], ["haldi", /halad|हळद/], ["reception", /स्वागत|वलीमा/], ["wedding", /phere|muhurt|मुहूर्त|आनंद कारज/], ["engagement", /निश्चय|sagaa+i|sagaee/]];
  const fnOf = (s) => findIn(FN_WORDS, (s || "").toLowerCase())?.[0] || "";
  // A Hindi name for several functions matched on any the English shares (engine.js ownHi, 5 November 2026).
  const fnsOf = (s) => { const t = (s || "").toLowerCase(); return new Set(FN_WORDS.filter(([, a, b]) => a.test(t) || b?.test(t)).map(([k]) => k)); };
  const ownHi = (e) => { const hi = fnsOf(e?.name?.hi); if (hi.size < 2) return !hi.size || hi.has(fnOf(e.name.en)); const en = fnsOf(e.name.en); return [...hi].some((k) => en.has(k)); };
  // [slot, how sure]: 0 named for it, 1 held in its place, 2 only its id says so, 3 nothing does
  // (the wedding's slot). A name always beats an id.
  const slotOf = (e) => {
    const n = fnName(e), id = (e.id || "").toLowerCase();
    const byId = findIn(SLOTS, id) || (WEDDING.test(id) ? ["wedding"] : null);
    return findIn(SLOTS, n) || (WEDDING.test(n) ? ["wedding", 0] : null) || (byId ? [byId[0], 2] : ["wedding", 3]);
  };
  const SLOT_FOR = (e) => slotOf(e)[0];
  // The look of each function's room, never the same painting twice (Gautam, 31 October 2026). A
  // painting the couple chose in the editor (event.art) is theirs: a slot's room, or their own
  // slot's room holding the motif or another of the painted theme's paintings (fn-<key>.webp in the
  // theme folder WALK.art names, as every painted theme names them). Of the rest, one named for its
  // slot is served first, and whoever finds theirs taken gets its nearest room if that's free (the
  // reception's for a cocktail night), else its own slot's room holding the painted theme's motif
  // (motif.webp, shown nowhere else in a walk), else any room not yet shown, else its own slot's
  // room bare.
  const NEAR = { haldi: "mehendi", mehendi: "haldi", sangeet: "reception", reception: "sangeet" };
  const roomLooks = (pool) => {
    const fns = WALK.functions || {}, out = new Map(), used = new Set();
    const asks = pool.map((e) => { const [slot, sure] = slotOf(e); return { e, slot, sure }; }).sort((a, b) => a.sure - b.sure || new Date(a.e.start) - new Date(b.e.start));
    const give = (a, k) => { out.set(a.e, fns[k]); used.add(k); };
    const ownRoom = (a) => ({ ...(fns[a.slot] || fns.wedding || Object.values(fns)[0] || {}), trim: null });
    const painted = /^themes\//.test(WALK.art || "");
    let motif = WALK.motif || (painted ? "motif.webp" : null);
    for (const a of asks) {
      const k = typeof a.e.art === "string" && /^[a-z]{2,20}$/.test(a.e.art) ? a.e.art : null;
      if (!k) continue;
      if (Object.hasOwn(fns, k)) give(a, k);
      else if (k === "motif" && motif) { out.set(a.e, { ...ownRoom(a), art: motif }); motif = null; }
      else if (painted && k !== "motif") out.set(a.e, { ...ownRoom(a), art: `fn-${k}.webp` });
    }
    for (const a of asks) if (!out.has(a.e) && fns[a.slot] && !used.has(a.slot)) give(a, a.slot);
    for (const a of asks) {
      if (out.has(a.e)) continue;
      const own = ownRoom(a);
      const near = NEAR[a.slot], spare = Object.keys(fns).find((x) => !used.has(x));
      if (fns[near] && !used.has(near)) give(a, near);
      else if (motif) { out.set(a.e, { ...own, art: motif }); motif = null; }
      else if (spare) give(a, spare);
      else out.set(a.e, { ...own, art: null });
    }
    return out;
  };
  const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv"];
  const WA = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.1 1.6 2.5 4 3.5 1.5.6 2 .7 2.8.6.4-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.3Z"/></svg>`;
  const MINUS = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const PLUS = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M10 5v10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>`;

  // ───────── State ─────────
  let WALK = SAATH.walk || null;
  let data = null, lang = "en", family = null, group = "all";
  // The invite's second language (data.lang2, 10 November 2026), as in engine.js: `lang` stays "en" or
  // "hi" (the second language, whichever it is), TAG is the real language tag and DIR gives an Urdu
  // line dir="auto". The words of languages beyond Hindi come from ../langs.js.
  const LANGS = ["hi", "mr", "bn", "as", "pa", "ur"];
  let L2 = "hi", TAG = "en", DIR = "";
  const tagOf = (l) => (l === "en" ? "en" : L2);
  const PK = () => (L2 === "hi" ? null : window.SaathLangs?.[L2] || null);
  const setTag = () => { TAG = tagOf(lang); DIR = TAG === "ur" ? ' dir="auto"' : ""; document.documentElement.lang = TAG; };
  const tagEl = (el, t = TAG) => { el.lang = t; if (t === "ur") el.dir = "auto"; else el.removeAttribute("dir"); };
  const L2A = () => `lang="${L2}"`; // no dir: an Urdu name keeps the English line's alignment
  // A line's tag from its own script (the monogram's initials, an invocation): Devanagari is the
  // second language's when that is Marathi, Bengali script Assamese on an Assamese invite.
  const scriptTag = (s, fallback = "en") => (/[ऀ-ॿ]/.test(s) ? (L2 === "mr" ? "mr" : "hi") : /[਀-੿]/.test(s) ? "pa" : /[ঀ-৿]/.test(s) ? (L2 === "as" || data?.community === "assamese" ? "as" : "bn") : /[؀-ۿ]/.test(s) && L2 === "ur" ? "ur" : fallback);
  let scenes = [], blocks = [], stops = [], total = 1;
  let CW = 390, CH = 844, dpr = 1, unit = 844, layoutKey = 0;
  let pos = 0, target = 0, dir = 1, dirty = true, lastScene = -1;

  // ───────── Little helpers ─────────
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a || 1e-6)); return x * x * (3 - 2 * x); };
  const EASE = {
    linear: (x) => x,
    in: (x) => x * x,
    out: (x) => 1 - (1 - x) * (1 - x),
    inOut: (x) => (1 - Math.cos(Math.PI * x)) / 2,
    rush: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  };
  const ease = (name) => EASE[name] || EASE.inOut;
  // Ours, with the couple's own words over them (data.words, 2 November 2026; WORDS in lib/wedding.ts),
  // made once per language. The invitation's first line is one line, and the children's line theirs whole.
  let uiWords = null;
  const own = (k) => { const s = data?.words?.[k]?.[lang]; return typeof s === "string" ? s.trim() : ""; };
  const OWN_WORDS = ["dearAll", "storyT", "photosT", "eventsT", "venueT", "travelT", "stayT", "songT", "rsvpT", "contactsT", "shagunT", "shagunLede", "thanksT", "thanksLede", "familyT", "blessT", "darshan", "swagat", "kids"];
  const u_ = () => {
    if (!data) return UI[TAG] || UI.en;
    if (uiWords?.lang !== TAG) {
      const words = { ...UI[TAG] };
      for (const k of OWN_WORDS) if (own(k)) words[k === "eventsT" ? "evT" : k] = own(k);
      if (own("inviteLine")) words.blessing = words.ownVoice = own("inviteLine");
      if (own("kidsLine")) words.kidsLine = () => own("kidsLine");
      uiWords = { lang: TAG, words };
    }
    return uiWords.words;
  };
  // The record without the lines the couple left blank (tidy in engine.js, tidyWedding in lib/wedding.ts).
  function tidy(d) {
    if (!d || typeof d !== "object") return d;
    const filled = (b) => !!b && typeof b === "object" && Object.values(b).some((s) => typeof s === "string" && s.trim());
    const keep = (l, ok) => (Array.isArray(l) ? l.filter((x) => x && ok(x)) : l);
    const fam = d.family && typeof d.family === "object" ? Object.fromEntries(Object.entries(d.family).map(([k, l]) => [k, keep(l, filled)])) : d.family;
    // A function's Hindi name that names another function goes too (ownHi).
    const events = Array.isArray(d.events) ? d.events.map((e) => (e?.name?.hi && !ownHi(e) ? { ...e, name: { en: e.name.en } } : e)) : d.events;
    return { ...d, family: fam, events, timeline: keep(d.timeline, (m) => filled(m.when) || filled(m.what)), travel: keep(d.travel, filled), stay: keep(d.stay, (s) => filled(s.name) || filled(s.note)), contacts: keep(d.contacts, (c) => typeof c.phone === "string" && c.phone.trim()) };
  }
  const pick = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v[lang] || v.en || "" : v ?? "");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // A blessing of several lines, one under another (engine.js omLines).
  const omLines = (s) => String(s).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => `<span style="display:block">${esc(l)}</span>`).join("");
  // Assamese and Punjabi dates from langs.js, since Chrome has neither (engine.js fmt).
  const fmt = (iso, o) => (lang === "hi" && PK()?.meta.months ? window.SaathLangs.format(L2, iso, o) : new Intl.DateTimeFormat(u_().locale, { timeZone: "Asia/Kolkata", ...o }).format(new Date(iso)));
  // Hindi invitations name the part of the day rather than writing am/pm: सुबह 10:30, शाम 7:00.
  // A function's time, with "onwards" when it has no set end (onwards); a language without the words gives the time alone.
  const timeOf = (ev) => { const c = clock(ev.start), w = u_(); return ev.onwards === true && w.fromTime ? w.fromTime(c) : c; };
  const clock = (iso) => {
    if (lang !== "hi") return fmt(iso, { hour: "numeric", minute: "2-digit" });
    if (PK()) return window.SaathLangs.clock(L2, iso);
    const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).split(":").map(Number);
    const part = h < 4 ? "रात" : h < 12 ? "सुबह" : h < 16 ? "दोपहर" : h < 20 ? "शाम" : "रात";
    return `${part} ${h % 12 || 12}:${String(m).padStart(2, "0")}`;
  };
  // Keep "Shri" with the name after it and "&" with the name before it, so lines never break between them.
  // The other scripts' honorifics and joins too, and a Marathi card's सौ. and व (engine.js nb).
  const nb = (v) => {
    const s = nb0(v).replace(/(^|\s)(শ্রীমতী|শ্রী|শ্ৰীমতী|শ্ৰী|স্বৰ্গীয়|স্বর্গীয়|ਸ਼੍ਰੀਮਤੀ|ਸ੍ਰੀਮਤੀ|ਸ਼੍ਰੀ|ਸ੍ਰੀ|ਸਵ\.|ਡਾ\.|جناب|محترمہ|محترم|مرحوم|ڈاکٹر)\s+/g, "$1$2\xa0").replace(/\s+(ও|আৰু|ਅਤੇ|اور)\s+/g, "\xa0$1 ");
    return L2 === "mr" ? s.replace(/(^|\s)(सौ\.|श्री\.|कै\.|चि\.|कु\.)\s+/g, "$1$2\xa0").replace(/\s+(व|आणि)\s+/g, "\xa0$1 ") : s;
  };
  const nb0 = (v) => String(v ?? "").replace(/(^|\s)(Late|Smt\.|Shrimati|Shri|Sri|Shree|Dr\.|Mr\.|Mrs\.|Ms\.|Col\.|Capt\.|Prof\.|श्रीमती|श्री|स्व\.|डॉ\.)\s+/g, "$1$2 ").replace(/\s+(&|एवं|और)\s+/g, " $1 ");
  const has = (v) => (Array.isArray(v) ? v.length > 0 : !!pick(v));
  // A function at a venue of its own (a reception across town): its address or map, 2 November 2026.
  const mapOf = (e) => (typeof e?.map === "string" && /^https:\/\//.test(e.map.trim()) ? e.map.trim() : "");
  const ownVenue = (e) => has(e?.address) || !!mapOf(e);
  // A function at a venue of its own: its town, from the end of its address less the PIN and the state
  // (engine.js awayTown, 5 November 2026).
  const STATES = /^(andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|orissa|punjab|rajasthan|sikkim|tamil ?nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|jammu (and|&) kashmir|ladakh|india|राजस्थान|कर्नाटक|महाराष्ट्र|उत्तर प्रदेश|मध्य प्रदेश|गुजरात|हरियाणा|पंजाब|बिहार|पश्चिम बंगाल|तमिलनाडु|तेलंगाना|केरल|भारत)$/i;
  const awayTown = (e) => {
    const a = String(pick(e.address) || "");
    if (!/,|\d{3}\s?\d{3}/.test(a)) return "";
    const parts = a.split(",").map((s) => s.replace(/[\s\-–]*\d[\d\s]*$/, "").trim()).filter(Boolean);
    while (parts.length > 1 && STATES.test(parts[parts.length - 1])) parts.pop();
    const t = (parts[parts.length - 1] || "").replace(/^[\s(]+|[\s.)\]]+$/g, "");
    if (/\b(rd|road|marg|street|st|lane|highway|nh)\.?$/i.test(t)) return "";
    return t.length <= 24 && !/\d/.test(t) && t.toLowerCase() !== String(pick(e.place) || "").trim().toLowerCase() ? t : "";
  };
  // "Haldi & Wedding", "Haldi, Mehendi & Wedding", "हल्दी एवं विवाह".
  const andList = (l) => { const n = l.filter(Boolean); return n.length > 1 ? `${n.slice(0, -1).join(", ")} ${u_().andJoin} ${n.at(-1)}` : n[0] || ""; };
  const L = () => `lang="${TAG}"${DIR}`;
  const nameOf = (p) => (lang === "hi" ? p?.hi || p?.en : p?.en) || "";
  // Two things about the couple in the order they chose: the bride's first, or the groom's when
  // their family writes it that way (data.groomFirst, Gautam, 30 October 2026).
  const two = (hers, his) => (data?.groomFirst ? [his, hers] : [hers, his]);
  const couple = () => (lang === "hi" ? two(nameOf(data.her), nameOf(data.him)).join(` ${u_().pairJoin} `) : two(data.her.en, data.him.en).join(" & "));
  // How a family is greeted (3 November 2026): by the name exactly as the couple wrote it, or, added
  // before then, its surname with "family" after it unless the name is a person's (engine.js greetName).
  const greetName = (l = lang) => {
    const n = ((l === "hi" && family?.hi) || family?.name || "").trim();
    if (!n || family.asTyped || /^(shri|shree|sri|smt\.?|shrimati|dr\.?|mr\.?|mrs\.?|ms\.?|श्री|श्रीमती|डॉ\.?|শ্রী|শ্রীমতী|শ্ৰী|শ্ৰীমতী|ਸ੍ਰੀ|ਸ਼੍ਰੀ|ਸ੍ਰੀਮਤੀ|ਸ਼੍ਰੀਮਤੀ|جناب|محترم|محترمہ|ڈاکٹر)\s|\s(ji|जी|ਜੀ)$/i.test(n)) return n;
    return `${n.replace(/\s+(family|parivar|pariwar|परिवार|कुटुंब|कुटुंबीय|পরিবার|পৰিয়াল|ਪਰਿਵਾਰ|خاندان)$/i, "")} ${l === "hi" ? PK()?.meta.family || "परिवार" : "family"}`;
  };
  // A function for one family's guests shows in that family's version (engine.js, events).
  const events = () => (data.events || []).filter((e) => e.name && e.start && (!e.for || e.for.includes(group) || e.for.includes(`side:${data.groomFirst ? "groom" : "bride"}`))).slice().sort((a, b) => new Date(a.start) - new Date(b.start));
  const lastEvent = () => [...(data.events || [])].filter((e) => e.start).sort((a, b) => new Date(b.end || b.start) - new Date(a.end || a.start))[0];
  // The wedding itself: by name first, since a roka, an engagement or a tilak also falls in the wedding slot.
  const mainEvent = () => {
    const evs = events();
    // The function at the wedding date and time the couple gave, else the one that day named for the
    // wedding, else the one that day nearest that time. Only with nothing that day, the wedding by name
    // (engine.js mainEvent, 3 November 2026).
    const named = (e) => slotOf(e)[0] === "wedding" && slotOf(e)[1] === 0 && !/roka|engag|sagai|tilak|\bring\b/i.test(fnName(e));
    const byName = (l) => l.find((e) => /^(wedding|nikah|vivah|shaadi|pheras|lagan|anand)/i.test(e.id || "") && (named(e) || slotOf(e)[1] >= 2)) || [...l].reverse().find(named);
    const at = new Date(data.wedding).getTime(), day = istDay(data.wedding);
    const onDay = day ? evs.filter((e) => istDay(e.start) === day) : [];
    const near = [...onDay].sort((a, b) => Math.abs(new Date(a.start) - at) - Math.abs(new Date(b.start) - at))[0];
    return onDay.find((e) => new Date(e.start).getTime() === at) || byName(onDay) || near || byName(evs) || [...evs].reverse().find((e) => SLOT_FOR(e) === "wedding" && !/roka|engage|sagai|tilak|ring/i.test(e.id || "")) || evs[evs.length - 1] || null;
  };
  // The day in India a moment falls on, "" for none.
  const istDay = (iso) => { const t = new Date(iso).getTime(); return Number.isFinite(t) ? new Date(t + 19800000).toISOString().slice(0, 10) : ""; };
  // The time beside the wedding day: the one the couple gave, once changed from the start's 7 pm, else
  // the function's (engine.js gaveTime and weddingAt, 5 November 2026).
  const gaveTime = () => { const t = new Date(data.wedding).getTime(); return Number.isFinite(t) && new Date(t + 19800000).toISOString().slice(11, 16) !== "19:00"; };
  const weddingAt = (m) => (m && istDay(m.start) === istDay(data.wedding) && gaveTime() ? data.wedding : m?.start);
  // A function at a venue of its own that is the main venue all the same (engine.js atMainVenue).
  const atMainVenue = (e) => {
    const v = data.venue;
    if (!v || !e) return false;
    const words = (s) => ` ${String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `;
    const lines = (b) => [b?.en, b?.hi].filter((s) => typeof s === "string" && s.trim()).map(words);
    const map = typeof v.map === "string" ? v.map.trim() : "";
    if (map && typeof e.map === "string" && e.map.trim() === map) return true;
    const address = lines(v.address);
    if (lines(e.address).some((a) => address.includes(a))) return true;
    const names = [v.name?.en, v.name?.hi].map((s) => words(String(s || "").split(",")[0])).filter((n) => n.trim().length >= 5);
    return [...lines(e.place), ...lines(e.address)].some((x) => names.some((n) => x.includes(n)));
  };
  // The invitation's place: the main venue's, or that of the function the date points at when it's at
  // a venue of its own, its place or else its address, with the town (engine.js invPlace, 11 November 2026).
  // The day's wedding itself first, when a function that day is named for it (engine.js WEDDING_FN).
  const WEDDING_FN = /\b(wedding|vivah|vivaah|shaadi|shadi|nikah|nikaah|anand karaj|pheras?|muhurtham?|lagna|kalyanam|biye|marriage)\b|विवाह|शादी|निकाह|फेरे|लग्न|বিয়ে|ਅਨੰਦ/i;
  const invPlace = () => {
    const city = String(pick(data.city) || "").trim();
    const town = city.split(/[,/]/)[0].trim().toLowerCase();
    const m = events().find((e) => istDay(e.start) === istDay(data.wedding) && WEDDING_FN.test(`${e.name?.en || ""} ${e.name?.hi || ""}`)) || mainEvent();
    if (m && istDay(m.start) === istDay(data.wedding) && ownVenue(m) && !atMainVenue(m)) {
      const own = String(pick(m.place) || pick(m.address) || "").trim();
      if (own) return town && !own.toLowerCase().includes(town) ? `${own}, ${city}` : own;
    }
    return has(data.venue?.name) ? `${pick(data.venue.name)}${city ? `, ${city}` : ""}` : "";
  };
  // The functions shown with the wedding date (keyDate) on another day, the guest's own (engine.js keyDates).
  // Or for one family's version only ("side:groom", engine.js isKeyFor).
  const keyDates = () => (data.wedding ? events().filter((e) => (e.keyDate === true || e.keyDate === `side:${data.groomFirst ? "groom" : "bride"}`) && istDay(e.start) !== istDay(data.wedding)) : []);
  // A contact's number as guests read it, the tap-to-call link (engine.js phoneText, 11 November 2026).
  const phoneText = (raw) => {
    const s = String(raw || "").trim();
    const m = /^(?:91|0)?([6-9]\d{9})$/.exec(s.replace(/\D/g, ""));
    return m ? `${/^\+\s*91/.test(s) ? "+91 " : ""}${m[1].slice(0, 5)} ${m[1].slice(5)}` : s;
  };
  // A family-list line ending with a colon is a heading over the names under it (engine.js subHead).
  const subHead = (s) => /[:：]\s*[-–—]?\s*$/.test(String(s || ""));
  const afterWedding = () => { const l = lastEvent(); return !!l && Date.now() > new Date(l.end || l.start).getTime() + 6 * 36e5; };
  const first = (s) => { try { const seg = new Intl.Segmenter(TAG, { granularity: "grapheme" }); return [...seg.segment(s || "")][0]?.segment || ""; } catch { return [...(s || "")][0] || ""; } };

  // Colours, and the contrast rules the painted engine uses.
  const rgbOf = (h) => { const n = parseInt(String(h || "#000").replace("#", "").slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hexOf = (c) => `#${c.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lumOf = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const mixC = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  // A theme colour moved just far enough from its ground (towards white or ink) to read at `need`:1.
  const inkOn = (c, bgL, need = 4.5) => { const to = bgL < 0.28 ? [255, 250, 240] : [24, 14, 8]; for (let t = 0; t <= 1.001; t += 0.04) { const m = mixC(c, to, t); if (contrast(lumOf(m), bgL) >= need) return hexOf(m); } return hexOf(to); };
  const LIGHT = [250, 243, 230], DARK = [42, 26, 20];

  // ───────── Scenes ─────────
  function buildScenes() {
    const list = [];
    const evs = events();
    // Each slot film claims its function first (the one named for the slot, else the first in it).
    // Rooms marked `rest` take only the others (a roka in the haldi slot when the haldi has the
    // film), wherever they stand in the walk, so every function the family is invited to appears once.
    const claimed = new Set(), claimOf = new Map();
    for (const def of WALK.scenes) {
      if (!def.slot || (def.type === "film" && !def.film?.count)) continue;
      const open = evs.filter((e) => !claimed.has(e) && SLOT_FOR(e) === def.slot);
      const ev = open.find((e) => (e.id || "").toLowerCase() === def.slot) || open.find((e) => slotOf(e)[1] === 0) || open[0];
      if (ev) { claimed.add(ev); claimOf.set(def, ev); }
    }
    // Rest rooms wait for their place in time: each goes in before the first function film that is
    // later than it (Saat Rang's cocktail night after the mehendi film, not before it).
    const waiting = [];
    const placeWaiting = (before) => { while (waiting.length && (!before || new Date(waiting[0].event.start) < new Date(before.start))) list.push(waiting.shift()); };
    for (const def of WALK.scenes) {
      // A scene of the design's deity (Ram Mandir's darshan) isn't shown when the couple turns it off.
      if (def.blessing && data.blessing === false) continue;
      if (def.type === "room") {
        const pool = def.rest ? evs.filter((e) => !claimed.has(e)) : evs;
        if (!pool.length) continue;
        const len = Math.min(def.length || 0.9, (def.budget || 3.6) / pool.length);
        const looks = roomLooks(pool);
        pool.forEach((ev, i) => {
          const slot = SLOT_FOR(ev);
          const fn = looks.get(ev) || {};
          (def.rest ? waiting : list).push({ ...def, id: `${def.id}-${i}`, event: ev, slot, fn, length: len, w: 900, h: 1600 });
        });
        continue;
      }
      if (def.type === "film" && !def.film?.count) continue; // its film.json didn't load
      // A scene made for one function (slot: "haldi" …) plays only for families invited to a
      // function in that slot, and carries that function for its `function` copy block.
      if (def.slot) {
        const ev = claimOf.get(def);
        if (!ev) continue;
        placeWaiting(ev);
        const fn = WALK.functions?.[def.slot] || {};
        list.push({ ...def, event: ev, fn });
        continue;
      }
      placeWaiting();
      list.push({ ...def });
    }
    placeWaiting();
    let at = 0;
    list.forEach((s, i) => {
      s.index = i;
      if (s.type === "film") {
        s.w = s.film.width; s.h = s.film.height;
        if (s.secondsPerScreen) s.length = s.film.duration / s.secondsPerScreen;
      } else if (s.type !== "room") { s.w = s.image.w; s.h = s.image.h; }
      s.length = s.length || 1;
      s.start = at;
      at += s.length;
      const ex = s.exit || { type: "cut" };
      s.exit = ex;
      s.exitLen = i < list.length - 1 && (ex.type === "zoom" || ex.type === "fade") ? Math.min(s.length * 0.8, ex.length || 0.4) : 0;
      s.bodyEnd = 1 - s.exitLen / s.length;
      s.prep = s.prep || null;
    });
    scenes = list;
    total = Math.max(0.5, at);
  }
  const sceneAt = (p) => { for (let i = scenes.length - 1; i >= 0; i--) if (p >= scenes[i].start - 1e-9) return scenes[i]; return scenes[0]; };
  const localT = (s, p) => clamp((p - s.start) / s.length);
  const exitU = (s, t) => (s.exitLen ? clamp((t - s.bodyEnd) / (1 - s.bodyEnd)) : 0);

  // ───────── Pictures: loaded in walking order, after the first scene's ─────────
  const IM = new Map();
  const srcUrl = (src) => (/^(https?:|data:|blob:|\/)/.test(src) ? src : ROOT + (WALK.art || "") + src);
  const im = (src) => { if (!src) return null; let e = IM.get(src); if (!e) IM.set(src, (e = { src, img: null, ready: false, state: 0 })); return e; };
  let queue = [], inflight = 0, loadedCount = 0;
  function want(srcs, front = false) {
    const add = srcs.map(im).filter((e) => e && !e.state && !queue.includes(e));
    if (front) queue.unshift(...add); else queue.push(...add);
    pump();
  }
  function pump() {
    while (inflight < 4 && queue.length) {
      const e = queue.shift();
      if (e.state) continue;
      e.state = 1;
      inflight++;
      const img = new Image();
      img.decoding = "async";
      // With CORS, so the words' inks can be measured from the pixels when the art comes from the asset host.
      img.crossOrigin = "anonymous";
      const done = () => { e.img = img; e.ready = true; e.state = 2; inflight--; loadedCount++; arrived(e); pump(); };
      img.onload = () => (img.decode ? img.decode().catch(() => {}).then(done) : done());
      img.onerror = () => { e.state = 3; inflight--; loadedCount++; arrived(e); pump(); };
      img.src = srcUrl(e.src);
    }
    if (!queue.length) pumpFilms();
    loadingBar();
  }
  function sourcesOf(s) {
    if (s.type === "room") return [s.arch?.src, WALK.paper, s.fn?.art].filter(Boolean);
    if (s.type === "doors") return [s.closed, s.image.src, s.fore].filter(Boolean);
    if (s.type === "film") return s.poster ? [s.poster] : [];
    return [s.image.src, ...(s.layers || []).map((l) => l.src)].filter(Boolean);
  }
  // Settled: loaded, or failed (a scene then draws without that picture rather than waiting forever).
  const sourcesReady = (s) => sourcesOf(s).every((x) => im(x).state >= 2);
  const sceneReady = (s) => (s.type === "film" ? filmReadyAt(s, 0) >= 0 : sourcesReady(s) && !!s.prep);
  // Something to see: a scene ready, or a film's poster while its frames come in. A scene's words
  // wait for it (shownAt, the moment it had one), so they never stand on the bare night colour.
  const pictured = (s) => sceneReady(s) || (s.type === "film" && !!s.poster && !!im(s.poster).ready);
  function arrived() {
    let rooms = false;
    for (const s of scenes) if (!s.prep && s.type !== "film" && sourcesReady(s)) {
      try { prepScene(s); } catch (err) { console.warn("walk prep", s.id, err); s.prep = {}; }
      if (s.type === "room") rooms = true;
      remeasure(s);
    }
    for (const s of scenes) if (s.shownAt === undefined && pictured(s)) s.shownAt = now;
    if (rooms && blocks.length) layoutBlocks();
    bufKey = "";
    dirty = true;
  }
  function loadingBar() {
    const want_ = IM.size || 1;
    const bar = $("#loading");
    if (!bar) return;
    bar.firstElementChild.style.transform = `scaleX(${Math.min(1, loadedCount / want_).toFixed(3)})`;
    bar.classList.toggle("done", loadedCount >= want_ && !queue.length && !inflight);
  }

  // ───────── Films: image sequences, coarse to fine, nearest the guest first ─────────
  function prepFilm(s) {
    const F = s.film, N = F.count;
    F.frames = new Array(N); F.ready = new Uint8Array(N); F.busy = new Uint8Array(N); F.order = []; F.cursor = 0;
    F.finest = lean || small ? 2 : 1;
    const seen = new Uint8Array(N);
    const push = (i) => { if (!seen[i]) { seen[i] = 1; F.order.push(i); } };
    push(0); push(N - 1);
    for (const step of [16, 8, 4, 2, 1]) { if (step < F.finest) break; for (let i = 0; i < N; i += step) push(i); }
    F.near = false;
  }
  // first: a film cut from a longer one starts at that frame of its folder (Shalimar's garden and
  // lake, 10 November 2026: film-a3.json and film-b3.json reuse film-a2/ and film-b2/).
  const frameUrl = (s, i) => `${s.film.base}${s.film.dir || ""}${String(i + (s.film.first || 0)).padStart(4, "0")}.${s.film.ext || "webp"}`;
  // Only the films the guest is in or about to reach load (a walk is 25 to 45 MB in all, and a guest
  // may never scroll). Behind them, films keep a coarse set of frames and let the rest go, so a phone
  // never holds hundreds of decoded frames (each about 2.4 MB).
  const AHEAD = 2.5, BEHIND = 1.5, KEEP = 8;
  const filmNear = (x) => x.type === "film" && x.film.order && x.start <= pos + AHEAD && x.start + x.length >= pos - BEHIND;
  // The frames a guest meets first in each film: the one it opens on and the ones under its words.
  // They load for every film early, and stay when a film lets go of the rest, so a guest who scrolls
  // fast finds a picture under the words wherever they stop.
  function keysOf(s) {
    const F = s.film;
    if (!F.keys) {
      const at = (t) => { const j = Math.round(t * (F.count - 1)); return j - (j % F.finest); };
      F.keys = new Set([0, ...blocks.filter((b) => b.scene === s).map((b) => at(b.hold))]);
    }
    return F.keys;
  }
  let keysDone = false;
  function pumpKeys() {
    if (keysDone) return;
    // The films the guest is in or walking towards, nearest first, then the ones behind. Half the
    // connection at most, so the film the guest is in keeps coming in too.
    const gap = (x) => (x.start + x.length < pos ? 1e3 + pos - x.start : Math.max(0, x.start - pos));
    const films = scenes.filter((x) => x.type === "film" && x.film.order).sort((x, y) => gap(x) - gap(y));
    let left = false;
    for (const x of films) for (const j of keysOf(x)) {
      if (x.film.ready[j]) continue;
      left = true;
      if (x.film.busy[j]) continue;
      if (inflight >= 3) return;
      fetchFrame(x, j);
    }
    keysDone = !left;
  }
  let releasedAt = 0;
  function releaseFar() {
    if (now - releasedAt < 1) return;
    releasedAt = now;
    for (const s of scenes) {
      if (s.type !== "film" || !s.film.ready || filmNear(s)) continue;
      const F = s.film, keep = keysOf(s);
      let freed = false;
      for (let i = 1; i < F.count - 1; i++) if (F.ready[i] && i % KEEP && !keep.has(i)) { F.frames[i] = undefined; F.ready[i] = 0; F.busy[i] = 0; freed = true; }
      if (freed) F.cursor = 0;
    }
  }
  function fetchFrame(s, i) {
    const F = s.film;
    F.busy[i] = 1;
    inflight++;
    const img = new Image();
    img.decoding = "async";
    img.crossOrigin = "anonymous";
    img.src = frameUrl(s, i);
    img.decode().then(() => {
      F.frames[i] = img; F.ready[i] = 1;
      if (s.shownAt === undefined) s.shownAt = now;
      if (pos >= s.start - 0.2 && pos <= s.start + s.length) dirty = true;
      if (i === 0) remeasure(s);
      // Words first read against a frame a little way off are read again against their own.
      else for (const b of blocks) if (b.scene === s && measured.has(b) && Math.abs(Math.round(b.hold * (F.count - 1)) - i) <= 1) measured.delete(b);
      bufKey = "";
    })
      .catch(() => { F.busy[i] = 0; })
      .finally(() => { inflight--; pump(); });
  }
  // Every film's coarse frames (one in COARSE, about 2.5 MB for a whole walk) load once the films near
  // the guest have theirs, so a stop the guest jumps to is never empty while its own frames come in.
  const COARSE = 16;
  function pumpFilms() {
    if (!started || queue.length || holding) return; // pictures for the scenes go first
    if (!preview) pumpKeys();
    const todo = (x) => filmNear(x) && x.film.cursor < x.film.order.length && (!preview || x === scenes[0]);
    // The film the guest is in (or about to step into), then the next one ahead, then any behind.
    const s = [sceneAt(pos), sceneAt(pos + 0.5)].find(todo) || scenes.find((x) => todo(x) && x.start > pos) || scenes.find(todo);
    if (s) {
      const F = s.film;
      // A catalogue preview (?video) shows only the first view: the frames up to its first words, so
      // they are read against the picture, and nothing more.
      const first = s.copy?.[0]?.at || [0, 1];
      const upto = preview ? Math.min(F.count - 1, Math.round(((first[0] + first[1]) / 2 / F.duration) * (F.count - 1)) + 6) : F.count - 1;
      const skip = (j) => j > upto || (preview && j % 4 !== 0);
      while (inflight < 6) {
        let i = -1;
        F.near = !F.near;
        if (F.near && pos >= s.start - 0.5 && pos <= s.start + s.length) {
          const c = Math.round(localT(s, pos) * (F.count - 1));
          for (let d = 0; d < 36; d += F.finest) { const j = c + dir * d - (c % F.finest); if (j >= 0 && !skip(j) && !F.ready[j] && !F.busy[j]) { i = j; break; } }
        }
        if (i < 0) { while (F.cursor < F.order.length && (F.ready[F.order[F.cursor]] || F.busy[F.order[F.cursor]] || skip(F.order[F.cursor]))) F.cursor++; i = F.cursor < F.order.length ? F.order[F.cursor] : -1; }
        if (i < 0) break;
        fetchFrame(s, i);
      }
    }
    if (preview || inflight >= 6) return;
    for (const x of scenes) {
      if (x.type !== "film" || !x.film.order) continue;
      const F = x.film;
      for (let j = 0; j < F.count && inflight < 6; j += COARSE) if (!F.ready[j] && !F.busy[j]) fetchFrame(x, j);
      if (inflight >= 6) return;
    }
  }
  const filmReadyAt = (s, i) => { const F = s.film; if (!F.ready) return -1; for (let j = Math.min(i, F.count - 1); j >= 0; j--) if (F.ready[j]) return j; for (let j = i + 1; j < F.count; j++) if (F.ready[j]) return j; return -1; };
  const filmAfter = (s, i) => { const F = s.film; for (let j = i; j < F.count; j++) if (F.ready[j]) return j; return -1; };

  // ───────── Preparing scenes: canvases cut and painted once ─────────
  const canvasOf = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  function prepScene(s) {
    const P = {};
    if (s.type === "room") prepRoom(s, P);
    else {
      const img = im(s.image.src).img;
      if (s.extend) P.edge = edgeColour(img, s.extend.mirror || 0.06);
      if (s.split) prepSplit(s, img, P);
      if (s.stars) P.stars = seeded(s.stars.count || 20, 7).map((r) => ({ x: s.stars.zone[0] + r[0] * (s.stars.zone[2] - s.stars.zone[0]), y: s.stars.zone[1] + r[1] * (s.stars.zone[3] - s.stars.zone[1]), r: 0.5 + r[2] * 0.9, ph: r[3] * 7 }));
    }
    if (s.petals) P.petals = seeded(s.petals.count || 12, 3).map((r) => ({ x: r[0], ph: r[1], sp: 0.03 + r[2] * 0.035, sz: 2.6 + r[3] * 2.6, rot: r[4] * 6.28, spin: (r[5] - 0.5) * 1.6 }));
    s.prep = P;
  }
  function seeded(n, seed) { let x = seed * 9301 + 49297; const r = () => ((x = (x * 9301 + 49297) % 233280) / 233280); return Array.from({ length: n }, () => [r(), r(), r(), r(), r(), r()]); }
  function edgeColour(img, band) {
    const c = canvasOf(24, 6), g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, img.naturalWidth, Math.max(2, img.naturalHeight * Math.min(0.03, band)), 0, 0, 24, 6);
    const px = g.getImageData(0, 0, 24, 6).data; const sum = [0, 0, 0];
    for (let i = 0; i < px.length; i += 4) { sum[0] += px[i]; sum[1] += px[i + 1]; sum[2] += px[i + 2]; }
    return hexOf(sum.map((v) => v / (px.length / 4)));
  }
  // A doorway cut out of the picture: the far layer is the inside of the hole, with its edges smeared
  // outwards (what parallax reveals behind the frame); the near layer is the picture with the hole.
  function prepSplit(s, img, P) {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const [x0, y0, x1, y1] = s.split.hole;
    const sx = Math.round(x0 * iw), sy = Math.round(y0 * ih), sw = Math.round((x1 - x0) * iw), sh = Math.round((y1 - y0) * ih);
    const m = Math.round(Math.max(sw, sh) * (s.split.margin ?? 0.15));
    const far = canvasOf(sw + 2 * m, sh + 2 * m), g = far.getContext("2d");
    g.drawImage(img, sx, sy, sw, sh, m, m, sw, sh);
    g.drawImage(img, sx, sy, 3, sh, 0, m, m, sh);
    g.drawImage(img, sx + sw - 3, sy, 3, sh, m + sw, m, m, sh);
    g.drawImage(far, 0, m, far.width, 3, 0, 0, far.width, m);
    g.drawImage(far, 0, m + sh - 3, far.width, 3, 0, m + sh, far.width, m);
    const kx = s.w / iw, ky = s.h / ih;
    P.far = { c: far, x: (sx - m) * kx, y: (sy - m) * ky, w: far.width * kx, h: far.height * ky };
    const near = canvasOf(iw, ih), n = near.getContext("2d");
    n.drawImage(img, 0, 0);
    n.clearRect(sx, sy, sw, sh);
    P.near = near;
  }
  // A plain room (Shalimar, 10 November 2026: "two arches feels overdoing it"): no walls and no
  // doorway, the function's painting alone on a calm ground with a few stars and a soft glow in
  // its colour, its edges feathered so a painted sky never reads as a box, its words above it.
  // walk.json: "plain": true | { ground, stars } on the room scene, which then needs no arch.
  function prepPlainRoom(s, P) {
    const W = s.w, H = s.h, fn = s.fn, o = s.plain === true ? {} : s.plain;
    const ground = rgbOf(o.ground || fn.wall || WALK.palette?.night || "#111735");
    const acc = rgbOf(fn.accent || WALK.palette?.gold || "#C9A24E");
    const wc = canvasOf(W / 2, H / 2), g = wc.getContext("2d");
    g.scale(0.5, 0.5);
    g.fillStyle = hexOf(ground); g.fillRect(0, 0, W, H);
    const glow = mixC(ground, acc, 0.22), gl = glow.map(Math.round).join(",");
    const lg = g.createRadialGradient(W / 2, H * 0.64, 0, W / 2, H * 0.64, 0.66 * W);
    lg.addColorStop(0, `rgba(${gl},0.6)`); lg.addColorStop(1, `rgba(${gl},0)`);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    for (const r of seeded(o.stars ?? 26, 11)) {
      g.fillStyle = `rgba(232,236,250,${(0.22 + r[2] * 0.5).toFixed(2)})`;
      g.beginPath(); g.arc(r[0] * W, (0.03 + r[1] * 0.4) * H, 0.8 + r[3] * 1.4, 0, Math.PI * 2); g.fill();
    }
    P.wall = wc; P.dark = lumOf(ground) < 0.2; P.wallRgb = ground; P.glow = glow; P.arch = null;
    const art = im(fn.art)?.img;
    let top = 0.5;
    if (art) {
      const [tx0, ty0, tx1, ty1] = fn.trim || [0, 0, 1, 1];
      const aw0 = (tx1 - tx0) * art.naturalWidth, ah0 = (ty1 - ty0) * art.naturalHeight;
      const sc = Math.min((0.84 * W) / aw0, (0.4 * H) / ah0);
      const aw = Math.round(aw0 * sc), ah = Math.round(ah0 * sc), ax = (W - aw) / 2, ay = 0.65 * H - ah / 2;
      const ac = canvasOf(aw, ah), a = ac.getContext("2d");
      a.drawImage(art, tx0 * art.naturalWidth, ty0 * art.naturalHeight, aw0, ah0, 0, 0, aw, ah);
      // Feather all four edges (multiplied in two passes), so the painting melts into the ground.
      // A painting that fills its own rectangle (Mehtab's mehendi terrace) sets a wider feather
      // [left, top, right, bottom] so it never reads as a card laid on the night.
      a.globalCompositeOperation = "destination-in";
      const fz = typeof fn.feather === "number" ? [fn.feather, fn.feather, fn.feather, fn.feather] : fn.feather;
      for (const [x1, y1, len, lo, hi] of [[aw, 0, aw, 0, 2], [0, ah, ah, 1, 3]]) {
        const f = a.createLinearGradient(0, 0, x1, y1), d = Math.min(0.12, 40 / len);
        const e0 = fz ? fz[lo] : d, e1 = fz ? fz[hi] : d;
        for (const k of [0, 0.25, 0.5, 0.75]) {
          const v = (k * k * (3 - 2 * k)).toFixed(3);
          f.addColorStop(k * e0, `rgba(0,0,0,${v})`); f.addColorStop(1 - k * e1, `rgba(0,0,0,${v})`);
        }
        f.addColorStop(e0, "rgba(0,0,0,1)"); f.addColorStop(1 - e1, "rgba(0,0,0,1)");
        a.fillStyle = f; a.fillRect(0, 0, aw, ah);
      }
      P.art = { c: ac, x: ax, y: ay, w: aw, h: ah, top: ay / H };
      top = ay / H;
    }
    s.zoneAuto = [0.1, 0.2, 0.9, Math.max(0.36, top - 0.02)];
    s.archInner = null;
  }
  // A room for one function: its wall, its painting on the floor, and the arch we see it through.
  let sharedArch = null;
  function prepRoom(s, P) {
    if (s.plain) return prepPlainRoom(s, P);
    const W = s.w, H = s.h, fn = s.fn;
    const wall = rgbOf(fn.wall || WALK.palette?.paper), acc = rgbOf(fn.accent || WALK.palette?.accent);
    const dark = lumOf(wall) < 0.2;
    const paper = WALK.paper ? im(WALK.paper)?.img : null;
    const wc = canvasOf(W / 2, H / 2), g = wc.getContext("2d");
    g.scale(0.5, 0.5);
    // A room in one-point perspective: back wall, two side walls, ceiling and floor, lit from within.
    const fy = (s.floor || 0.69) * H;
    const bx0 = 0.25 * W, bx1 = 0.75 * W, by0 = 0.17 * H, vx = 0.5 * W, vy = 0.47 * H;
    const toward = (x, y, tx) => [tx, vy + ((y - vy) * (tx - vx)) / (x - vx)];
    const toY = (x, y, ty) => [vx + ((x - vx) * (ty - vy)) / (y - vy), ty];
    const poly = (pts, fill) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); };
    const shadeOf = (k) => hexOf(mixC(wall, dark ? [0, 0, 0] : [70, 36, 14], k));
    g.fillStyle = hexOf(wall); g.fillRect(0, 0, W, H);
    const floorC = mixC(wall, dark ? [0, 0, 0] : [96, 54, 26], dark ? 0.32 : 0.24);
    const fl0 = toY(bx0, fy, H * 1.02), fr0 = toY(bx1, fy, H * 1.02);
    const fgr = g.createLinearGradient(0, fy, 0, H);
    fgr.addColorStop(0, hexOf(mixC(floorC, [255, 240, 210], dark ? 0.04 : 0.12))); fgr.addColorStop(1, hexOf(mixC(floorC, [0, 0, 0], 0.3)));
    poly([[bx0, fy], [bx1, fy], fr0, fl0], fgr);
    // Floor stones running back to the wall.
    g.save(); g.globalAlpha = dark ? 0.12 : 0.1; g.strokeStyle = "#1b0e06"; g.lineWidth = 2;
    for (let i = -6; i <= 6; i++) { const x = vx + i * (bx1 - bx0) / 6; const [ex] = toY(x, fy, H); g.beginPath(); g.moveTo(x, fy); g.lineTo(ex, H); g.stroke(); }
    for (const yy of [0.72, 0.77, 0.84, 0.93]) { g.beginPath(); g.moveTo(0, yy * H); g.lineTo(W, yy * H); g.stroke(); }
    g.restore();
    const lt = toward(bx0, by0, 0), lb = toward(bx0, fy, 0), rt = toward(bx1, by0, W), rb = toward(bx1, fy, W);
    const sideL = g.createLinearGradient(0, 0, bx0, 0);
    sideL.addColorStop(0, shadeOf(dark ? 0.42 : 0.3)); sideL.addColorStop(1, shadeOf(dark ? 0.22 : 0.12));
    poly([[bx0, by0], lt, lb, [bx0, fy]], sideL);
    const sideR = g.createLinearGradient(W, 0, bx1, 0);
    sideR.addColorStop(0, shadeOf(dark ? 0.42 : 0.3)); sideR.addColorStop(1, shadeOf(dark ? 0.22 : 0.12));
    poly([[bx1, by0], rt, rb, [bx1, fy]], sideR);
    poly([[bx0, by0], [bx1, by0], rt, lt], shadeOf(dark ? 0.5 : 0.34));
    // A painted dado along the foot of the walls, in the function's colour, with a gold line above.
    const dado = hexOf(mixC(wall, acc, dark ? 0.5 : 0.42)), dh = 0.035 * H;
    poly([[bx0, fy - dh], [bx1, fy - dh], [bx1, fy], [bx0, fy]], dado);
    poly([[bx0, fy - dh], toward(bx0, fy - dh, 0), lb, [bx0, fy]], hexOf(mixC(rgbOf(dado), [0, 0, 0], 0.18)));
    poly([[bx1, fy - dh], toward(bx1, fy - dh, W), rb, [bx1, fy]], hexOf(mixC(rgbOf(dado), [0, 0, 0], 0.18)));
    g.strokeStyle = "rgba(214,172,96,0.75)"; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(...toward(bx0, fy - dh - 3, 0)); g.lineTo(bx0, fy - dh - 3); g.lineTo(bx1, fy - dh - 3); g.lineTo(...toward(bx1, fy - dh - 3, W)); g.stroke();
    // The corners where the walls meet, a little darker.
    g.strokeStyle = `rgba(30,14,6,${dark ? 0.35 : 0.14})`; g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx0, by0); g.lineTo(bx0, fy); g.moveTo(bx1, by0); g.lineTo(bx1, fy); g.moveTo(bx0, fy); g.lineTo(bx1, fy); g.stroke();
    if (paper) {
      const pat = g.createPattern(paper, "repeat");
      g.save(); g.globalAlpha = dark ? 0.1 : 0.45; g.globalCompositeOperation = dark ? "screen" : "multiply"; g.fillStyle = pat; g.fillRect(0, 0, W, H); g.restore();
    }
    // Lamplight pooled behind the painting, and on the floor in front of it.
    const lx = W / 2, ly = fy - 0.13 * H;
    const glow = dark ? mixC(wall, acc, 0.5) : mixC(wall, [255, 250, 236], 0.55);
    const gl = glow.map(Math.round).join(",");
    const lg = g.createRadialGradient(lx, ly, 0, lx, ly, 0.6 * W);
    lg.addColorStop(0, `rgba(${gl},${dark ? 0.6 : 0.85})`); lg.addColorStop(1, `rgba(${gl},0)`);
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.save(); g.translate(lx, fy + 0.07 * H); g.scale(1, 0.28);
    const pg = g.createRadialGradient(0, 0, 0, 0, 0, 0.5 * W);
    pg.addColorStop(0, `rgba(${gl},${dark ? 0.35 : 0.45})`); pg.addColorStop(1, `rgba(${gl},0)`);
    g.fillStyle = pg; g.fillRect(-W, -W, 2 * W, 2 * W); g.restore();
    // The corners fall into shadow.
    const vg = g.createRadialGradient(W / 2, H * 0.5, H * 0.26, W / 2, H * 0.5, H * 0.74);
    vg.addColorStop(0, "rgba(20,10,4,0)"); vg.addColorStop(1, `rgba(20,10,4,${dark ? 0.5 : 0.3})`);
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    P.wall = wc;
    P.dark = dark;
    P.wallRgb = wall;
    P.glow = glow;
    // The painting, standing on the floor with a soft contact shadow under it.
    const art = im(fn.art)?.img;
    if (art) {
      const [tx0, ty0, tx1, ty1] = fn.trim || [0, 0, 1, 1];
      const aw0 = (tx1 - tx0) * art.naturalWidth, ah0 = (ty1 - ty0) * art.naturalHeight;
      const sc = Math.min((0.6 * W) / aw0, (0.3 * H) / ah0);
      const aw = aw0 * sc, ah = ah0 * sc, base = fy + 0.085 * H, ax = (W - aw) / 2, ay = base - ah;
      const pad = Math.round(0.05 * H);
      const ac = canvasOf(aw + 2 * pad, ah + 2 * pad), a = ac.getContext("2d");
      const sg = a.createRadialGradient(0, 0, 0, 0, 0, 1);
      sg.addColorStop(0, `rgba(30,14,4,${dark ? 0.55 : 0.32})`); sg.addColorStop(1, "rgba(30,14,4,0)");
      a.save(); a.translate(pad + aw / 2, pad + ah - 4); a.scale(aw * 0.5, 0.028 * H); a.fillStyle = sg; a.beginPath(); a.arc(0, 0, 1, 0, Math.PI * 2); a.fill(); a.restore();
      a.drawImage(art, tx0 * art.naturalWidth, ty0 * art.naturalHeight, aw0, ah0, pad, pad, aw, ah);
      P.art = { c: ac, x: ax - pad, y: ay - pad, w: aw + 2 * pad, h: ah + 2 * pad, top: ay / H };
    }
    P.arch = sharedArch || (sharedArch = archLayer(s));
    s.zoneAuto = [0.17, 0.238, 0.83, Math.max(0.385, (P.art ? P.art.top : 0.5) - 0.018)];
    s.archInner = openingOf(P.arch, s.zoneAuto[1] + 0.02, s.zoneAuto[3]);
  }
  // Where the arch's opening is (its transparent middle) across rows y0..y1 of the room, as
  // [x0, x1] fractions of its width: a room's words keep inside it (Gulabi Gali's arch is narrow).
  function openingOf(c, y0, y1) {
    try {
      const g = c.getContext("2d"), W = c.width;
      let lo = 0, hi = W;
      for (const f of [y0, (y0 + y1) / 2, y1]) {
        const row = g.getImageData(0, Math.round(f * c.height), W, 1).data;
        let a = W >> 1, b = a;
        if (row[a * 4 + 3] > 128) continue;
        while (a > 0 && row[a * 4 + 3] <= 128) a--;
        while (b < W - 1 && row[b * 4 + 3] <= 128) b++;
        lo = Math.max(lo, a); hi = Math.min(hi, b);
      }
      return hi - lo > W * 0.2 ? [lo / W, hi / W] : null;
    } catch { return null; }
  }
  function archLayer(s) {
    const W = s.w, H = s.h, frame = im(s.arch.src).img;
    const c = canvasOf(W, H), g = c.getContext("2d");
    const fh = (W * s.arch.h) / s.arch.w, fy = (H - fh) / 2;
    g.fillStyle = s.plaster || "#E7D6BA";
    g.fillRect(0, 0, W, fy + 2); g.fillRect(0, fy + fh - 2, W, H - fy - fh + 2);
    const paper = WALK.paper ? im(WALK.paper)?.img : null;
    if (paper) { g.save(); g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.55; g.fillStyle = g.createPattern(paper, "repeat"); g.fillRect(0, 0, W, fy + 2); g.fillRect(0, fy + fh - 2, W, H - fy - fh + 2); g.restore(); }
    g.drawImage(frame, 0, fy, W, fh);
    // We stand in the dimmer passage: the near wall is a little darker than the lit room.
    g.save(); g.globalCompositeOperation = "source-atop";
    const dg = g.createLinearGradient(0, 0, 0, H);
    dg.addColorStop(0, "rgba(30,14,6,0.32)"); dg.addColorStop(0.45, "rgba(30,14,6,0.08)"); dg.addColorStop(1, "rgba(30,14,6,0.28)");
    g.fillStyle = dg; g.fillRect(0, 0, W, H);
    g.restore();
    return c;
  }

  // ───────── The camera ─────────
  // A view is { cx, cy, k }: the world point at the centre of the screen and screen pixels per
  // world pixel. A transform is { k, x, y }: screen = world * k + (x, y).
  function boundsOf(s) { const e = s.extend || {}; return { x0: 0, y0: -(e.top || 0) * s.h, x1: s.w, y1: s.h }; }
  function resolveView(s, v) {
    const [x0, y0, x1, y1] = v.box || [0, 0, 1, 1];
    const bw = (x1 - x0) * s.w, bh = (y1 - y0) * s.h;
    const B = boundsOf(s);
    let k = v.mode === "fit" ? Math.min(CW / bw, CH / bh) : Math.max(CW / bw, CH / bh);
    k = Math.max(k, CW / (B.x1 - B.x0), CH / (B.y1 - B.y0)); // never show past the picture's edges
    const vw = CW / k, vh = CH / k;
    const [ax, ay] = v.align || [0.5, 0.5];
    const left = clamp(x0 * s.w - ax * (vw - bw), B.x0, B.x1 - vw), top = clamp(y0 * s.h - ay * (vh - bh), B.y0, B.y1 - vh);
    return { cx: left + vw / 2, cy: top + vh / 2, k };
  }
  function viewsOf(s) {
    if (s._v && s._v.key === layoutKey) return s._v;
    const cam = s.camera || {};
    const to = resolveView(s, cam.to || { box: [0, 0, 1, 1], mode: "fill" });
    let from;
    if (cam.from === "prev") { const p = scenes[s.index - 1]; from = p && p.w === s.w && p.h === s.h ? viewsOf(p).to : to; }
    else from = cam.from ? resolveView(s, cam.from) : to;
    const exit = s.exitLen && s.exit.type === "zoom" ? resolveView(s, { box: s.exit.portal, mode: "fill" }) : null;
    return (s._v = { key: layoutKey, from, to, exit });
  }
  const TX = (v) => ({ k: v.k, x: CW / 2 - v.cx * v.k, y: CH / 2 - v.cy * v.k });
  function lerpView(A, B, e) {
    const r = B.k / A.k;
    if (Math.abs(Math.log(r)) < 1e-3) return { cx: A.cx + (B.cx - A.cx) * e, cy: A.cy + (B.cy - A.cy) * e, k: A.k + (B.k - A.k) * e };
    const k = A.k * Math.pow(r, e);
    const fx = (B.cx * B.k - A.cx * A.k) / (B.k - A.k), fy = (B.cy * B.k - A.cy * A.k) / (B.k - A.k);
    return { cx: fx - ((fx - A.cx) * A.k) / k, cy: fy - ((fy - A.cy) * A.k) / k, k };
  }
  // Where a layer at depth d sits after the camera has moved e of the way from A to B. Every layer
  // grows about the point the move heads for; nearer ones (d > 1) grow faster and are passed.
  function moveT(A, B, e, d, base) {
    const V = lerpView(A, B, e);
    const r = B.k / A.k;
    if (d === 1 && base.k === A.k) return TX(V);
    if (Math.abs(Math.log(r)) < 1e-3) {
      const TA = TX(A), TV = TX(V);
      return { k: base.k, x: base.x + (TV.x - TA.x) * d, y: base.y + (TV.y - TA.y) * d };
    }
    const fx = (B.cx * B.k - A.cx * A.k) / (B.k - A.k), fy = (B.cy * B.k - A.cy * A.k) / (B.k - A.k);
    const Fx = (fx - A.cx) * A.k + CW / 2, Fy = (fy - A.cy) * A.k + CH / 2;
    const den = 1 - d * (1 - A.k / V.k);
    if (den < 0.035) return null;
    const m = 1 / den;
    return { k: base.k * m, x: Fx + (base.x - Fx) * m, y: Fy + (base.y - Fy) * m };
  }
  // How far the camera has come along its move: it moves over camera.span of the scene's body
  // (default all of it), so it can hold still while the words are read.
  const camE = (s, t) => { const [a, b] = s.camera?.span || [0, 1]; return ease(s.camera?.ease)(clamp((t / s.bodyEnd - a) / (b - a || 1))); };
  function layerT(s, d, t) {
    const v = viewsOf(s);
    if (reduced) return TX(lerpView(v.from, v.to, camE(s, t)));
    const T0 = TX(v.from);
    const e1 = camE(s, t);
    let T = moveT(v.from, v.to, e1, d, T0);
    if (!T || !v.exit || t <= s.bodyEnd) return T;
    const TB = moveT(v.from, v.to, 1, d, T0);
    if (!TB) return null;
    return moveT(v.to, v.exit, EASE.rush(exitU(s, t)), d, TB);
  }
  const rectOf = (box, s, T) => ({ x: box[0] * s.w * T.k + T.x, y: box[1] * s.h * T.k + T.y, w: (box[2] - box[0]) * s.w * T.k, h: (box[3] - box[1]) * s.h * T.k });

  // ───────── Drawing ─────────
  // An image covering world rect (x, y, w, h) under T, cut down to what is on screen. `part`
  // ([x0, y0, x1, y1] of the image) draws only that part of it, where it falls in the rect.
  function blit(g, src, x, y, w, h, T, part) {
    if (!src || !T) return;
    if (part) {
      const [p0, q0, p1, q1] = part;
      const nw = src.naturalWidth || src.width, nh = src.naturalHeight || src.height;
      return blitRect(g, src, p0 * nw, q0 * nh, (p1 - p0) * nw, (q1 - q0) * nh, x + p0 * w, y + q0 * h, (p1 - p0) * w, (q1 - q0) * h, T);
    }
    blitRect(g, src, 0, 0, src.naturalWidth || src.width, src.naturalHeight || src.height, x, y, w, h, T);
  }
  function blitRect(g, src, sx, sy, sw, sh, x, y, w, h, T) {
    const dx = x * T.k + T.x, dy = y * T.k + T.y, dw = w * T.k, dh = h * T.k;
    const cx0 = Math.max(dx, -1), cy0 = Math.max(dy, -1), cx1 = Math.min(dx + dw, CW + 1), cy1 = Math.min(dy + dh, CH + 1);
    if (cx1 <= cx0 || cy1 <= cy0 || dw <= 0 || dh <= 0) return;
    g.drawImage(src, sx + ((cx0 - dx) / dw) * sw, sy + ((cy0 - dy) / dh) * sh, ((cx1 - cx0) / dw) * sw, ((cy1 - cy0) / dh) * sh, cx0, cy0, cx1 - cx0, cy1 - cy0);
  }
  let now = 0;
  const flicker = (seed) => (reduced || video ? 0.75 : 0.66 + 0.18 * Math.sin(now * 7.1 + seed) + 0.1 * Math.sin(now * 12.7 + seed * 2.3) + 0.06 * Math.sin(now * 23.3 + seed * 0.7));

  function drawScene(g, s, t, quiet = false) {
    g.fillStyle = s.type === "room" ? s.fn.wall || "#1d1712" : WALK.palette?.night || "#16110d";
    g.fillRect(0, 0, CW, CH);
    if (s.type === "room") drawRoom(g, s, t, quiet);
    else if (s.type === "doors") drawDoors(g, s, t, quiet);
    else if (s.type === "film") drawFilm(g, s, t);
    else drawStill(g, s, t, quiet);
  }
  function drawExtension(g, s, img, T) {
    if (!img || !T) return;
    const e = s.extend, top = T.y;
    const x = T.x, w = s.w * T.k, mh = (e.mirror || 0.08) * s.h * T.k;
    // A preview with no size yet (a frame still hidden) places it nowhere: a gradient over NaN throws.
    if (!(top > 0) || !(mh > 0) || !Number.isFinite(x + w)) return;
    g.fillStyle = s.prep?.edge || e.tone || "#111";
    g.fillRect(x, 0, w, Math.max(0, top - mh + 1));
    g.save(); g.translate(0, top); g.scale(1, -1);
    g.drawImage(img, 0, 0, img.naturalWidth, (e.mirror || 0.08) * img.naturalHeight, x, 0, w, mh);
    g.restore();
    // The mirrored band dissolves into the plain tone before it ends, so it never shows an edge.
    const edge = rgbOf(s.prep?.edge || e.tone || "#111").join(",");
    const bg = g.createLinearGradient(0, top - mh * 0.15, 0, top - mh);
    bg.addColorStop(0, `rgba(${edge},0)`); bg.addColorStop(1, `rgba(${edge},1)`);
    g.fillStyle = bg; g.fillRect(x, top - mh - 1, w, mh * 0.85 + 1);
    const full = (e.top || 0.3) * s.h * T.k;
    const gr = g.createLinearGradient(0, top, 0, top - full);
    const tone = rgbOf(e.tone || "#000").join(",");
    gr.addColorStop(0, `rgba(${tone},0)`); gr.addColorStop(0.3, `rgba(${tone},${(e.dark ?? 0.8) * 0.55})`); gr.addColorStop(1, `rgba(${tone},${e.dark ?? 0.8})`);
    g.fillStyle = gr; g.fillRect(x, 0, w, top + 1);
  }
  function drawLayers(g, s, t, quiet) {
    (s.layers || []).forEach((l, i) => {
      const e = im(l.src);
      if (!e?.ready) return;
      const T = layerT(s, l.depth || 1, t);
      if (!T) return;
      const [x0, y0, x1, y1] = l.box || [0, 0, 1, 1];
      blit(g, e.img, x0 * s.w, y0 * s.h, (x1 - x0) * s.w, (y1 - y0) * s.h, T, l.part);
      if (l.glow && !quiet) {
        g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = clamp(l.glow * flicker(i * 3.1) * 0.6, 0, 1);
        blit(g, e.img, x0 * s.w, y0 * s.h, (x1 - x0) * s.w, (y1 - y0) * s.h, T, l.part);
        g.restore();
      }
    });
  }
  function drawStill(g, s, t, quiet) {
    const e = im(s.image.src);
    if (!e?.ready) return;
    const T = layerT(s, 1, t);
    if (s.extend) drawExtension(g, s, e.img, T);
    if (s.split && s.prep?.far) {
      const f = s.prep.far;
      blit(g, f.c, f.x, f.y, f.w, f.h, T);
      const N = layerT(s, s.split.depth || 1.3, t);
      blit(g, s.prep.near, 0, 0, s.w, s.h, N);
    } else blit(g, e.img, 0, 0, s.w, s.h, T);
    drawLayers(g, s, t, quiet);
    if (s.prep?.stars && !quiet) drawStars(g, s, T);
    if (s.prep?.petals && !quiet && !reduced) drawPetals(g, s, t);
  }
  function drawStars(g, s, T) {
    // Stars keep out from behind the words, where a twinkle would read as a speck on the letters.
    const near = blocks.filter((b) => b.scene === s && b.on).map((b) => ({ x0: b.x - 18, x1: b.x + b.w + 18, y0: b.y - 18, y1: b.y + b.h + 18 }));
    g.save(); g.globalCompositeOperation = "lighter";
    for (const st of s.prep.stars) {
      const x = st.x * s.w * T.k + T.x, y = st.y * s.h * T.k + T.y;
      if (near.some((r) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1)) continue;
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(now * (0.8 + st.r) + st.ph));
      g.fillStyle = `rgba(255,246,226,${a.toFixed(3)})`;
      g.beginPath(); g.arc(x, y, st.r, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }
  // Marigold petals drifting down through the courtyard, nearer than anything else.
  function drawPetals(g, s, t) {
    const presence = smooth(0, 0.12, t) * (1 - smooth(s.bodyEnd, s.bodyEnd + 0.2, t));
    if (presence <= 0.01) return;
    const col = rgbOf(s.petals.color || "#E8891C");
    const lift = t * CH * 0.6, span = CH + 80;
    for (const p of s.prep.petals) {
      const y = (p.ph + now * p.sp) * span - lift * (p.sz / 8);
      const yy = ((y % span) + span) % span - 40;
      const x = p.x * CW + Math.sin(now * 0.6 + p.ph * 9) * 22;
      g.save();
      g.translate(x, yy); g.rotate(p.rot + now * p.spin); g.scale(1, 0.35 + 0.4 * Math.abs(Math.sin(now * 1.3 + p.ph * 5)));
      g.globalAlpha = 0.7 * presence;
      const pg = g.createLinearGradient(-p.sz, 0, p.sz, 0);
      pg.addColorStop(0, hexOf(mixC(col, [120, 40, 0], 0.3))); pg.addColorStop(1, hexOf(mixC(col, [255, 210, 120], 0.25)));
      g.fillStyle = pg;
      // A petal: rounded at the tip, narrow where it left the flower.
      g.beginPath(); g.moveTo(-p.sz, 0); g.quadraticCurveTo(-p.sz * 0.2, -p.sz * 0.75, p.sz, -p.sz * 0.15); g.quadraticCurveTo(p.sz * 0.35, p.sz * 0.6, -p.sz, 0); g.fill();
      g.restore();
    }
  }

  // Two leaves cut from the closed painting turn inwards about their outer edges, in perspective,
  // drawn as thin vertical strips; the courtyard's light comes through the widening gap.
  function drawDoors(g, s, t, quiet) {
    const open = im(s.image.src), closed = im(s.closed), fore = im(s.fore);
    const T = layerT(s, 1, t);
    const [sw0, sw1] = s.swing || [0.2, 0.75];
    const w = reduced ? smooth(0.42, 0.58, (t - sw0) / (sw1 - sw0)) : EASE.inOut(clamp((t - sw0) / (sw1 - sw0)));
    const base = w > 0 && open?.ready ? open.img : closed?.img;
    if (!base) return;
    if (s.extend) drawExtension(g, s, base, T);
    blit(g, base, 0, 0, s.w, s.h, T);
    const [x0, y0, x1, y1] = s.leaves;
    let gap = 0;
    if (reduced) {
      if (w > 0 && w < 1 && closed?.ready) { g.globalAlpha = 1 - w; blit(g, closed.img, 0, 0, s.w, s.h, T); g.globalAlpha = 1; }
    } else if (w > 0 && closed?.ready && open?.ready) {
      if (w < 0.08) {
        g.save(); g.globalAlpha = 1 - w / 0.08; g.beginPath(); g.rect(0, 0, CW, CH);
        const r = rectOf(s.leaves, s, T); g.rect(r.x + r.w, r.y, -r.w, r.h); g.clip("evenodd");
        blit(g, closed.img, 0, 0, s.w, s.h, T); g.restore();
      }
      if (w < 1) gap = drawLeaves(g, s, T, w, closed.img);
    }
    // Light: first a line at the seam, then a bloom in the gap and a wedge spilling on the floor.
    if (!quiet && !reduced) {
      const pre = smooth(sw0 - 0.13, sw0, t) * (1 - smooth(0.5, 1, w));
      const sx = (s.seam || 0.5) * s.w * T.k + T.x, top = y0 * s.h * T.k + T.y, bot = y1 * s.h * T.k + T.y, hgt = bot - top;
      if (pre > 0.01) {
        g.save(); g.globalCompositeOperation = "lighter";
        const half = Math.max(1, gap / 2) + 7 + 9 * pre;
        const lg = g.createLinearGradient(sx - half, 0, sx + half, 0);
        lg.addColorStop(0, "rgba(255,160,70,0)"); lg.addColorStop(0.5, `rgba(255,186,110,${(0.32 * pre).toFixed(3)})`); lg.addColorStop(1, "rgba(255,160,70,0)");
        g.fillStyle = lg; g.fillRect(sx - half, top, half * 2, hgt);
        g.fillStyle = `rgba(255,214,150,${(0.55 * pre * (1 - smooth(0, 0.1, w))).toFixed(3)})`;
        g.fillRect(sx - 0.6 - Math.min(gap, 6) / 2, top + 2, 1.2 + Math.min(gap, 6), hgt - 4);
        g.restore();
      }
      const bloom = Math.sin(Math.PI * clamp(w)) * (1 - smooth(0.6, 1, w));
      if (bloom > 0.01) {
        g.save(); g.globalCompositeOperation = "lighter";
        const by = top + hgt * 0.55, br = hgt * 0.75;
        const rg = g.createRadialGradient(sx, by, 0, sx, by, br);
        rg.addColorStop(0, `rgba(255,190,110,${(0.32 * bloom).toFixed(3)})`); rg.addColorStop(1, "rgba(255,170,90,0)");
        g.fillStyle = rg; g.fillRect(sx - br, by - br, br * 2, br * 2);
        const half0 = Math.max(4, gap * 0.48), half1 = half0 * 1.7 + 40;
        const fg = g.createLinearGradient(0, bot, 0, CH);
        fg.addColorStop(0, `rgba(255,180,100,${(0.3 * bloom).toFixed(3)})`); fg.addColorStop(1, "rgba(255,170,90,0)");
        g.fillStyle = fg;
        g.beginPath(); g.moveTo(sx - half0, bot); g.lineTo(sx + half0, bot); g.lineTo(sx + half1, CH); g.lineTo(sx - half1, CH); g.closePath(); g.fill();
        g.restore();
      }
    }
    if (fore?.ready) {
      blit(g, fore.img, 0, 0, s.w, s.h, T, s.forePart);
      if (!quiet) { g.save(); g.globalCompositeOperation = "lighter"; g.globalAlpha = clamp(0.33 * flicker(1.7)); blit(g, fore.img, 0, 0, s.w, s.h, T, s.forePart); g.restore(); }
    }
  }
  function drawLeaves(g, s, T, w, img) {
    const [x0, y0, x1, y1] = s.leaves, mid = s.seam || (x0 + x1) / 2;
    const th = (w * (s.angle || 80) * Math.PI) / 180, cos = Math.cos(th), sin = Math.sin(th);
    const X = (x) => x * s.w * T.k + T.x, Y = (y) => y * s.h * T.k + T.y;
    const top = Y(y0), bot = Y(y1), Py = (top + bot) / 2, Px = X(mid), f = (bot - top) * 2.3;
    const iw = img.naturalWidth, ih = img.naturalHeight, sy = y0 * ih, sh = (y1 - y0) * ih;
    const alpha = 1 - smooth(0.8, 1, w);
    const N = 40, free = [];
    g.save();
    g.globalAlpha = alpha;
    for (const side of [-1, 1]) {
      const hinge = side < 0 ? X(x0) : X(x1), lw = Math.abs(Px - hinge), span = side < 0 ? mid - x0 : x1 - mid;
      const at = (u) => { const sc = f / (f + u * lw * sin); return { x: Px + (hinge - side * u * lw * cos - Px) * sc, sc }; };
      for (let j = 0; j < N; j++) {
        const u0 = j / N, u1 = (j + 1) / N, um = (u0 + u1) / 2;
        const a = at(u0), b = at(u1), m = at(um);
        const dx = Math.min(a.x, b.x), dw = Math.abs(b.x - a.x) + 0.7;
        const yt = Py + (top - Py) * m.sc, yb = Py + (bot - Py) * m.sc;
        const fx0 = side < 0 ? x0 + u0 * span : x1 - u1 * span;
        g.drawImage(img, fx0 * iw, sy, (span / N) * iw, sh, dx, yt, dw, yb - yt);
      }
      // The leaf darkens as it turns away from the lamps on the threshold, most at its free edge.
      const e = at(1);
      if (sin > 0.01) {
        const h0 = at(0);
        g.beginPath();
        g.moveTo(h0.x, top); g.lineTo(e.x, Py + (top - Py) * e.sc); g.lineTo(e.x, Py + (bot - Py) * e.sc); g.lineTo(h0.x, bot); g.closePath();
        const sg = g.createLinearGradient(h0.x, 0, e.x, 0);
        sg.addColorStop(0, `rgba(12,7,4,${(0.16 * sin).toFixed(3)})`); sg.addColorStop(1, `rgba(12,7,4,${(0.5 * sin).toFixed(3)})`);
        g.fillStyle = sg; g.fill();
      }
      free.push(e.x);
      if (sin > 0.05) {
        const yt = Py + (top - Py) * e.sc, yb = Py + (bot - Py) * e.sc;
        g.fillStyle = `rgba(28,16,8,${(0.6 * sin).toFixed(3)})`;
        g.fillRect(e.x - (side < 0 ? 0 : 2.5 * sin), yt, 2.5 * sin, yb - yt);
      }
    }
    g.restore();
    return Math.max(0, free[1] - free[0]);
  }

  function drawRoom(g, s, t, quiet) {
    const P = s.prep;
    if (!P?.wall) return;
    const T = layerT(s, 1, t);
    blit(g, P.wall, 0, 0, s.w, s.h, T);
    if (!quiet && !reduced) {
      const f = flicker(s.index * 2.3);
      const lx = 0.5 * s.w * T.k + T.x, ly = ((s.floor || 0.75) - 0.15) * s.h * T.k + T.y, r = 0.55 * s.w * T.k;
      g.save(); g.globalCompositeOperation = P.dark ? "lighter" : "soft-light";
      const lg = g.createRadialGradient(lx, ly, 0, lx, ly, r);
      lg.addColorStop(0, `rgba(255,214,150,${(0.1 * f).toFixed(3)})`); lg.addColorStop(1, "rgba(255,214,150,0)");
      g.fillStyle = lg; g.fillRect(lx - r, ly - r, r * 2, r * 2); g.restore();
    }
    const u = exitU(s, t);
    if (P.art) {
      const A = layerT(s, s.depth?.art || 1.14, t);
      const fade = 1 - smooth(0, 0.3, u);
      if (A && fade > 0.01) { g.globalAlpha = fade; blit(g, P.art.c, P.art.x, P.art.y, P.art.w, P.art.h, A); g.globalAlpha = 1; }
    }
    if (s.plain) return; // a plain room has no doorway
    const R = layerT(s, s.depth?.arch || 1.45, t);
    if (R) blit(g, P.arch, 0, 0, s.w, s.h, R);
  }

  function drawFilm(g, s, t) {
    const F = s.film;
    const p = t * (F.count - 1);
    const a = F.ready ? filmReadyAt(s, Math.floor(p)) : -1;
    const T = layerT(s, 1, t);
    if (a < 0) { const pe = s.poster && im(s.poster); if (pe?.ready) blit(g, pe.img, 0, 0, s.w, s.h, T); return; }
    blit(g, F.frames[a], 0, 0, s.w, s.h, T);
    const b = filmAfter(s, Math.floor(p) + 1);
    if (b > a) { const f = (p - a) / (b - a); if (f > 0.01) { g.globalAlpha = Math.min(1, f); blit(g, F.frames[b], 0, 0, s.w, s.h, T); g.globalAlpha = 1; } }
  }

  // A cusped arch (or a plain rectangle) over the screen rect r, for doorways the camera flies into.
  function tracePortal(g, ex, r) {
    if (ex.shape !== "arch") { g.rect(r.x, r.y, r.w, r.h); return; }
    const rise = (ex.rise ?? 0.4) * r.h, x0 = r.x, x1 = r.x + r.w, yb = r.y + r.h, ys = r.y + rise, xc = r.x + r.w / 2;
    const lobes = ex.lobes ?? 4;
    const half = (s) => {
      const p = [[x0, ys], [x0, ys - rise * 0.72], [xc - (xc - x0) * 0.22, r.y + rise * 0.4], [xc, r.y]];
      const at = (u) => { const v = 1 - u; return [0, 1].map((k) => v * v * v * p[0][k] + 3 * v * v * u * p[1][k] + 3 * v * u * u * p[2][k] + u * u * u * p[3][k]); };
      const pts = Array.from({ length: lobes + 1 }, (_, j) => at(j / lobes));
      return s ? pts.map(([x, y]) => [2 * xc - x, y]).reverse() : pts;
    };
    const left = half(false), right = half(true);
    g.moveTo(x0, yb); g.lineTo(x0, ys);
    const bump = (a, b, inward) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; const k = 0.28 * l * inward; g.quadraticCurveTo(mx + (dy / l) * k, my - (dx / l) * k, b[0], b[1]); };
    for (let i = 1; i < left.length; i++) bump(left[i - 1], left[i], 1);
    for (let i = 1; i < right.length; i++) bump(right[i - 1], right[i], 1);
    g.lineTo(x1, yb); g.closePath();
  }

  // The next scene's first view, rendered once and reused while the camera flies into it.
  let bufC = null, bufKey = "";
  function nextBuffer(B) {
    const key = `${B.index}:${layoutKey}:${sceneReady(B) ? 1 : 0}`;
    if (bufC && bufKey === key) return bufC;
    bufC = bufC || document.createElement("canvas");
    if (bufC.width !== cvs.width || bufC.height !== cvs.height) { bufC.width = cvs.width; bufC.height = cvs.height; }
    const g = bufC.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingQuality = "high";
    drawScene(g, B, 0, true);
    bufKey = key;
    return bufC;
  }
  function drawPortal(g, A, B, t) {
    const u = exitU(A, t), e = EASE.rush(u);
    const T = layerT(A, 1, t);
    const R = rectOf(A.exit.portal, A, T);
    // A lit room falls into its own warm shadow; a dusk scene into night.
    const light = A.type === "room" && A.prep && !A.prep.dark;
    g.save();
    g.fillStyle = light ? `rgba(112,52,18,${(0.34 * e).toFixed(3)})` : `rgba(10,6,3,${(0.6 * e).toFixed(3)})`;
    g.beginPath(); g.rect(0, 0, CW, CH); tracePortal(g, A.exit, R); g.fill("evenodd");
    g.restore();
    const vx0 = Math.max(0, R.x), vy0 = Math.max(0, R.y), vx1 = Math.min(CW, R.x + R.w), vy1 = Math.min(CH, R.y + R.h);
    if (vx1 <= vx0 || vy1 <= vy0) return;
    const kC = Math.max((vx1 - vx0) / CW, (vy1 - vy0) / CH);
    const kD = 1 + 0.5 * Math.pow(1 - e, 1.4);
    const sc = kC * kD, cx = (vx0 + vx1) / 2, cy = (vy0 + vy1) / 2;
    const buf = nextBuffer(B);
    g.save();
    g.beginPath(); tracePortal(g, A.exit, R); g.clip();
    g.globalAlpha = smooth(0, 0.18, u);
    g.drawImage(buf, cx - (CW * sc) / 2, cy - (CH * sc) / 2, CW * sc, CH * sc);
    g.restore();
    // through: the doorway's frame left inside the portal's box (an arch's spandrels) dissolves
    // into the next scene over the zoom's last part, so the cut after it shows nothing.
    const thr = A.exit.through || 0;
    if (thr > 0 && A.exit.shape === "arch") {
      const k = smooth(1 - thr, 1, u);
      if (k > 0.002) {
        g.save();
        g.beginPath(); g.rect(R.x, R.y, R.w, R.h); g.clip();
        g.globalAlpha = k;
        g.drawImage(buf, cx - (CW * sc) / 2, cy - (CH * sc) / 2, CW * sc, CH * sc);
        g.restore();
      }
    }
    const halo = smooth(0, 0.1, u) * (1 - smooth(0.45, 0.95, u));
    const lw = Math.max(1, Math.min(R.w, R.h) / 60);
    if (halo > 0.01 && light) {
      // In a lit room the doorway is just a clean cut in the wall, with the shadow of its depth.
      g.save(); g.lineWidth = 2.2 * lw; g.strokeStyle = `rgba(70,34,12,${(0.32 * halo).toFixed(3)})`; g.beginPath(); tracePortal(g, A.exit, R); g.stroke(); g.restore();
    } else if (halo > 0.01) {
      g.save(); g.globalCompositeOperation = "lighter";
      for (const [k, a] of [[14, 0.1], [6, 0.18], [2, 0.3]]) { g.lineWidth = k * lw; g.strokeStyle = `rgba(255,200,130,${(a * halo).toFixed(3)})`; g.beginPath(); tracePortal(g, A.exit, R); g.stroke(); }
      g.restore();
    }
  }

  // Reduced motion: each scene holds one view, and the walk fades from one to the next.
  let rKeys = [];
  function reducedKeys() {
    rKeys = [];
    for (const s of scenes) {
      const bs = blocks.filter((b) => b.scene === s);
      if (bs.length) bs.forEach((b) => rKeys.push({ s, t: b.hold, p: (b.a + b.b) / 2 }));
      else rKeys.push({ s, t: 0.4, p: s.start + 0.4 * s.length });
    }
    rKeys.sort((a, b) => a.p - b.p);
  }
  const rBuf = [null, null], rKey = ["", ""];
  function keyFrame(i, slot) {
    const k = rKeys[i];
    const key = `${i}:${layoutKey}:${sceneReady(k.s) ? 1 : 0}`;
    if (rBuf[slot] && rKey[slot] === key) return rBuf[slot];
    const c = rBuf[slot] || (rBuf[slot] = document.createElement("canvas"));
    if (c.width !== cvs.width || c.height !== cvs.height) { c.width = cvs.width; c.height = cvs.height; }
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene(g, k.s, k.t, true);
    rKey[slot] = key;
    return c;
  }
  function drawReduced(g, p) {
    let i = 0;
    while (i < rKeys.length - 1 && rKeys[i + 1].p <= p) i++;
    const a = keyFrame(i, i % 2);
    g.drawImage(a, 0, 0, CW, CH);
    const nx = rKeys[i + 1];
    if (nx) {
      const mid = (rKeys[i].p + nx.p) / 2, span = Math.min(0.25, (nx.p - rKeys[i].p) / 2);
      const f = smooth(mid - span, mid + span, p);
      if (f > 0) { g.globalAlpha = f; g.drawImage(keyFrame(i + 1, (i + 1) % 2), 0, 0, CW, CH); g.globalAlpha = 1; }
    }
  }

  // ───────── One frame ─────────
  const cvs = $("#film"), ctx = cvs.getContext("2d", { alpha: false });
  function frame() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingQuality = "high";
    if (!scenes.length) return;
    if (reduced) drawReduced(ctx, pos);
    else {
      const s = sceneAt(pos), t = localT(s, pos), nx = scenes[s.index + 1];
      drawScene(ctx, s, t);
      if (nx && s.exitLen && t > s.bodyEnd) {
        if (s.exit.type === "zoom") drawPortal(ctx, s, nx, t);
        else if (s.exit.type === "fade") { ctx.globalAlpha = EASE.inOut(exitU(s, t)); ctx.drawImage(nextBuffer(nx), 0, 0, CW, CH); ctx.globalAlpha = 1; }
      }
    }  }

  // ───────── The words ─────────
  function dateRange() {
    const evs = events();
    if (!evs.length) return data.wedding ? fmt(data.wedding, { day: "numeric", month: "long", year: "numeric" }) : "";
    const a = new Date(evs[0].start), b = new Date(evs[evs.length - 1].start);
    const f = new Intl.DateTimeFormat(u_().locale, { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" });
    if (a.toDateString() === b.toDateString() || !f.formatRange) return f.format(b);
    try { return f.formatRange(a, b); } catch { return f.format(b); }
  }
  const ornament = () => (WALK.ornament ? `<img class="orn" src="${srcUrl(WALK.ornament)}" alt="" aria-hidden="true">` : "");
  function blockHtml(id, s) {
    const u = u_();
    if (id === "arrival") {
      const names = lang === "hi"
        ? `<h1 class="names" ${L()}>${two(esc(nameOf(data.her)), esc(nameOf(data.him))).join(` <span class="amp">${esc(u.amp)}</span> `)}</h1>`
        : `<h1 class="names">${two(esc(data.her.en), esc(data.him.en)).join(` <span class="amp">&amp;</span> `)}</h1>`;
      const when = [dateRange(), pick(data.city)].filter(Boolean).join(" · ");
      return `<p class="k" ${L()}>${esc(family ? u.dear(greetName()) : u.invited)}</p>${names}${ornament()}${when ? `<p class="meta" ${L()}>${esc(when)}</p>` : ""}`;
    }
    if (id === "note") {
      if (!has(family?.note)) return "";
      return `<p class="tag-k" ${L()}>${esc(u.noteK)}</p><p class="tag-note" ${L()}>${esc(pick(family.note))}</p><p class="tag-sign" ${L()}>${esc(u.noteSign(lang === "hi" ? two(nameOf(data.her), nameOf(data.him)).join(` ${u.pairJoin} `) : two(data.her.en, data.him.en).join(" and ")))}</p>`;
    }
    if (id === "blessing") {
      const p = data.parents || {};
      // A walk with an invocation of its own (Ram Mandir's ॥ जय सियाराम ॥) opens the blessing with it,
      // or with the line the couple chose, unless they turned it off.
      const omText = (lang === "hi" && data.invocationHi) || data.invocation || WALK.invocation;
      const omTag = scriptTag(String(omText || ""), "");
      const om = WALK.invocation && data.invocation !== false ? `<p class="om" dir="auto"${omTag && omTag !== "hi" ? ` lang="${omTag}"` : ""}>${omLines(omText)}</p>` : "";
      if (!has(p.her) && !has(p.him)) return `${om}<p class="body lead" ${L()}>${esc(u.ownVoice)}</p>`;
      // Their families in the couple's order.
      return `${om}<p class="k" ${L()}>${esc(u.blessK)}</p>
        ${two(p.her, p.him).filter(has).map((v) => `<p class="parents" ${L()}>${esc(nb(pick(v)))}</p>`).join(`
        <p class="and" ${L()}>${esc(u.and)}</p>
        `)}
        <p class="body" ${L()}>${esc(u.blessClose)}</p>`;
    }
    if (id === "story") {
      const story = pick(data.story) || (data.timeline || []).slice(0, 2).map((m) => `${pick(m.when)}: ${pick(m.what)}`).join(". ");
      const photos = (data.photos || []).slice(0, 3);
      if (!story && !photos.length) return "";
      return `<p class="k" ${L()}>${esc(u.storyK)}</p>
        ${story ? `<p class="body story" data-clip-ok ${L()}>${esc(story)}</p><button type="button" class="link more" data-open="story" hidden ${L()}>${esc(u.readStory)}</button>` : ""}
        ${photos.length ? `<div class="thumbs" data-clarity-mask="true">${photos.map((ph, i) => `<button type="button" class="thumb" data-open="photos" aria-label="${esc(u.seePhotos)}" style="--i:${i}"><img data-src="${esc(media(ph.src))}" alt="" decoding="async"></button>`).join("")}</div>` : ""}`;
    }
    if (id === "function") {
      const e = s.event, i = data.events.indexOf(e);
      const meta = [timeOf(e), pick(e.place)].filter(Boolean).join(" · ");
      return `<p class="k" ${L()}>${esc(fmt(e.start, { weekday: "long", day: "numeric", month: "long" }))}</p>
        <h2 class="t" ${L()}>${esc(pick(e.name))}${lang === "en" && e.name.hi ? ` <small ${L2A()}>${esc(e.name.hi)}</small>` : ""}</h2>
        ${meta ? `<p class="meta" ${L()}>${esc(meta)}</p>` : ""}
        ${has(e.dress) ? `<p class="dress" ${L()}>${esc(u.wear)}: ${esc(pick(e.dress))}</p>` : ""}
        <p class="acts">${has(e.palette) ? `<span class="dots" aria-hidden="true">${e.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</span>` : ""}<button type="button" class="link" data-cal="${i}" ${L()}>${esc(u.addCal)}</button>${mapOf(e) ? `<a class="link" href="${esc(mapOf(e))}" target="_blank" rel="noopener" ${L()}>${esc(u.directions)}</a>` : ""}</p>`;
    }
    if (id === "date") {
      // A save-the-date card on a surface in the picture (Gulabi Gali's desk): initials, the day, the city.
      const when = data.wedding || mainEvent()?.start;
      if (!when) return "";
      const [a, z] = two(first(nameOf(data.her)), first(nameOf(data.him)));
      return `${afterWedding() ? "" : `<p class="k" ${L()}>${esc(u.saveDate)}</p>`}
        <p class="names ini" lang="${scriptTag(a + z)}">${esc(a)} <span class="amp">&amp;</span> ${esc(z)}</p>
        <p class="day" ${L()}>${esc(fmt(when, { day: "numeric", month: "long", year: "numeric" }))}</p>
        ${has(data.city) ? `<p class="meta" ${L()}>${esc(pick(data.city))}</p>` : ""}`;
    }
    if (id === "venue") {
      const v = data.venue || {};
      if (!has(v.name) && !has(v.address)) return "";
      return `<p class="k" ${L()}>${esc(u.venueK)}</p>
        ${has(v.name) ? `<h2 class="t" ${L()}>${esc(pick(v.name))}</h2>` : ""}
        ${has(v.address) ? `<p class="body" ${L()}>${esc(pick(v.address))}</p>` : ""}
        ${v.map ? `<a class="btn line" href="${esc(v.map)}" target="_blank" rel="noopener" ${L()}>${esc(u.maps)}</a>` : ""}`;
    }
    if (id === "reply") {
      if (afterWedding()) return `<h2 class="t" ${L()}>${esc(u.thanksT)}</h2><p class="body" ${L()}>${esc(u.thanksLede)}</p>${ornament()}<button type="button" class="link" data-open="top" ${L()}>${esc(u.readAll)}</button>`;
      const m = mainEvent();
      const canReply = data.rsvp !== false && events().length > 0;
      return `${m ? `<p class="k" ${L()}>${esc(u.replyK(fmt(m.start, { weekday: "long", day: "numeric", month: "long" }), clock(weddingAt(m))))}</p>` : ""}
        <h2 class="t" ${L()}>${esc(u.replyT)}</h2>
        <p class="body" ${L()}>${esc(canReply && data.rsvpBy ? u.replyBy(fmt(data.rsvpBy, { day: "numeric", month: "long" })) : u.replyAny)}</p>
        ${canReply ? `<button type="button" class="btn" data-open="rsvp" ${L()}>${WA}<span>${esc(u.reply)}</span></button>` : ""}
        <button type="button" class="link" data-open="top" ${L()}>${esc(u.readAll)}</button>
        ${has(data.signoff) ? `<p class="so" ${L()}>${esc(nb(pick(data.signoff)))}</p>` : ""}`;
    }
    return "";
  }

  function buildBlocks() {
    blocks = [];
    for (const s of scenes) if (s.type === "film" && s.film) s.film.keys = null;
    keysDone = false;
    const host = $("#copy");
    host.innerHTML = "";
    for (const s of scenes) for (const c of s.copy || []) {
      const html = blockHtml(c.block, s);
      if (!html) continue;
      const dur = s.type === "film" ? s.film.duration : 1;
      const a = s.start + (c.at[0] / dur) * s.length, b = s.start + (c.at[1] / dur) * s.length;
      const el = document.createElement("article");
      el.className = `blk b-${c.block}${c.block === "note" ? " tag" : ""}`;
      el.setAttribute("aria-hidden", "true");
      el.innerHTML = html;
      host.appendChild(el);
      const prev = scenes[s.index - 1];
      const enteredByPortal = prev && prev.exitLen > 0;
      blocks.push({ id: c.block, scene: s, def: c, a, b, hold: clamp((c.at[0] + c.at[1]) / 2 / dur, 0, s.bodyEnd), el, fadeFrom: enteredByPortal ? s.start : -Infinity, on: false });
    }
    // Where "Walk on" stops: where each scene's words are fully shown.
    stops = [...new Set(blocks.map((b) => +(b.a + Math.min(0.04, (b.b - b.a) / 2)).toFixed(4)))].sort((x, y) => x - y);
    if (!stops.length || stops[0] > 0.01) stops.unshift(0);
    if (started && !preview) showPhotos();
    host.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.open)));
    host.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => downloadIcs(data.events[+b.dataset.cal])));
    if (reduced) reducedKeys();
  }
  const FADE = 0.1;
  const alphaOf = (b, p) => {
    const last = b === blocks[blocks.length - 1];
    const inA = b.a <= scenes[0].start + 1e-6 ? 1 : smooth(Math.max(b.fadeFrom, b.a - FADE), b.a, p);
    const outA = last ? 1 : 1 - smooth(b.b, b.b + FADE, p);
    return Math.min(inA, outA);
  };
  // The phone's own insets (the island, the home bar) when drawn inside the site's iPhone mockup:
  // walk.css sets them in px under .in-phone, and they read as 0 otherwise.
  const inset = (k) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(k)) || 0;
  function safeRect() {
    const top = (video ? 18 : 64) + inset("--safe-t"), bottom = (video ? 18 : 84) + inset("--safe-b");
    return { x: 14, y: top, w: CW - 28, h: CH - top - bottom };
  }
  const zoneOf = (b) => (b.def.zone === "auto" ? b.scene.zoneAuto || [0.17, 0.255, 0.83, 0.45] : b.def.zone);
  const inter = (a, b) => { const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y), r = Math.min(a.x + a.w, b.x + b.w), btm = Math.min(a.y + a.h, b.y + b.h); return r > x && btm > y ? { x, y, w: r - x, h: btm - y } : null; };
  const VEIL_H = 180;
  function layoutBlocks() {
    const safe = safeRect();
    for (const b of blocks) {
      const s = b.scene, el = b.el;
      const T = layerT(s, 1, b.hold) || TX(viewsOf(s).to);
      const Z = rectOf(zoneOf(b), s, T);
      let vis = inter(Z, safe) || safe;
      // A room's words keep inside the arch's opening. The arch is nearer than the wall, so it is
      // placed by its own layer.
      if (b.def.zone === "auto" && s.archInner) {
        const R = layerT(s, s.depth?.arch || 1.45, b.hold);
        if (R) {
          const l = Math.max(vis.x, s.archInner[0] * s.w * R.k + R.x + 12), r = Math.min(vis.x + vis.w, s.archInner[1] * s.w * R.k + R.x - 12);
          if (r - l > 160) vis = { ...vis, x: l, w: r - l };
        }
      }
      const max = b.id === "note" ? Math.min(280, CW - 72) : b.id === "story" ? Math.min(CW - 56, 330) : Math.min(CW - 32, 400);
      // Words that live on a surface in the picture (a niche, a board, a chalkboard: sign: true) are
      // laid out at a readable width, then scaled as one piece to sit inside it, and move with it.
      if (b.def.sign) {
        const w0 = Math.round(clamp(Z.w / 0.72, Math.min(190, max), max));
        el.style.width = `${w0}px`;
        el.style.transformOrigin = "0 0";
        el.classList.remove("compact", "tight");
        el.classList.add("sign");
        const nm = el.querySelector(".names");
        if (nm) { nm.style.fontSize = ""; for (let fs = parseFloat(getComputedStyle(nm).fontSize); nm.scrollWidth > nm.clientWidth + 1 && fs > 22; fs--) nm.style.fontSize = `${fs - 1}px`; }
        const h0 = el.offsetHeight;
        const k = Math.min(1, (Z.w - 6) / w0, (Z.h - 6) / h0);
        const w = w0 * k, h = h0 * k, al = b.def.align || "middle";
        const y = al === "top" ? Z.y + 3 : al === "bottom" ? Z.y + Z.h - h - 3 : Z.y + (Z.h - h) / 2;
        Object.assign(b, { x: Z.x + (Z.w - w) / 2, y, w, h, k, zc: [Z.x + Z.w / 2, Z.y + Z.h / 2] });
        continue;
      }
      const width = Math.round(clamp(vis.w - 12, Math.min(b.def.zone === "auto" ? 190 : 250, max), max));
      el.style.width = `${width}px`;
      el.style.paddingBlock = "";
      el.classList.remove("compact", "tight");
      const names = el.querySelector(".names");
      if (names) names.style.fontSize = "";
      // A long story stops after a few lines, with a link to the whole of it in the invitation.
      const story = el.querySelector(".body.story"), more = el.querySelector(".more");
      const clipped = () => { if (story && more) more.hidden = story.scrollHeight <= story.clientHeight + 1; };
      clipped();
      let h = el.offsetHeight;
      if (h > vis.h) { el.classList.add("compact"); clipped(); h = el.offsetHeight; }
      if (h > vis.h && b.id === "function") { el.classList.add("tight"); h = el.offsetHeight; }
      // Long names ("Anisha & Gautam") shrink until they fit the block rather than running off it.
      if (names) {
        for (let fs = parseFloat(getComputedStyle(names).fontSize); names.scrollWidth > names.clientWidth + 1 && fs > 22; fs--) names.style.fontSize = `${fs - 1}px`;
        h = el.offsetHeight;
      }
      // Veiled words keep their shade at least VEIL_H tall, so a one-line blessing still covers
      // what moves behind it.
      if (b.def.veil && h < VEIL_H) { el.style.paddingBlock = `${Math.round((VEIL_H - h) / 2)}px`; h = el.offsetHeight; }
      const x = clamp(vis.x + vis.w / 2 - width / 2, 14, CW - 14 - width);
      const al = b.def.align || "middle";
      let y = al === "top" ? vis.y + 4 : al === "bottom" ? vis.y + vis.h - h - 4 : vis.y + (vis.h - h) / 2;
      y = h > safe.h ? safe.y : clamp(y, safe.y, safe.y + safe.h - h);
      Object.assign(b, { x, y, w: width, h, zc: [Z.x + Z.w / 2, Z.y + Z.h / 2] });
    }
  }
  // Words come in over their picture's first moments (pictured, above).
  const shownA = (s) => (s.shownAt === undefined ? 0 : clamp((now - s.shownAt) / 0.45));
  function placeBlocks(p) {
    for (const b of blocks) {
      const a = alphaOf(b, p) * shownA(b.scene);
      const on = a > 0.01;
      if (on !== b.on) { b.on = on; b.el.classList.toggle("on", on); b.el.setAttribute("aria-hidden", on ? "false" : "true"); }
      if (!on) continue;
      let dx = 0, dy = 0;
      if (!reduced) {
        const s = b.scene, T = layerT(s, 1, localT(s, p));
        if (T) { const Z = rectOf(zoneOf(b), s, T); dx = Z.x + Z.w / 2 - b.zc[0]; dy = Z.y + Z.h / 2 - b.zc[1]; }
        dy += (1 - a) * 10 * (p < b.a ? 1 : -1);
        dx = clamp(dx, -CW, CW); dy = clamp(dy, -CH, CH);
      }
      // Words that are fully shown keep clear of the bars; fading ones drift on with the picture.
      let y = b.y + dy;
      const safe = safeRect(), yC = b.h > safe.h ? safe.y : clamp(y, safe.y, safe.y + safe.h - b.h);
      if (!b.k) y = yC + (y - yC) * (1 - a) * (1 - a);
      b.el.style.opacity = a.toFixed(3);
      b.el.style.transform = `translate3d(${(b.x + dx).toFixed(1)}px, ${y.toFixed(1)}px, 0)${b.k ? ` scale(${b.k.toFixed(3)})` : ""}`;
    }
  }

  // ───────── Reading the picture under the words ─────────
  let mC = null;
  function pixelsOf(s, t) {
    const k = 1 / 3;
    mC = mC || document.createElement("canvas");
    mC.width = Math.ceil(CW * k); mC.height = Math.ceil(CH * k);
    const g = mC.getContext("2d", { willReadFrequently: true });
    g.setTransform(k, 0, 0, k, 0, 0);
    drawScene(g, s, t, true);
    try { return { g, k, data: g.getImageData(0, 0, mC.width, mC.height).data, W: mC.width, H: mC.height }; } catch { return null; }
  }
  function statsOf(P, x, y, w, h) {
    const x0 = clamp(Math.floor(x * P.k), 0, P.W - 1), y0 = clamp(Math.floor(y * P.k), 0, P.H - 1);
    const x1 = clamp(Math.ceil((x + w) * P.k), 1, P.W - 1), y1 = clamp(Math.ceil((y + h) * P.k), 1, P.H - 1);
    const all = [], rgb = [0, 0, 0];
    let edge = 0, n = 0, prev = null;
    const lumAt = (i) => 0.2126 * lin(P.data[i]) + 0.7152 * lin(P.data[i + 1]) + 0.0722 * lin(P.data[i + 2]);
    for (let yy = y0; yy < y1; yy++) {
      prev = null;
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * P.W + xx) * 4, Lm = lumAt(i);
        all.push(Lm); n++;
        rgb[0] += P.data[i]; rgb[1] += P.data[i + 1]; rgb[2] += P.data[i + 2];
        if (prev !== null) edge += Math.abs(Lm - prev);
        if (yy + 1 < y1) edge += Math.abs(Lm - lumAt(i + P.W * 4));
        prev = Lm;
      }
    }
    if (!n) return null;
    all.sort((a, b) => a - b);
    return { mean: all.reduce((a, b) => a + b, 0) / n, p15: all[Math.floor(n * 0.15)], p85: all[Math.floor(n * 0.85)], busy: (10 * edge) / n / 2, rgb: rgb.map((v) => v / n) };
  }
  // Light words on dark ground or dark on light, whichever is nearer to reading; a soft pool of shade
  // under them only when the ground is still too busy or too close in tone.
  // A walk can fix the tone for a block whose ground is half sky and half stone (tone: "dark").
  function toneFor(z, small = 4.5, force) {
    const lL = lumOf(LIGHT), dL = lumOf(DARK);
    const shortL = Math.max(0, small - contrast(lL, z.p85)), shortD = Math.max(0, small - contrast(dL, z.p15));
    const dark = force ? force === "dark" : shortD < shortL;
    const short = dark ? shortD : shortL;
    const need = clamp(Math.max((z.busy - 0.16) / 0.3, short / 2.2));
    const shade = dark ? mixC(z.rgb, [255, 250, 240], 0.62) : mixC(z.rgb, [8, 4, 2], 0.7);
    const a = need ? 0.2 + 0.55 * need : 0;
    const groundL = (1 - a) * (dark ? z.p15 : z.p85) + a * lumOf(shade);
    return { dark, need, shade, a, groundL };
  }
  const measured = new Set();
  function remeasure(s) { for (const b of blocks) if (!s || b.scene === s) measured.delete(b); if (s) delete s.barTone; }
  // A film's words are read against the frame they stand over. The nearest frame loaded so far can
  // be a whole stop away (Mandapam's courtyard instead of its pale dawn sky, which gave ivory words
  // on a pale sky), so wait until one within half a second of it has arrived.
  const frameNear = (s, t) => { if (s.type !== "film") return true; const F = s.film, i = Math.floor(t * (F.count - 1)); return Math.abs(filmReadyAt(s, i) - i) <= 6; };
  function measureBlocks() {
    let did = 0;
    for (const b of blocks) {
      if (measured.has(b) || did > 1) continue;
      if (!sceneReady(b.scene) || !frameNear(b.scene, b.hold)) continue;
      did++;
      measured.add(b);
      if (b.id === "note") continue;
      const P = pixelsOf(b.scene, b.hold);
      if (!P) continue;
      const z = statsOf(P, b.x - 10, b.y - 8, b.w + 20, b.h + 16);
      if (!z) continue;
      const tn = toneFor(z, 4.5, b.def.tone);
      const el = b.el;
      el.dataset.tone = tn.dark ? "dark" : "light";
      el.style.setProperty("--sh", tn.shade.map(Math.round).join(" "));
      // A sign is plain ground already, and a pool of shade would spill past its edges.
      el.style.setProperty("--sha", b.def.sign ? "0" : Math.max(tn.a, b.def.veil || 0).toFixed(2));
      const gold = rgbOf(b.scene.type === "room" ? b.scene.fn.accent : WALK.palette?.gold || "#C2933F");
      el.style.setProperty("--ac", inkOn(gold, tn.groundL, 4.5));
      el.dataset.read = JSON.stringify({ L: +z.mean.toFixed(3), p15: +z.p15.toFixed(3), p85: +z.p85.toFixed(3), busy: +z.busy.toFixed(3), need: +tn.need.toFixed(2) });
    }
    // The bars take light or dark ink from what is under them in each scene.
    for (const s of scenes) {
      const b = blocks.find((x) => x.scene === s);
      if (s.barTone || !sceneReady(s) || !frameNear(s, b ? b.hold : 0.3) || did > 2) continue;
      did++;
      const P = pixelsOf(s, b ? b.hold : 0.3);
      if (!P) { s.barTone = { top: "light", bottom: "light" }; continue; }
      const top = statsOf(P, 0, 0, CW, 56), bot = statsOf(P, 0, CH - 64, CW, 64);
      s.barTone = { top: top && toneFor(top).dark ? "dark" : "light", bottom: bot && toneFor(bot).dark ? "dark" : "light" };
      if (Math.floor(lastScene / 2) === s.index) lastScene = -1;
    }
    if (did) dirty = true;
    return did;
  }

  // ───────── The bars ─────────
  function renderBars() {
    const u = u_();
    $("#mono").textContent = two(first(nameOf(data.her)), first(nameOf(data.him))).join(" & ");
    tagEl($("#mono"), scriptTag($("#mono").textContent));
    $("#mono").setAttribute("aria-label", u.backTop);
    // On the English page the button names the second language ("हिं", "मरा") and reads "Read in …" in it.
    $("#langBtn").textContent = lang === "en" && PK() ? PK().meta.short : u.langSwitch;
    $("#langBtn").setAttribute("aria-label", lang === "en" && PK() ? PK().walk.readIn : u.langLabel);
    tagEl($("#langBtn"), tagOf(lang === "en" ? "hi" : "en"));
    $("#detailsBtn").textContent = u.invitation;
    tagEl($("#detailsBtn"));
    $("#soundBtn").setAttribute("aria-label", $("#music").paused ? u.music : u.musicOff);
    $("#skip").textContent = u.skip;
    $("#walk").setAttribute("aria-label", u.walkLabel(couple()));
    $("#closeBtn").setAttribute("aria-label", u.close);
    $("#ticks").innerHTML = scenes.slice(1).map((s) => `<i style="left:${((s.start / total) * 100).toFixed(2)}%"></i>`).join("");
    lastScene = -1;
  }
  // A walk's own words (its chapters) are written in English and Hindi: in another second language
  // the walk's word for it if walk.json has one (chapter.ur …), else the English.
  const pickWalk = (v) => (v && typeof v === "object" ? (lang === "hi" ? v[L2] : null) || v.en || "" : v ?? "");
  const chapterOf = (s) => (s.type === "room" || (s.slot && s.event) ? pick(s.event.name) : pickWalk(s.chapter) || "");
  function updateBars(p) {
    $("#progress").style.transform = `scaleX(${clamp(p / total).toFixed(4)})`;
    // The bar names the scene ahead a moment early, but not while this scene's words are still up
    // (Gulabi Gali's story sits on the film's last frames).
    const here = sceneAt(p), ahead = sceneAt(p + 0.12);
    const s = ahead !== here && blocks.some((b) => b.scene === here && b.b + FADE > p) ? here : ahead, atStart = s.index === 0 && p < 0.3;
    const key = s.index * 2 + (atStart ? 1 : 0);
    if (key === lastScene) return;
    lastScene = key;
    const u = u_();
    $("#whereN").textContent = ROMAN[s.index] || String(s.index + 1);
    $("#whereName").textContent = chapterOf(s);
    tagEl($("#whereName"));
    // A long name ("Cocktail night at the Haveli") tightens its spacing, then ends in an ellipsis.
    $("#whereName").classList.toggle("long", chapterOf(s).length > 14);
    $("#whereName").dataset.clipOk = "";
    const atEnd = s.index === scenes.length - 1;
    $("#nextLabel").textContent = atStart ? u.walkIn : atEnd ? u.backTop : u.walkOn;
    tagEl($("#nextLabel"));
    $("#nextBtn").classList.toggle("bob", atStart);
    $("#nextBtn").classList.toggle("up", atEnd);
    const tone = s.barTone || { top: "light", bottom: "light" };
    $("#topBar").dataset.tone = tone.top;
    $("#bottomBar").dataset.tone = tone.bottom;
  }

  // ───────── The whole invitation, in a sheet ─────────
  function sec(id, title, inner, lede = "") {
    return `<section class="sec" id="${id}"><h2 class="sec-t" ${L()}>${esc(title)}</h2>${lede ? `<p class="sec-lede" ${L()}>${esc(lede)}</p>` : ""}${inner}</section>`;
  }
  function renderSheet() {
    const u = u_(), d = data;
    const invocation = d.invocation === false ? null : (lang === "hi" && d.invocationHi) || d.invocation || WALK.invocation || PACKS[d.community] || null;
    const parents = has(d.parents?.her) || has(d.parents?.him);
    const evs = events();
    const parts = [];
    parts.push(`<section class="sec inv" id="s-top">
      ${invocation ? `<p class="om" dir="auto"${["bn", "as", "pa"].includes(scriptTag(invocation)) ? ` lang="${scriptTag(invocation)}"` : ""}>${omLines(invocation)}</p>` : ""}
      <p class="inv-lede" ${L()}>${esc(parents ? u.blessing : u.ownVoice)}</p>
      ${two(
        `<p class="n" ${L()}>${esc(nameOf(d.her.full?.en ? d.her.full : d.her))}</p>
      ${has(d.parents?.her) ? `<p class="s" ${L()}>${esc(u.daughter)} ${String(pick(d.parents.her)).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => esc(nb(l))).join("<br>")}</p>` : ""}`,
        `<p class="n" ${L()}>${esc(nameOf(d.him.full?.en ? d.him.full : d.him))}</p>
      ${has(d.parents?.him) ? `<p class="s" ${L()}>${esc(u.son)} ${String(pick(d.parents.him)).split("\n").map((l) => l.trim()).filter(Boolean).map((l) => esc(nb(l))).join("<br>")}</p>` : ""}`,
      ).join(`
      <p class="w" ${L()}>${esc(u.with)}</p>
      `)}
      ${parents && u.closeLine ? `<p class="s" ${L()}>${esc(u.closeLine)}</p>` : ""}
      ${d.wedding ? `<p class="when" ${L()}>${esc(fmt(d.wedding, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}${invPlace() ? `<br>${esc(invPlace())}` : ""}</p>` : ""}
      ${keyDates().map((e) => `<p class="caps key-k" ${L()}>${esc(String(pick(e.name)).trim())}</p><p class="when key" ${L()}>${esc(fmt(e.start, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}</p>`).join("")}
    </section>`);
    if (has(family?.note)) parts.push(sec("s-note", u.noteK, `<p class="note-text" ${L()}>${esc(pick(family.note))}</p>`));
    if (evs.length) parts.push(sec("s-events", u.evT, `<div class="evs">${evs.map((e) => { const i = d.events.indexOf(e); return `<article class="ev">
        <h3 ${L()}>${esc(pick(e.name))}${lang === "en" && e.name.hi ? ` <small ${L2A()}>${esc(e.name.hi)}</small>` : ""}</h3>
        <p class="t" ${L()}>${esc(fmt(e.start, { weekday: "long", day: "numeric", month: "long" }))}, ${esc(timeOf(e))}${has(e.place) ? `<br>${esc(pick(e.place))}` : ""}${has(e.address) && !has(e.place) ? `<br>${esc(pick(e.address))}` : ""}${has(e.address) && has(e.place) && awayTown(e) ? `<br>${esc(awayTown(e))}` : ""}${!ownVenue(e) && has(d.city) && (d.events || []).some(ownVenue) ? `<br>${esc(pick(d.city))}` : ""}</p>
        ${has(e.dress) || has(e.palette) ? `<p class="d" ${L()}><span class="dk">${esc(u.dressK)}</span>${has(e.palette) ? `<span class="sw" aria-hidden="true">${e.palette.map((c) => `<i style="background:${esc(c)}"></i>`).join("")}</span>` : ""}${has(e.dress) ? `<span>${esc(pick(e.dress))}</span>` : ""}</p>` : ""}
        <p class="ev-acts"><button class="cal" type="button" data-cal="${i}" ${L()}>${esc(u.addCal)}</button>${mapOf(e) ? `<a class="cal" href="${esc(mapOf(e))}" target="_blank" rel="noopener" ${L()}>${esc(u.directions)}</a>` : ""}</p>
      </article>`; }).join("")}</div>`));
    // Functions at venues of their own follow the main venue, each under its name, and the main venue
    // is then named for the functions held there. Functions at the same place share one entry, named
    // for all of them (engine.js secVenue, Tanush, 4 November 2026).
    const away = evs.filter(ownVenue);
    const here = away.length ? andList(evs.filter((e) => !ownVenue(e)).map((e) => pick(e.name))) : "";
    const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const placeOf = (e) => [norm(e.place?.en || e.place?.hi).replace(/^(at|from|in) /, ""), norm(e.address?.en || e.address?.hi) || mapOf(e) || ""].join("|");
    const places = [];
    for (const e of away) { const p = places.find((x) => x.key === placeOf(e)); if (p) p.evs.push(e); else places.push({ key: placeOf(e), evs: [e] }); }
    const mainVenue = has(d.venue?.name) || has(d.venue?.address);
    if (mainVenue || away.length) parts.push(sec("s-venue", u.venueT, `<div class="venue">
        ${here && mainVenue ? `<p class="caps" ${L()}>${esc(here)}</p>` : ""}
        ${has(d.venue.name) ? `<p class="vn" ${L()}>${esc(pick(d.venue.name))}</p>` : ""}
        ${has(d.venue.address) ? `<p class="va" ${L()}>${esc(pick(d.venue.address))}</p>` : ""}
        ${d.venue.map ? `<a class="btn line" href="${esc(d.venue.map)}" target="_blank" rel="noopener" ${L()}>${esc(u.maps)}</a>` : ""}
        ${places.map(({ evs: [e, ...more] }) => { const map = [e, ...more].map(mapOf).find(Boolean); return `<h3 class="h3" ${L()}>${esc(andList([e, ...more].map((x) => pick(x.name))))}</h3>
        ${has(e.place) ? `<p class="vn" ${L()}>${esc(pick(e.place))}</p>` : ""}
        ${has(e.address) ? `<p class="va" ${L()}>${esc(pick(e.address))}</p>` : ""}
        ${map ? `<a class="btn line" href="${esc(map)}" target="_blank" rel="noopener" ${L()}>${esc(u.maps)}</a>` : ""}`; }).join("")}
        ${has(d.travel) ? `<h3 class="h3" ${L()}>${esc(u.travelT)}</h3><ul ${L()}>${d.travel.map((x) => `<li>${esc(pick(x))}</li>`).join("")}</ul>` : ""}
        ${has(d.stay) ? `<h3 class="h3" ${L()}>${esc(u.stayT)}</h3><ul ${L()}>${d.stay.map((x) => `<li><b>${esc(pick(x.name))}</b>${has(x.note) ? `<br>${esc(pick(x.note))}` : ""}</li>`).join("")}</ul>` : ""}
      </div>`));
    if (has(d.story) || has(d.timeline)) parts.push(sec("s-story", u.storyT, `${has(d.story) ? `<p class="story" ${L()}>${esc(pick(d.story))}</p>` : ""}
      ${has(d.timeline) ? `<ol class="line">${d.timeline.map((m) => `<li><span class="lw" ${L()}>${esc(pick(m.when))}</span><span ${L()}>${esc(pick(m.what))}</span></li>`).join("")}</ol>` : ""}`));
    if (has(d.photos)) parts.push(sec("s-photos", u.photosT, `<div class="photos" data-clarity-mask="true">${d.photos.map((p) => `<figure>
        <img src="${esc(media(p.src))}" alt="${esc(u.photoOf(couple()))}${has(p.caption) ? `: ${esc(pick(p.caption))}` : ""}" loading="lazy" decoding="async">
        ${has(p.caption) ? `<figcaption ${L()}>${esc(pick(p.caption))}</figcaption>` : ""}</figure>`).join("")}</div>`));
    // Blank lines left by a cleared box are dropped, so a heading never stands over nothing (2 November 2026).
    const f = Object.fromEntries(["blessings", "darshanabhilashi", "swagatotsuk", "kids"].map((k) => [k, (d.family?.[k] || []).filter((x) => String(pick(x)).trim())]));
    if (Object.values(f).some((l) => l.length) || own("kidsLine")) {
      const grp = (k, title) => (f[k].length ? `<div class="fam"><p class="caps" ${L()}>${esc(title)}</p>${f[k].map((x) => `<p class="fam-n${subHead(pick(x)) ? " fam-sub" : ""}" ${L()}>${esc(nb(pick(x)))}</p>`).join("")}</div>` : "");
      parts.push(sec("s-family", u.familyT, `${grp("blessings", u.blessT)}${grp("darshanabhilashi", u.darshan)}${grp("swagatotsuk", u.swagat)}${f.kids.length || own("kidsLine") ? `<div class="fam"><p class="caps" ${L()}>${esc(u.kids)}</p><p class="fam-n" ${L()}>${esc(u.kidsLine(f.kids.map(pick).join(", ")))}</p></div>` : ""}`));
    }
    // The couple's song, as the painted engine shows it: a now-playing card whose button loads Spotify's or YouTube's player.
    if (d.song?.url) {
      const s = d.song, from = /spotify\.com/.test(s.url) ? "Spotify" : /youtu/.test(s.url) ? "YouTube" : "";
      const cover = s.cover || (d.photos?.[0] && media(d.photos[0].src)) || "";
      parts.push(sec("s-song", u.songT, `<div class="song-card" id="songBox">
        <div class="sc-cover" id="songCover"${s.cover ? "" : ` data-clarity-mask="true"`}>${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}</div>
        <div class="sc-row"><div class="sc-meta"><p class="sc-title" ${L()}>${esc(pick(s.title) || u.songT)}</p>${s.artist ? `<p class="sc-artist">${esc(s.artist)}</p>` : ""}</div></div>
        <div class="sc-player" id="songPlayer"><div class="sc-bar" aria-hidden="true"><i></i></div>
          <div class="sc-controls"><button class="sc-play" type="button" id="songLoad" aria-label="${esc(u.songPlay)}">${PLAY}</button></div></div>
      </div>${from ? `<p class="sc-from" ${L()}>${esc(u.songFrom(from))}</p>` : ""}`));
    }
    const kept = savedReply();
    if (d.rsvp !== false && evs.length && !afterWedding()) parts.push(sec("s-rsvp", u.rsvpT, `<form class="rsvp" id="rsvpForm" ${L()} novalidate>
        <div class="rsvp-done" id="rsvpDone" aria-live="polite"></div>
        <label for="rsvpFamily">${esc(u.familyLabel)}</label>
        <input id="rsvpFamily" name="family" autocomplete="name" placeholder="${esc(u.familyPh)}" value="${esc(kept?.family || greetName("en"))}" aria-describedby="rsvpNeed">
        <p class="need" id="rsvpNeed" hidden>${esc(u.needFamily)}</p>
        <div class="rows">${evs.map((e) => { const i = d.events.indexOf(e); return `<div class="row">
            <span><b ${L()}>${esc(pick(e.name))}</b><small>${esc(fmt(e.start, { weekday: "short", day: "numeric", month: "short" }))}</small></span>
            <span class="stepper">
              <button class="step" type="button" data-step="-1" data-row="${i}" aria-label="${esc(u.fewer(pick(e.name)))}">${MINUS}</button>
              <output id="cnt${i}" aria-live="polite">${kept?.counts?.[e.id] ?? 1}</output>
              <button class="step" type="button" data-step="1" data-row="${i}" aria-label="${esc(u.more(pick(e.name)))}">${PLUS}</button>
            </span></div>`; }).join("")}</div>
        <button class="btn solid" type="submit">${WA}<span>${esc(keeps ? u.send : u.waSend)}</span></button>
        <p class="note" id="rsvpNote">${esc(keeps ? u.rsvpNote : u.waNote)}</p>
      </form>`, d.rsvpBy ? u.rsvpLede(fmt(d.rsvpBy, { day: "numeric", month: "long" })) : ""));
    // The number itself is the link, named for whom it calls (engine.js secContacts).
    const callTo = (c) => { const n = String(pick(c.name) || pick(c.role) || "").trim(); return n && u.callTo ? u.callTo(n) : `${u.call}: ${n || phoneText(c.phone)}`; };
    if ((d.contacts || []).some((c) => c.phone)) parts.push(sec("s-contacts", u.contactsT, `<ul class="contacts">${d.contacts.filter((c) => c.phone).map((c) => `<li><span><b ${L()}>${esc(pick(c.name))}</b>${has(c.role) ? `<br><small ${L()}>${esc(pick(c.role))}</small>` : ""}</span><a class="cal tel" href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}" aria-label="${esc(callTo(c))}" ${L()}>${esc(phoneText(c.phone))}</a></li>`).join("")}</ul>`));
    // The UPI ID itself, which copies on a tap: guests pay from their own UPI app.
    if (d.upi) parts.push(sec("s-shagun", u.shagunT, `<button class="upi-id" type="button" id="upiCopy" data-upi="${esc(d.upi)}" aria-label="${esc(u.upiCopy)}"><span class="upi-k" ${L()}>${esc(u.upiK)}</span><span class="upi-v">${esc(d.upi)}</span><span class="upi-hint" ${L()}>${esc(u.upiTap)}</span></button>`, u.shagunLede));
    const painted = SAATH.draft ? "" : (() => { const q = new URLSearchParams(location.search); q.set("t", WALK.base || "jharokha"); ["video", "open", "at", "debug"].forEach((k) => q.delete(k)); return `${location.pathname}?${q}`; })();
    parts.push(`<footer class="signoff">
      ${has(d.signoff) ? `<p class="so" ${L()}>${esc(nb(pick(d.signoff)))}</p>` : ""}
      ${painted ? `<a class="painted" href="${esc(painted)}" ${L()}>${esc(u.painted)}</a>` : ""}
      <a class="made" href="https://saath.studio" target="_blank" rel="noopener"><span ${L()}>${esc(u.made)}</span><img src="${ROOT}mark.svg" alt="" width="15" height="15">saath.studio</a></footer>`);
    $("#sheetTitle").textContent = couple();
    tagEl($("#sheetTitle"));
    const body = $("#sheetBody");
    body.innerHTML = parts.join("");
    body.querySelectorAll("[data-cal]").forEach((b) => b.addEventListener("click", () => downloadIcs(d.events[+b.dataset.cal])));
    body.querySelectorAll(".step").forEach((b) => b.addEventListener("click", () => {
      const o = $(`#cnt${b.dataset.row}`);
      o.value = o.textContent = String(Math.max(0, Math.min(30, (+o.textContent || 0) + +b.dataset.step)));
    }));
    $("#rsvpForm")?.addEventListener("submit", sendRsvp);
    // A family who has replied from this phone sees their reply, and can change it.
    if ($("#rsvpForm") && kept) showDone(kept);
    $("#songLoad")?.addEventListener("click", loadSong);
    $("#upiCopy")?.addEventListener("click", (ev) => {
      const btn = ev.currentTarget, hint = btn.querySelector(".upi-hint"), u = u_();
      (navigator.clipboard?.writeText(btn.dataset.upi) || Promise.reject()).then(() => {
        hint.textContent = u.upiCopied; btn.classList.add("copied");
        setTimeout(() => { hint.textContent = u.upiTap; btn.classList.remove("copied"); }, 1800);
      }).catch(() => { const r = document.createRange(); r.selectNodeContents(btn.querySelector(".upi-v")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
    });
  }
  // Spotify's compact player takes the controls' place, a video the cover's; the walk's music fades out.
  function loadSong() {
    const url = data.song.url;
    const yt = url.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/);
    const sp = url.match(/open\.spotify\.com\/(track|album|playlist)\/(\w+)/);
    if (!yt && !sp) return window.open(url, "_blank", "noopener");
    if (!music.paused) fadeTo(0, 400);
    const src = yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1` : `https://open.spotify.com/embed/${sp[1]}/${sp[2]}?theme=0`;
    const frame = `<iframe class="song-frame${sp ? " spotify" : ""}" src="${src}" allow="autoplay; encrypted-media; clipboard-write" allowfullscreen title="${esc(u_().songT)}"></iframe>`;
    if (sp) $("#songPlayer").innerHTML = frame;
    else { $("#songCover").classList.add("video"); $("#songCover").innerHTML = frame; $("#songPlayer").remove(); }
  }
  function openSheet(where = "top") {
    const dlg = $("#details");
    if (!dlg.open) { dlg.showModal(); document.documentElement.classList.add("sheet-open"); }
    const body = $("#sheetBody");
    const el = where === "rsvp" ? $("#s-rsvp") : where === "photos" ? $("#s-photos") : where === "story" ? $("#s-story") : null;
    requestAnimationFrame(() => { body.scrollTop = el ? body.scrollTop + el.getBoundingClientRect().top - body.getBoundingClientRect().top - 8 : 0; });
  }

  // ───────── Replies and calendars (as the painted engine sends them) ─────────
  // The family checks their reply in a small dialog, then a live invite with the RSVP manager keeps
  // it with the couple (SAATH.api, /api/rsvp) and WhatsApp opens with it written out. The phone remembers it, so the
  // family sees it when they come back and can change it. Previews keep nothing.
  // Links go to api.whatsapp.com directly: the wa.me redirect turns emoji into "�".
  const keeps = Boolean(SAATH.api && SAATH.slug);
  const replyKey = `saath-rsvp:${SAATH.slug}:${SAATH.familyKey || familyParam.toLowerCase()}`;
  function savedReply() {
    if (!keeps) return null;
    try { const r = JSON.parse(localStorage.getItem(replyKey) || "null"); return r?.counts ? r : null; } catch { return null; }
  }
  const replyList = (counts) => `<ul class="rc-list" ${L()}>${counts.map(([ev, n]) => `<li><span>${esc(pick(ev.name))}</span>${n > 0 ? `<b>${n}</b>` : `<b class="no">${esc(u_().notComing)}</b>`}</li>`).join("")}</ul>`;
  const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

  function sendRsvp(e) {
    e.preventDefault();
    const input = $("#rsvpFamily");
    const fam = input.value.replace(/[|\n#]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
    // A reply nobody can put a name to can't be counted: the name comes first.
    $("#rsvpNeed").hidden = Boolean(fam);
    if (!fam) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
      return;
    }
    input.removeAttribute("aria-invalid");
    confirmRsvp(fam, events().map((ev) => [ev, +$(`#cnt${data.events.indexOf(ev)}`).textContent || 0]));
  }

  let dialog = null;
  function confirmRsvp(fam, counts) {
    const u = u_();
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "rsvp-confirm";
      dialog.setAttribute("aria-labelledby", "rcTitle");
      // A tap outside the card closes it.
      dialog.addEventListener("click", (ev) => { if (ev.target === dialog) dialog.close(); });
      document.body.append(dialog);
    }
    tagEl(dialog);
    dialog.innerHTML = `<div class="rc-in">
      <p class="rc-title" id="rcTitle">${esc(u.confirmT)}</p>
      <p class="rc-from">${esc(u.confirmFrom(fam))}</p>
      ${replyList(counts)}
      <p class="rc-note">${esc(keeps ? u.confirmNote(couple()) : u.waConfirmNote(couple()))}</p>
      <div class="rc-actions">
        <button class="btn solid" type="button" id="rcSend">${WA}<span>${esc(keeps ? u.confirmSend : u.waConfirmSend)}</span></button>
        <button class="rc-back" type="button" id="rcBack">${esc(u.confirmBack)}</button>
      </div>
    </div>`;
    dialog.querySelector("#rcBack").addEventListener("click", () => dialog.close());
    dialog.querySelector("#rcSend").addEventListener("click", () => { dialog.close(); deliver(fam, counts); });
    dialog.showModal();
  }

  function deliver(fam, counts) {
    const u = u_();
    const reply = { guest: savedReply()?.guest || newId(), family: fam, counts: Object.fromEntries(counts.map(([ev, n]) => [ev.id, n])), at: new Date().toISOString() };
    if (keeps) {
      const note = $("#rsvpNote");
      fetch(`${SAATH.api}/api/rsvp`, { method: "POST", keepalive: true, body: JSON.stringify({ slug: SAATH.slug, guest: reply.guest, family: fam, familyKey: SAATH.familyKey || undefined, counts: reply.counts, lang }) })
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          try { localStorage.setItem(replyKey, JSON.stringify(reply)); } catch {}
          showDone(reply);
        })
        .catch(() => { if (note) { note.textContent = u.saveFailed; note.classList.add("warn"); } });
    }
    // WhatsApp opens in the same tap, or the browser would block it.
    const lines = counts.map(([ev, n]) => `${pick(ev.name)}: ${n}`);
    const code = `#RSVP ${fam} | ${counts.map(([ev, n]) => `${ev.id} ${n}`).join(" | ")}`;
    const text = [u.waIntro(fam, couple()), ...lines, "", code].join("\n");
    const phone = (data.rsvpPhone || "").replace(/\D/g, "");
    window.open(`https://api.whatsapp.com/send?${phone ? `phone=${phone}&` : ""}text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  // The thank-you in the form's place, with the reply as it reached the couple.
  function showDone(reply) {
    const form = $("#rsvpForm");
    if (!form) return;
    const u = u_();
    $("#rsvpDone").innerHTML = `<p class="rd-title">${esc(u.doneT)}</p>
      <p class="rd-line">${esc(u.doneLine(couple()))}</p>
      ${replyList(events().filter((ev) => ev.id in reply.counts).map((ev) => [ev, reply.counts[ev.id]]))}
      <button class="rd-change" type="button" id="rdChange">${esc(u.doneChange)}</button>`;
    form.classList.add("done");
    const note = $("#rsvpNote");
    note.textContent = u.rsvpNote;
    note.classList.remove("warn");
    $("#rdChange").addEventListener("click", () => {
      form.classList.remove("done");
      form.querySelector(".step")?.focus({ preventScroll: true });
    });
  }
  function downloadIcs(ev) {
    if (!ev) return;
    const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Saath Studio//Invite//EN", "BEGIN:VEVENT",
      `UID:${slug}-${ev.id}@saath.studio`, `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(ev.start)}`, `DTEND:${stamp(ev.end || ev.start)}`,
      `SUMMARY:${two(data.her.en, data.him.en).join(" & ")}: ${ev.name.en}`,
      `LOCATION:${(ownVenue(ev) ? [ev.place?.en, ev.address?.en] : [ev.place?.en, data.venue?.name?.en, data.city?.en]).filter(Boolean).join(", ")}`,
      ev.dress?.en ? `DESCRIPTION:${ev.dress.en}` : null, "END:VEVENT", "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = `${slug}-${ev.id}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ───────── Music, only after a tap ─────────
  const music = $("#music");
  function fadeTo(to, ms) {
    const from = music.volume, t0 = performance.now();
    const step = (n) => { const k = Math.min(1, (n - t0) / ms); music.volume = clamp(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); else if (to === 0) music.pause(); };
    requestAnimationFrame(step);
  }
  function toggleMusic() {
    if (music.paused) {
      // The couple's own song (kept with their photos), a track from the music library, or the walk's own.
      if (!music.getAttribute("src")) music.src = /^\/api\/wedding\/media\/[0-9a-f-]{36}$/.test(data.music || "") ? data.music : ROOT + (/^music\/[a-z0-9-]+\.mp3$/.test(data.music || "") ? data.music : WALK.music || "themes/theme.mp3");
      music.volume = 0;
      music.play().then(() => fadeTo(0.7, 1200)).catch(() => {});
    } else fadeTo(0, 450);
  }
  music.addEventListener("play", () => { $("#soundBtn").setAttribute("aria-pressed", "true"); $("#soundBtn").setAttribute("aria-label", u_().musicOff); });
  music.addEventListener("pause", () => { $("#soundBtn").setAttribute("aria-pressed", "false"); $("#soundBtn").setAttribute("aria-label", u_().music); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !music.paused) { music.pause(); music.dataset.resume = "1"; }
    else if (!document.hidden && music.dataset.resume) { delete music.dataset.resume; music.play().catch(() => {}); }
  });

  // ───────── Scroll, layout and the loop ─────────
  const walkEl = $("#walk"), stage = $("#stage");
  // The loader where a scene's words will be, while its picture is on its way (walk.css .wait).
  const waitEl = document.createElement("div");
  waitEl.className = "wait";
  waitEl.setAttribute("aria-hidden", "true");
  stage.appendChild(waitEl);
  let waitOn = false;
  let walkTop = 0;
  function layout(force = false) {
    const r = stage.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    // One screen of scroll stays fixed while a phone's toolbar comes and goes.
    if (force || !unit || Math.abs(h - unit) > 140 || w !== CW) unit = h;
    const nd = Math.min(devicePixelRatio || 1, 2);
    const changed = force || w !== CW || h !== CH || nd !== dpr;
    CW = w; CH = h; dpr = nd;
    if (changed) {
      cvs.width = Math.round(CW * dpr); cvs.height = Math.round(CH * dpr);
      layoutKey++;
      bufKey = ""; rKey[0] = rKey[1] = "";
    }
    walkEl.style.height = `${Math.round(total * unit + innerHeight)}px`;
    walkTop = walkEl.getBoundingClientRect().top + scrollY;
    if (changed && blocks.length) { layoutBlocks(); measured.clear(); scenes.forEach((s) => delete s.barTone); }
    readScroll();
    dirty = true;
  }
  function readScroll() {
    const p = clamp((scrollY - walkTop) / unit, 0, total);
    if (p !== target) dir = p > target ? 1 : -1;
    target = p;
    if (reduced || debugSnap) pos = target;
  }
  const scrollToPos = (p, smoothly = true) => scrollTo({ top: walkTop + p * unit, behavior: smoothly && !reduced ? "smooth" : "auto" });
  function walkOn() {
    const s = sceneAt(pos + 0.12);
    if (s.index === scenes.length - 1) return scrollToPos(0);
    const next = stops.find((x) => x > pos + 0.06);
    scrollToPos(next ?? total);
  }
  // When the guest stops between two places, the walk carries them on to the nearer one.
  let idleTimer = 0, touching = false;
  function settleSoon() {
    clearTimeout(idleTimer);
    if (reduced || video || SAATH.draft || debugSnap) return;
    idleTimer = setTimeout(settle, 220);
  }
  function settle() {
    if (touching || $("#details").open) return;
    const p = target;
    if (blocks.some((b) => p >= b.a - 0.02 && p <= b.b + 0.02) || p >= total - 0.02) return;
    const ahead = stops.find((x) => x > p), behind = [...blocks].reverse().find((b) => b.b < p);
    const back = behind ? behind.b : 0;
    if (dir > 0 && ahead !== undefined && ahead - p < 0.6) scrollToPos(ahead);
    else if (dir < 0 && p - back < 0.6) scrollToPos(back);
  }

  let last = 0, debugSnap = false, idleFrames = 0, pumpedAt = -1;
  const costs = [];
  function tick(n) {
    now = n / 1000;
    const dt = Math.min(0.1, (n - last) / 1000 || 0.016);
    last = n;
    const before = pos;
    if (!reduced && !debugSnap) {
      pos += (target - pos) * (1 - Math.exp(-dt / 0.11));
      if (Math.abs(target - pos) < 0.0004) pos = target;
    }
    const s = scenes.length ? sceneAt(pos) : null;
    const living = !!s && !reduced && !video && (s.type === "doors" || !!s.layers?.some((l) => l.glow) || s.type === "room" || !!s.petals || !!s.stars);
    // Lamplight keeps moving while the guest reads, at a gentler frame rate.
    const ambient = living && ++idleFrames % 3 === 0;
    // Words wait for their scene's picture, with a small loader in their place. On a connection too
    // slow to bring it, they come anyway after a few seconds, so the invitation can still be read.
    if (s) {
      if (s.shownAt === undefined) {
        if (pictured(s)) s.shownAt = now;
        else if (s.waitFrom === undefined) s.waitFrom = now;
        else if (now - s.waitFrom > 7) s.shownAt = now;
      }
      if (s.shownAt !== undefined && now - s.shownAt < 0.5) dirty = true;
      const waiting = s.shownAt === undefined;
      if (waiting !== waitOn) { waitOn = waiting; waitEl.classList.toggle("on", waiting); }
    }
    if (pos !== before || dirty || ambient) {
      dirty = false;
      const t0 = debug ? performance.now() : 0;
      frame();
      placeBlocks(pos);
      updateBars(pos);
      if (debug) { costs.push(performance.now() - t0); if (costs.length > 4000) costs.shift(); }
    }
    if (!$("#details").open) measureBlocks();
    // As the guest moves on (scrolling, or a jump: the builder keeping its place, ?at=), the films
    // ahead start loading and the ones far behind let go.
    if (started && Math.abs(pos - pumpedAt) > 0.05) { pumpedAt = pos; releaseFar(); if (inflight < 6) pumpFilms(); }
    requestAnimationFrame(tick);
  }

  function setLang(next) {
    lang = next;
    setTag();
    buildBlocks();
    layoutBlocks();
    measured.clear();
    renderBars();
    renderSheet();
    dirty = true;
  }

  // ───────── Boot ─────────
  let started = false;
  // The couple's photos in the story wait until the walk's own pictures have started.
  const showPhotos = () => $$("#copy img[data-src]").forEach((img) => { img.src = img.dataset.src; img.removeAttribute("data-src"); });
  function startLoading() {
    if (started) return;
    started = true;
    if (preview) { pumpFilms(); return; } // a catalogue preview: the first view's few frames only
    for (const s of scenes) want(sourcesOf(s));
    if (WALK.paper) want([WALK.paper]);
    pumpFilms();
    showPhotos();
  }
  async function loadFilms(defs) {
    for (const s of defs) {
      if (s.type !== "film" || typeof s.film !== "string") continue;
      try {
        const url = /^(https?:|\/)/.test(s.film) ? s.film : `${ROOT}walks/${WALK.id}/${s.film}`;
        const film = await (await fetch(url)).json();
        film.base = url.replace(/[^/]*$/, "");
        s.film = film;
      } catch (err) { console.warn("walk film", err); s.film = null; }
    }
    for (const s of defs) if (s.type === "film" && s.film && !s.film.base) s.film.base = `${ROOT}walks/${WALK.id}/`;
  }
  async function boot() {
    let draft = null;
    if (SAATH.draft || params.has("draft")) { try { draft = JSON.parse(localStorage.getItem("saath-draft") || "null"); } catch {} }
    data = tidy(draft || SAATH.data);
    if (!WALK) {
      const id = (SAATH.walkId || params.get("t") || data?.theme || "walk-haveli").replace(/[^a-z0-9-]/gi, "");
      WALK = await (await fetch(`${ROOT}walks/${id}/walk.json`)).json();
    }
    if (WALK.paper) document.documentElement.style.setProperty("--paper-tex", `url("${srcUrl(WALK.paper)}")`);
    // A walk's own colours and type (walk.json palette and fonts) over the haveli's defaults.
    const css = document.documentElement.style;
    for (const k of ["night", "ivory", "ink", "paper", "gold", "rani", "muted"]) if (WALK.palette?.[k]) css.setProperty(`--${k}`, WALK.palette[k]);
    if (WALK.palette?.accent && !WALK.palette.rani) css.setProperty("--rani", WALK.palette.accent);
    const F = WALK.fonts || {};
    const faces = [...new Set([F.display, F.serif, F.deva, F.sans].filter(Boolean))];
    // The second language, and its words when it isn't Hindi (langs.js, beside engine.js). Should it
    // fail to load, the walk keeps the English words round the couple's own.
    L2 = LANGS.includes(data?.lang2) ? data.lang2 : "hi";
    if (L2 !== "hi") {
      const ok = window.SaathLangs || (await new Promise((done) => {
        const s = document.createElement("script"); s.src = `${ROOT}langs.js`;
        s.onload = () => done(Boolean(window.SaathLangs)); s.onerror = () => done(false);
        document.head.appendChild(s);
      }));
      const pk = ok && window.SaathLangs[L2];
      UI[L2] = pk ? { ...pk.ui, ...pk.walk, amp: pk.ui.amp, andJoin: pk.meta.andJoin, pairJoin: pk.meta.pairJoin } : { ...UI.en, langSwitch: "EN" };
    }
    // Each second language's face (walk.css has the same as --l2-*, a walk may name its own: fonts.mr …).
    const L2_FACE = { mr: "Tiro Devanagari Marathi", bn: "Tiro Bangla", as: "Tiro Bangla", pa: "Tiro Gurmukhi", ur: "Gulzar" };
    const l2Face = L2 === "hi" ? null : F[L2] || L2_FACE[L2];
    if (l2Face) css.setProperty(`--l2-${L2}`, `"${l2Face}", ${L2 === "ur" ? '"Noto Nastaliq Urdu", ' : ""}serif`);
    // The faces asked for on their own (one weight each): a Bengali or Assamese invocation's, a Sikh
    // one's (ੴ), and the second language's.
    const own = [data?.community === "bengali" || data?.community === "assamese" ? "Tiro Bangla" : null, data?.invocation !== false && /[਀-੿]/.test(`${data?.invocation || ""}${WALK.invocation || ""}`) ? "Tiro Gurmukhi" : null, l2Face, L2 === "ur" ? "Noto Nastaliq Urdu" : null];
    for (const face of new Set(own.filter(Boolean))) {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `https://fonts.googleapis.com/css2?family=${face.replace(/ /g, "+")}&display=swap`;
      document.head.appendChild(l);
    }
    if (faces.length) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?${faces.map((n) => `family=${n.replace(/ /g, "+")}:ital,wght@0,400;0,500;1,400`).join("&")}&display=swap`;
      link.onerror = () => { link.href = `https://fonts.googleapis.com/css2?${faces.map((n) => `family=${n.replace(/ /g, "+")}`).join("&")}&display=swap`; };
      document.head.appendChild(link);
      const fall = (n, rest) => `"${n}", ${rest}`;
      const l2Back = l2Face ? `"${l2Face}", ` : "";
      if (F.display) css.setProperty("--display", fall(F.display, `${l2Back}"${F.deva || "Tiro Devanagari Hindi"}", Georgia, serif`));
      if (F.serif) css.setProperty("--serif", fall(F.serif, `${l2Back}"${F.deva || "Tiro Devanagari Hindi"}", Georgia, serif`));
      if (F.deva) css.setProperty("--deva", fall(F.deva, `"${F.serif || "Cormorant Garamond"}", serif`));
      if (F.sans) css.setProperty("--sans", fall(F.sans, "system-ui, sans-serif"));
    }
    if (!data || !data.her || !data.him) {
      document.body.classList.add("empty");
      $("#copy").innerHTML = `<p class="blk on empty-note">${esc(UI.en.notReady)}</p>`;
      return;
    }
    // ?lang= is "en", "hi" or the second language's own code ("ur"): the last two are the same page.
    const asked = params.get("lang");
    lang = asked === "en" || asked === "hi" ? asked : asked && asked === L2 ? "hi" : data.lang || "en";
    setTag();
    family = data.families?.find((f) => f.name.toLowerCase() === familyParam.toLowerCase()) || (familyParam ? { name: familyParam, group: params.get("g") || "all" } : null);
    group = family?.group || params.get("g") || "all";
    if (video) document.body.classList.add("video");
    if (reduced) document.body.classList.add("calm");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = WALK.palette?.night || "#16110d";

    await loadFilms(WALK.scenes);
    WALK.scenes.forEach((s) => { if (s.type === "film" && s.film?.count) { s.film.base = s.film.base || `${ROOT}walks/${WALK.id}/`; prepFilm(s); } });
    buildScenes();
    // The first scene's pictures come first; everything else waits for the page to finish loading.
    want(sourcesOf(scenes[0]), true);
    if (WALK.ornament) want([WALK.ornament], true);
    layout(true);
    setLang(lang);
    layout(true);
    document.fonts?.ready.then(() => { layoutBlocks(); measured.clear(); dirty = true; });

    if (document.readyState === "complete") setTimeout(startLoading, 60);
    else addEventListener("load", () => setTimeout(startLoading, 60), { once: true });
    addEventListener("scroll", startLoading, { passive: true, once: true });
    if (holding) {
      // Only the visitor's own input lets the films go: a scroll alone may be the page restoring its place.
      const inputs = ["touchstart", "wheel", "pointerdown", "keydown"];
      const release = () => { holding = false; inputs.forEach((t) => removeEventListener(t, release)); pumpFilms(); };
      inputs.forEach((t) => addEventListener(t, release, { passive: true }));
    }
    addEventListener("scroll", () => { readScroll(); settleSoon(); }, { passive: true });
    addEventListener("touchstart", () => { touching = true; clearTimeout(idleTimer); }, { passive: true });
    addEventListener("touchend", () => { touching = false; settleSoon(); }, { passive: true });
    new ResizeObserver(() => layout()).observe(stage);
    addEventListener("resize", () => layout());

    $("#langBtn").addEventListener("click", () => setLang(lang === "hi" ? "en" : "hi"));
    // "off": the couple chose no music, so there's no button for it.
    if (data.music === "off") $("#soundBtn").style.display = "none";
    else $("#soundBtn").addEventListener("click", toggleMusic);
    $("#detailsBtn").addEventListener("click", () => openSheet("top"));
    $("#skip").addEventListener("click", (e) => { e.preventDefault(); openSheet("top"); });
    $("#closeBtn").addEventListener("click", () => $("#details").close());
    $("#details").addEventListener("close", () => document.documentElement.classList.remove("sheet-open"));
    $("#details").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    $("#mono").addEventListener("click", () => scrollToPos(0));
    $("#nextBtn").addEventListener("click", walkOn);

    // The builder reloads its preview on every change, so the preview keeps the couple's place in
    // this walk (another walk starts at its door). An address that says where (?at=, the paywall's
    // full screen at the door) goes there instead.
    const at = params.get("at"), yKey = `saath-walk-y:${WALK.id}`;
    if (at) requestAnimationFrame(() => { scrollToPos(clamp(+at || 0, 0, total), false); readScroll(); pos = target; dirty = true; });
    else if (SAATH.draft) {
      const y = Number(sessionStorage.getItem(yKey) || 0);
      if (y) requestAnimationFrame(() => scrollTo(0, y));
    }
    if (SAATH.draft) addEventListener("scroll", () => sessionStorage.setItem(yKey, String(Math.round(scrollY))), { passive: true });
    if (debug || filming) {
      window.__walk = {
        // Every picture drawn at `p` is in: the scenes in view (a doorway shows the next one through
        // it), and for a film the two frames it blends there. The export waits for it before each frame.
        ready: (p = pos) => scenes.every((s) => {
          if (s.start > p + 0.6 || s.start + s.length < p - 0.05) return true;
          if (s.type !== "film") return sceneReady(s);
          const F = s.film;
          if (!F?.ready) return false;
          const i = Math.floor(clamp(localT(s, p), 0, 1) * (F.count - 1));
          return !!F.ready[i] && !!F.ready[Math.min(F.count - 1, i + 1)];
        }),
        // `at`: where the player rests each set of words (its hold, along the whole walk). `from`: where
        // they start to fade in.
        words: () => blocks.map((b) => ({ id: b.id, a: +b.a.toFixed(4), b: +b.b.toFixed(4), from: +Math.max(b.fadeFrom, b.a - FADE).toFixed(4), at: +(b.scene.start + b.hold * b.scene.length).toFixed(4), words: (b.el.textContent || "").trim().split(/\s+/).filter(Boolean).length })),
        filmOf: () => scenes.map((s) => (s.type === "film" && s.film ? s.film.duration : null)),
        scenes: () => scenes.map((s) => ({ id: s.id, type: s.type, start: +s.start.toFixed(3), length: +s.length.toFixed(3), ready: sceneReady(s), shown: s.shownAt !== undefined })),
        blocks: () => blocks.map((b) => ({ id: b.id, scene: b.scene.id, a: +b.a.toFixed(3), b: +b.b.toFixed(3), tone: b.el.dataset.tone, read: b.el.dataset.read && JSON.parse(b.el.dataset.read), box: [Math.round(b.x), Math.round(b.y), b.w, Math.round(b.h)] })),
        total: () => total, stops: () => stops, unit: () => unit,
        // Filming, the walk moves without scrolling the page: a capture below the top of the page
        // laid it out again at the document's height, and every frame came out shifted.
        go(p) { debugSnap = true; if (filming) target = pos = clamp(p, 0, total); else { scrollToPos(p, false); readScroll(); pos = target; } dirty = true; },
        loaded: () => [...IM.values()].every((e) => e.state >= 2) && !inflight,
        cost: () => { const s = costs.slice().sort((a, b) => a - b); const q = (k) => +(s[Math.floor(s.length * k)] || 0).toFixed(2); costs.length = 0; return { n: s.length, median: q(0.5), p95: q(0.95), max: q(0.999) }; },
      };
    }
    requestAnimationFrame(tick);
  }
  boot().catch((err) => console.error("walk", err));
})();
