// Bride Side Data & Configuration
(function() {
  const THEME_DATA = {"layout": "keepsake", "id": "sheesh-mahal", "name": "Sheesh Mahal", "line": "A mirror palace in the dark. One lamp is lit, a thousand mirrors catch it, and your names wait in the glowing arch.", "story": "In a Sheesh Mahal, the walls and the dome are set with thousands of tiny convex mirrors, so one lamp is enough to light the whole hall. Your invite opens in the dark, lights a single lamp and lets the mirrors do the rest, then keeps glittering behind your names.", "palette": {"ink": "#F3EADB", "paper": "#14111C", "accent": "#D9B26A", "accent2": "#8E93A3", "gold": "#E2BC72", "night": "#0B0910"}, "fonts": {"script": "Corinthia", "serif": "Cormorant Garamond", "deva": "Tiro Devanagari Hindi", "display": "Italiana"}, "moods": {"haldi": {"accent": "#E3A93B", "paper": "#1B1510"}, "mehendi": {"accent": "#8DB36A", "paper": "#121712"}, "sangeet": {"accent": "#C58BD9", "paper": "#16101C"}, "wedding": {"accent": "#E07A62", "paper": "#1C1012"}, "reception": {"accent": "#D9B26A", "paper": "#14111C"}}, "opening": {"type": "keepsake", "gesture": "lamp", "film": "opening.mp4", "first": "opening-first.webp", "last": "opening-last.webp", "loop": "loop.mp4", "aspect": "9 / 16", "focus": [0.15, 0.18, 0.85, 0.86], "tap": [0.2, 0.24, 0.8, 0.86], "from": 0.3, "rate": 1.2, "writeAt": 4.3, "names": {"left": 0.27, "top": 0.33, "right": 0.73, "bottom": 0.64}, "tone": "light", "glints": [{"left": 0.02, "top": 0.12, "right": 0.2, "bottom": 0.72}, {"left": 0.8, "top": 0.12, "right": 0.98, "bottom": 0.72}, {"left": 0.12, "top": 0, "right": 0.88, "bottom": 0.16}], "hint": {"en": "Tap to light the lamp", "hi": "दीया जलाने के लिए छुएँ"}, "filmNote": "Made once in Google Flow (experiments/collections/2026-10-31-next-films, runs/flow/generations.json): Nano Banana keyframes sheesh-k0-a (the mirror hall in the dark, an unlit diya on a marble ledge) and sheesh-k1-a (the hall lit), and a Veo 3.1 Fast clip between them, cut at 5.6 s while the hall is at its brightest (Veo then dimmed it towards the keyframe), settled onto the first keyframe and cropped to the centred 9:16 window clear of Flow's marks. loop.mp4 is the film's last 1.5 s played backwards then forwards, so it starts on the frame the film ends on. Positions are fractions of the cropped frame.", "edge": {"top": "#111a23", "bottom": "#0c1822"}}, "art": {"closed": "closed.webp", "open": "open.webp", "hero": "hero.webp", "paper": "paper.webp", "frame": "frame.webp", "divider": "divider.webp", "corner": "corner.webp", "motif": "motif.webp", "frameZone": {"top": 0.3, "bottom": 0.9, "left": 0.17, "right": 0.83}, "heroCouple": null, "cardHero": {"file": "open.webp", "focus": [0.5, 0.45]}, "fn": {"haldi": "fn-haldi.webp", "mehendi": "fn-mehendi.webp", "sangeet": "fn-sangeet.webp", "wedding": "fn-wedding.webp", "reception": "fn-reception.webp", "engagement": "fn-engagement.webp"}, "venue": "venue.webp", "dress": "dress.webp", "scenes": {"invite": {"file": "scene-invite.webp", "corners": [[0.2025, 0.1426], [0.5293, 0.1396], [0.5312, 0.8037], [0.1992, 0.8076]]}, "welcome": {"file": "scene-welcome.webp", "corners": [[0.2773, 0.2292], [0.7227, 0.2285], [0.7373, 0.6582], [0.2715, 0.6608]]}, "table": {"file": "scene-table.webp", "corners": [[0.0651, 0.3984], [0.2324, 0.3936], [0.2227, 0.7842], [0.0482, 0.7881]]}, "favour": {"file": "scene-favour.webp", "corners": [[0.3252, 0.3594], [0.6777, 0.3604], [0.6758, 0.6221], [0.3213, 0.6201]]}}}};
  const origFetch = window.fetch;
  window.fetch = async function(url, options) {
    const urlStr = String(url);
    if (urlStr.includes("sheesh-mahal/theme.json") || urlStr.endsWith("theme.json")) {
      return new Response(JSON.stringify(THEME_DATA), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      return await origFetch(url, options);
    } catch (e) {
      if (urlStr.includes("theme.json")) {
        return new Response(JSON.stringify(THEME_DATA), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      }
      throw e;
    }
  };
})();

window.SAATH = {
  "root": "assets/",
  "data": {
  "theme": "sheesh-mahal",
  "lang": "en",
  "community": "north-hindu",
  "her": {
    "en": "Priyanka",
    "hi": "प्रियंका",
    "full": {
      "en": "Ayu. Priyanka Yadav",
      "hi": "आयु० प्रियंका यादव"
    },
    "vibe": {
      "en": "Graceful & Radiant",
      "hi": "सौम्य एवं मनमोहक"
    },
    "loves": [
      "lotus",
      "traditional-music",
      "diya",
      "mehendi",
      "sitar",
      "peacock"
    ]
  },
  "him": {
    "en": "Amit",
    "hi": "अमित",
    "full": {
      "en": "Chi. Amit Yadav",
      "hi": "चि० अमित यादव"
    },
    "vibe": {
      "en": "Noble & Honorable",
      "hi": "सज्जन एवं कर्मठ"
    },
    "loves": [
      "cricket",
      "family",
      "travel",
      "music",
      "books"
    ]
  },
  "parents": {
    "her": {
      "en": "Smt. Vimla Yadav & Shri Shivram Yadav\n(Granddaughter of Late Smt. Mangra Devi & Late Shri Harihar Yadav)",
      "hi": "श्रीमती विमला यादव एवं श्री शिवराम यादव\n(पौत्री: स्व० मंगरा देवी एवं स्व० हरिहर यादव)"
    },
    "him": {
      "en": "Smt. Janki Yadav & Late Shri Bajrang Yadav\n(Grandson of Late Shri Marhu Yadav & Late Shri Brijlal Yadav)",
      "hi": "श्रीमती जानकी यादव एवं स्व० बजरंग यादव\n(पौत्र: स्व० मरहू यादव एवं स्व० बृज लाल यादव)"
    }
  },
  "wedding": "2026-12-04T19:00:00+05:30",
  "city": {
    "en": "Lucknow",
    "hi": "लखनऊ"
  },
  "journey": {
    "from": {
      "en": "Lucknow",
      "hi": "लखनऊ"
    }
  },
  "venue": {
    "name": {
      "en": "Chaudhary Garden Marriage Lawn",
      "hi": "चौधरी गार्डेन मैरिज लॉन"
    },
    "address": {
      "en": "Shraddha Nagar, Sector-1, Gomti Nagar, Lucknow, Uttar Pradesh",
      "hi": "श्रद्धा नगर, सेक्टर-1, गोमती नगर, लखनऊ, उत्तर प्रदेश"
    },
    "map": "https://www.google.com/maps/search/?api=1&query=Chaudhary+Garden+Marriage+Lawn+Shraddha+Nagar+Sector+1+Gomti+Nagar+Lucknow"
  },
  "travel": [
    {
      "en": "Lucknow Charbagh Railway Station (LKO) is approx 25 minutes away.",
      "hi": "लखनऊ चारबाग रेलवे स्टेशन लगभग 25 मिनट की दूरी पर है।"
    },
    {
      "en": "Chaudhary Charan Singh International Airport (LKO) is approx 35 minutes away.",
      "hi": "चौधरी चरण सिंह अंतर्राष्ट्रीय हवाई अड्डा लगभग 35 मिनट की दूरी पर है।"
    }
  ],
  "stay": [
    {
      "name": {
        "en": "Family Residence & Guest Accommodations",
        "hi": "पारिवारिक निवास एवं अतिथि व्यवस्था"
      },
      "note": {
        "en": "33-C, Jai Vihar Colony, Lane-2, Indira Nagar, Lucknow",
        "hi": "33-सी, जय विहार कालोनी, लेन-2, इन्दिरा नगर, लखनऊ"
      }
    }
  ],
  "events": [
    {
      "id": "tel-pujan",
      "art": "haldi",
      "name": {
        "en": "Tel Pujan",
        "hi": "तेल पूजन"
      },
      "start": "2026-12-02T16:00:00+05:30",
      "end": "2026-12-02T20:00:00+05:30",
      "place": {
        "en": "Bride's Residence: 33-C, Jai Vihar Colony, Lane-2, Indira Nagar, Lucknow",
        "hi": "कन्या निवास: 33-सी, जय विहार कालोनी, लेन-2, इन्दिरा नगर, लखनऊ"
      },
      "dress": {
        "en": "Traditional Indian / Festive Auspicious",
        "hi": "पारंपरिक भारतीय परिधान"
      },
      "palette": [
        "#E3A93B",
        "#D9822B",
        "#F8E6C8"
      ]
    },
    {
      "id": "haldi-mehendi",
      "art": "mehendi",
      "name": {
        "en": "Haldi & Mehendi",
        "hi": "हल्दी एवं मेंहदी"
      },
      "start": "2026-12-03T16:00:00+05:30",
      "end": "2026-12-03T21:00:00+05:30",
      "place": {
        "en": "Bride's Residence: 33-C, Jai Vihar Colony, Lane-2, Indira Nagar, Lucknow",
        "hi": "कन्या निवास: 33-सी, जय विहार कालोनी, लेन-2, इन्दिरा नगर, लखनऊ"
      },
      "dress": {
        "en": "Yellows, Greens & Floral Elegance",
        "hi": "हल्दी पीला, हरा एवं फ्लोरल"
      },
      "palette": [
        "#F2C45A",
        "#4F7A3A",
        "#FEF3C7"
      ]
    },
    {
      "id": "wedding",
      "art": "wedding",
      "name": {
        "en": "Tilak & Shubh Vivah",
        "hi": "तिलक एवं शुभ विवाह"
      },
      "start": "2026-12-04T19:00:00+05:30",
      "end": "2026-12-04T23:59:00+05:30",
      "place": {
        "en": "Chaudhary Garden Marriage Lawn, Shraddha Nagar, Sector-1, Gomti Nagar, Lucknow",
        "hi": "चौधरी गार्डेन मैरिज लॉन, श्रद्धा नगर, सेक्टर-1, गोमती नगर, लखनऊ"
      },
      "dress": {
        "en": "Royal Indian Attire, Ethnic Silks & Sparkle",
        "hi": "शाही भारतीय परिधान, रेशमी वस्त्र"
      },
      "palette": [
        "#A3122F",
        "#E88B1E",
        "#F6ECD6"
      ]
    },
    {
      "id": "vidaai",
      "art": "reception",
      "noTime": true,
      "time": false,
      "name": {
        "en": "Vidaai (Bheegi Palkein)",
        "hi": "भीगी पलकें (विदाई)"
      },
      "start": "2026-12-05T07:00:00+05:30",
      "end": "2026-12-05T10:00:00+05:30",
      "place": {
        "en": "Chaudhary Garden Marriage Lawn, Gomti Nagar, Lucknow",
        "hi": "चौधरी गार्डेन मैरिज लॉन, गोमती नगर, लखनऊ"
      },
      "dress": {
        "en": "Traditional Indian",
        "hi": "पारंपरिक भारतीय"
      },
      "palette": [
        "#B88E62",
        "#D9B26A",
        "#F5EDE0"
      ]
    }
  ],
  "story": {
    "en": "With the divine blessings of Lord Ganesha and our revered elders, two families unite in love, joy, and celebration as Priyanka and Amit begin their lifelong sacred journey.",
    "hi": "परमपिता परमेश्वर एवं भगवान श्री गणेश की असीम अनुकम्पा से, हमारे आदरणीय बुजुर्गों के शुभाशीर्वाद से, प्रियंका एवं अमित का मंगल-परिणय संस्कार सम्पन्न होने जा रहा है।"
  },
  "timeline": [
    {
      "when": {
        "en": "02 Dec 2026",
        "hi": "०२ दिसम्बर २०२६"
      },
      "what": {
        "en": "Tel Pujan at Indira Nagar Residence",
        "hi": "शुभ तेल पूजन, इन्दिरा नगर निवास"
      }
    },
    {
      "when": {
        "en": "03 Dec 2026",
        "hi": "०३ दिसम्बर २०२६"
      },
      "what": {
        "en": "Haldi & Mehendi festivities",
        "hi": "उल्लास भरी हल्दी एवं मेंहदी की रस्म"
      }
    },
    {
      "when": {
        "en": "04 Dec 2026",
        "hi": "०४ दिसम्बर २०२६"
      },
      "what": {
        "en": "Tilak & Shubh Vivah, Chaudhary Garden",
        "hi": "तिलक एवं पावन शुभ विवाह संस्कार"
      }
    },
    {
      "when": {
        "en": "05 Dec 2026",
        "hi": "०५ दिसम्बर २०२६"
      },
      "what": {
        "en": "Vidaai - Bheegi Palkein",
        "hi": "स्नेह भरी विदाई - भीगी पलकें"
      }
    }
  ],
  "family": null,
  "families": [],
  "rsvp": true,
  "rsvpBy": "2026-11-28",
  "rsvpPhone": "9415837514",
  "contacts": [
    {
      "name": {
        "en": "Shri Shivram Yadav",
        "hi": "श्री शिवराम यादव"
      },
      "phone": "9415837514"
    },
    {
      "name": {
        "en": "Family Helpline",
        "hi": "परिवार संपर्क"
      },
      "phone": "9044802050"
    }
  ],
  "song": {
    "url": "",
    "title": {
      "en": "Shehnai & Sitar Melody",
      "hi": "शहनाई एवं सितार वादन"
    },
    "artist": "Classical Traditional"
  },
  "signoff": {
    "en": "Cordially Invited by: Smt. Vimla Yadav & Shri Shivram Yadav & Entire Family",
    "hi": "विनीत: श्रीमती विमला यादव व श्री शिवराम यादव एवं समस्त यादव परिवार"
  },
  "logo": {
    "family": "custom"
  },
  "logoSrc": "assets/images/logo.png",
  "logoDark": "assets/images/logo.png",
  "draft": false,
  "slug": "priyanka-amit",
  "api": null,
  "familyKey": null
}
};
