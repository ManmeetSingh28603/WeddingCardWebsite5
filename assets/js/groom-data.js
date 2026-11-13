// Groom Side Data & Configuration
(function() {
  const WALK_DATA = {"id": "walk-ram-mandir", "name": {"en": "Ayodhya Dham", "hi": "अयोध्या धाम"}, "base": "ayodhya", "art": "themes/ayodhya/", "music": "themes/theme.mp3", "poster": "../../walks/walk-ram-mandir/film-a2-poster.webp", "invocation": "॥ जय सियाराम ॥", "ornament": "divider.webp", "palette": {"ink": "#2A1C14", "paper": "#F6EEDF", "accent": "#C8551B", "gold": "#C9973F", "night": "#0A0F26", "ivory": "#FBF4E6", "muted": "#8A7560"}, "fonts": {"display": "Cormorant Garamond", "serif": "Cormorant Garamond", "deva": "Tiro Devanagari Hindi"},     "functions": {
      "haldi": {
        "art": "fn-haldi.webp",
        "trim": [
          0.102,
          0.147,
          0.897,
          0.87
        ],
        "wall": "#2A2148",
        "accent": "#F2C45A"
      },
      "mehendi": {
        "art": "fn-mehendi.webp",
        "trim": [
          0.142,
          0.123,
          0.858,
          0.816
        ],
        "wall": "#15283F",
        "accent": "#E8C770"
      },
      "wedding": {
        "art": "fn-wedding.webp",
        "trim": [
          0.166,
          0.136,
          0.836,
          0.863
        ],
        "wall": "#2E1433",
        "accent": "#F2C976"
      },
      "vidaai": {
        "art": "fn-vidaai.webp",
        "trim": [
          0.02,
          0.02,
          0.98,
          0.98
        ],
        "wall": "#2E1433",
        "accent": "#F2C976"
      },
      "reception": {
        "art": "fn-reception.webp",
        "trim": [
          0.156,
          0.122,
          0.841,
          0.836
        ],
        "wall": "#141A3D",
        "accent": "#E6B04C"
      }
    }, "scenes": [{"id": "arrival", "type": "still", "length": 1.2, "chapter": {"en": "Ayodhya", "hi": "अयोध्या"}, "image": {"src": "../../walks/walk-ram-mandir/film-a2-poster.webp", "w": 1080, "h": 1920}, "extend": {"top": 0.5, "mirror": 0.05, "tone": "#060A1C", "dark": 0.55}, "stars": {"count": 36, "zone": [0, -0.5, 1, 0.12]}, "camera": {"from": {"box": [0, -0.32, 1, 0.68], "mode": "fill"}, "to": {"box": [0, 0, 1, 1], "mode": "fill"}, "ease": "inOut"}, "copy": [{"block": "arrival", "zone": [0.08, -0.29, 0.92, 0.0], "align": "middle", "at": [0, 0.25]}], "exit": {"type": "cut"}}, {"id": "temple", "type": "film", "film": "film-a2.json", "poster": "../../walks/walk-ram-mandir/film-a2-poster.webp", "secondsPerScreen": 5.2, "chapter": {"en": "The temple", "hi": "मंदिर"}, "copy": [{"block": "story", "zone": [0.1, 0.7, 0.9, 0.93], "align": "middle", "at": [7.2, 8.6]}], "exit": {"type": "cut"}}, {"id": "sanctum", "type": "still", "length": 2.2, "chapter": {"en": "The blessing", "hi": "आशीर्वाद"}, "image": {"src": "../../walks/walk-ram-mandir/sanctum.webp", "w": 1536, "h": 2752}, "camera": {"from": {"box": [0.0708, 0, 0.9292, 0.8586], "mode": "fill"}, "to": {"box": [0.16, 0.2, 0.84, 0.88], "mode": "fill"}, "ease": "inOut", "span": [0, 0.45]}, "copy": [{"block": "blessing", "zone": [0.22, 0.3, 0.78, 0.74], "align": "middle", "at": [0.3, 0.55], "tone": "dark", "veil": 0.88}], "exit": {"type": "zoom", "portal": [0.405, 0.35, 0.605, 0.67], "shape": "rect", "length": 0.8}}, {"id": "darshan", "type": "still", "blessing": true, "length": 1.4, "chapter": {"en": "Ram Darbar", "hi": "राम दरबार"}, "image": {"src": "../../walks/walk-ram-mandir/darshan.webp", "w": 1536, "h": 2752}, "extend": {"top": 0.32, "mirror": 0.06, "tone": "#B88E62", "dark": 0.25}, "camera": {"from": {"box": [0, -0.3, 1, 1], "mode": "fill", "align": [0.5, 0.62]}, "to": {"box": [0, -0.3, 1, 1], "mode": "fill", "align": [0.5, 0.62]}, "ease": "out"}, "copy": [], "exit": {"type": "cut"}}, {"id": "rooms", "type": "room", "each": "function", "budget": 3.6, "length": 0.9, "arch": {"src": "../../walks/walk-ram-mandir/arch-tall.webp", "w": 900, "h": 1612}, "plaster": "#C9A28C", "floor": 0.7, "depth": {"art": 1.14, "arch": 1.45}, "camera": {"from": {"box": [0, 0, 1, 1], "mode": "fill"}, "to": {"box": [0.03, 0.03, 0.97, 0.97], "mode": "fill", "align": [0.5, 0.42]}, "ease": "out"}, "copy": [{"block": "function", "zone": "auto", "align": "middle", "at": [0.08, 0.5]}], "exit": {"type": "fade", "length": 0.4}}, {"id": "saryu", "type": "film", "film": "film-b2.json", "poster": "../../walks/walk-ram-mandir/film-b2-poster.webp", "secondsPerScreen": 3.4, "chapter": {"en": "By the Saryu", "hi": "सरयू के तट पर"}, "copy": [{"block": "venue", "zone": [0.08, 0.06, 0.92, 0.46], "align": "top", "at": [4.3, 5.4]}, {"block": "reply", "zone": [0.1, 0.06, 0.9, 0.46], "align": "top", "at": [7.4, 7.833]}], "exit": {"type": "end"}}]};
  const FILM_A2 = {"fps": 12, "count": 187, "width": 900, "height": 1600, "dir": "film-a2/", "ext": "webp", "duration": 15.625, "cuts": [0.0, 7.833, 15.625], "bytes": 14987816, "crop": [76, 0, 928, 1649], "joins": [0.92]};
  const FILM_B2 = {"fps": 12, "count": 94, "width": 900, "height": 1600, "dir": "film-b2/", "ext": "webp", "duration": 7.833, "cuts": [0.0, 7.833], "bytes": 8065760, "crop": [76, 0, 928, 1649], "joins": []};
  const origFetch = window.fetch;
  window.fetch = async function(url, options) {
    const urlStr = String(url);
    if (urlStr.includes("walk.json") || urlStr.endsWith("walk.json")) {
      return new Response(JSON.stringify(WALK_DATA), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (urlStr.includes("film-a2.json") || urlStr.endsWith("film-a2.json")) {
      return new Response(JSON.stringify(FILM_A2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (urlStr.includes("film-b2.json") || urlStr.endsWith("film-b2.json")) {
      return new Response(JSON.stringify(FILM_B2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      return await origFetch(url, options);
    } catch (e) {
      if (urlStr.includes("walk.json")) return new Response(JSON.stringify(WALK_DATA), { status: 200, headers: { "Content-Type": "application/json" } });
      if (urlStr.includes("film-a2.json")) return new Response(JSON.stringify(FILM_A2), { status: 200, headers: { "Content-Type": "application/json" } });
      if (urlStr.includes("film-b2.json")) return new Response(JSON.stringify(FILM_B2), { status: 200, headers: { "Content-Type": "application/json" } });
      throw e;
    }
  };
})();

window.SAATH = {
  "root": "assets/",
  "data": {
  "theme": "walk-ram-mandir",
  "lang": "en",
  "groomFirst": true,
  "community": "north-hindu",
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
      "sitar"
    ]
  },
  "parents": {
    "him": {
      "en": "Smt. Janki Yadav & Late Shri Bajrang Yadav",
      "hi": "श्रीमती जानकी यादव एवं स्व० बजरंग यादव"
    },
    "her": {
      "en": "Smt. Vimla Yadav & Shri Shivram Yadav",
      "hi": "श्रीमती विमला यादव एवं श्री शिवराम यादव"
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
        "en": "Groom's Family Residence",
        "hi": "वर पक्ष निवास"
      },
      "note": {
        "en": "358/195, Biharipur, Saadatganj, Lucknow",
        "hi": "358/195, बिहारीपुर, सआदतगंज, लखनऊ"
      }
    }
  ],
  "events": [
    {
      "id": "tel-pujan",
      "name": {
        "en": "Tel Pujan",
        "hi": "तेल पूजन"
      },
      "start": "2026-12-02T16:00:00+05:30",
      "end": "2026-12-02T20:00:00+05:30",
      "place": {
        "en": "Groom's Residence: 358/195, Biharipur, Saadatganj, Lucknow",
        "hi": "वर निवास: 358/195, बिहारीपुर, सआदतगंज, लखनऊ"
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
      "name": {
        "en": "Haldi & Mehendi",
        "hi": "हल्दी एवं मेंहदी"
      },
      "start": "2026-12-03T15:00:00+05:30",
      "end": "2026-12-03T21:00:00+05:30",
      "place": {
        "en": "Groom's Residence: 358/195, Biharipur, Saadatganj, Lucknow",
        "hi": "वर निवास: 358/195, बिहारीपुर, सआदतगंज, लखनऊ"
      },
      "dress": {
        "en": "Yellows, Greens & Festive Attire",
        "hi": "पीला, हरा एवं पारंपरिक परिधान"
      },
      "palette": [
        "#F2C45A",
        "#4F7A3A",
        "#FEF3C7"
      ]
    },
    {
      "id": "wedding",
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
        "en": "Royal Indian Attire, Ethnic Silks",
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
        "art": "vidaai",
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
      },
      {
        "id": "reception",
        "art": "reception",
        "name": {
          "en": "Reception",
          "hi": "शुभ आशीर्वाद समारोह"
        },
        "start": "2026-12-07T19:00:00+05:30",
        "end": "2026-12-07T23:59:00+05:30",
        "place": {
          "en": "Mehta Lawn, Sarfarazganj, Balaganj, Hardoi Road, Lucknow",
          "hi": "मेहता लॉन, सरफराजगंज, बालागंज, हरदोई रोड लखनऊ में सम्पन्न होंगे।"
        },
        "dress": {
          "en": "Festive Formal / Royal Indian Attire",
          "hi": "मांगलिक उत्सव परिधान / पारंपरिक भारतीय"
        },
        "palette": [
          "#C9973F",
          "#141A3D",
          "#FBF4E6"
        ]
      }
  ],
  "story": {
    "en": "Under the divine aura of Shri Ram Darbar and Lord Ganesha, Amit and Priyanka embark upon the sacred union of marriage. We cordially request your gracious presence and blessings.",
    "hi": "भगवान श्री राम के पावन दरबार एवं श्री गणपति महाराज की असीम कृपा से, अमित एवं प्रियंका के वैवाहिक परिणय संस्कार में आप सपरिवार सादर आमंत्रित हैं।"
  },
  "timeline": [
    {
      "when": {
        "en": "02 Dec 2026",
        "hi": "०२ दिसम्बर २०२६"
      },
      "what": {
        "en": "Tel Pujan Ceremony",
        "hi": "शुभ तेल पूजन संस्कार"
      }
    },
    {
      "when": {
        "en": "03 Dec 2026",
        "hi": "०३ दिसम्बर २०२६"
      },
      "what": {
        "en": "Haldi & Mehendi Celebrations",
        "hi": "हल्दी एवं मेंहदी का मांगलिक उत्सव"
      }
    },
    {
      "when": {
        "en": "04 Dec 2026",
        "hi": "०४ दिसम्बर २०२६"
      },
      "what": {
        "en": "Tilak & Shubh Vivah, Chaudhary Garden",
        "hi": "तिलक एवं शुभ विवाह, चौधरी गार्डेन"
      }
    },
            {
          "when": {
            "en": "05 Dec 2026",
            "hi": "०५ दिसम्बर २०२६"
          },
          "what": {
            "en": "Vidaai - Bheegi Palkein",
            "hi": "विदाई - भीगी पलकें"
          }
        },
        {
          "when": {
            "en": "07 Dec 2026",
            "hi": "०७ दिसम्बर २०२६"
          },
          "what": {
            "en": "Reception, Mehta Lawn",
            "hi": "शुभ आशीर्वाद समारोह, मेहता लॉन, लखनऊ"
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
        "en": "Yadav Family Helpline",
        "hi": "यादव परिवार संपर्क"
      },
      "phone": "9044802050"
    }
  ],
  "song": {
    "url": "",
    "title": {
      "en": "Sacred Sitar & Flute Raga",
      "hi": "दिव्य सितार एवं बाँसुरी वादन"
    },
    "artist": "Classical Traditional"
  },
  "signoff": {
    "en": "With blessings from Yadav Family, Saadatganj & Indira Nagar, Lucknow",
    "hi": "सप्रेम, यादव परिवार, सआदतगंज एवं इन्दिरा नगर, लखनऊ"
  },
  "logo": {
    "family": "custom"
  },
  "logoSrc": "assets/images/logo.png",
  "logoDark": "assets/images/logo.png",
  "draft": false,
  "walk": {
    "id": "walk-ram-mandir",
    "name": {
      "en": "Ayodhya Dham",
      "hi": "अयोध्या धाम"
    },
    "base": "ayodhya",
    "art": "themes/ayodhya/",
    "music": "themes/theme.mp3",
    "poster": "../../walks/walk-ram-mandir/film-a2-poster.webp",
    "invocation": "॥ जय सियाराम ॥",
    "ornament": "divider.webp",
    "palette": {
      "ink": "#2A1C14",
      "paper": "#F6EEDF",
      "accent": "#C8551B",
      "gold": "#C9973F",
      "night": "#0A0F26",
      "ivory": "#FBF4E6",
      "muted": "#8A7560"
    },
    "fonts": {
      "display": "Cormorant Garamond",
      "serif": "Cormorant Garamond",
      "deva": "Tiro Devanagari Hindi"
    },
        "functions": {
      "haldi": {
        "art": "fn-haldi.webp",
        "trim": [
          0.102,
          0.147,
          0.897,
          0.87
        ],
        "wall": "#2A2148",
        "accent": "#F2C45A"
      },
      "mehendi": {
        "art": "fn-mehendi.webp",
        "trim": [
          0.142,
          0.123,
          0.858,
          0.816
        ],
        "wall": "#15283F",
        "accent": "#E8C770"
      },
      "wedding": {
        "art": "fn-wedding.webp",
        "trim": [
          0.166,
          0.136,
          0.836,
          0.863
        ],
        "wall": "#2E1433",
        "accent": "#F2C976"
      },
      "vidaai": {
        "art": "fn-vidaai.webp",
        "trim": [
          0.02,
          0.02,
          0.98,
          0.98
        ],
        "wall": "#2E1433",
        "accent": "#F2C976"
      },
      "reception": {
        "art": "fn-reception.webp",
        "trim": [
          0.156,
          0.122,
          0.841,
          0.836
        ],
        "wall": "#141A3D",
        "accent": "#E6B04C"
      }
    },
    "scenes": [
      {
        "id": "arrival",
        "type": "still",
        "length": 1.2,
        "chapter": {
          "en": "Ayodhya",
          "hi": "अयोध्या"
        },
        "image": {
          "src": "../../walks/walk-ram-mandir/film-a2-poster.webp",
          "w": 1080,
          "h": 1920
        },
        "extend": {
          "top": 0.5,
          "mirror": 0.05,
          "tone": "#060A1C",
          "dark": 0.55
        },
        "stars": {
          "count": 36,
          "zone": [
            0,
            -0.5,
            1,
            0.12
          ]
        },
        "camera": {
          "from": {
            "box": [
              0,
              -0.32,
              1,
              0.68
            ],
            "mode": "fill"
          },
          "to": {
            "box": [
              0,
              0,
              1,
              1
            ],
            "mode": "fill"
          },
          "ease": "inOut"
        },
        "copy": [
          {
            "block": "arrival",
            "zone": [
              0.08,
              -0.29,
              0.92,
              0.0
            ],
            "align": "middle",
            "at": [
              0,
              0.25
            ]
          }
        ],
        "exit": {
          "type": "cut"
        }
      },
      {
        "id": "temple",
        "type": "film",
        "film": "film-a2.json",
        "poster": "../../walks/walk-ram-mandir/film-a2-poster.webp",
        "secondsPerScreen": 5.2,
        "chapter": {
          "en": "The temple",
          "hi": "मंदिर"
        },
        "copy": [
          {
            "block": "story",
            "zone": [
              0.1,
              0.7,
              0.9,
              0.93
            ],
            "align": "middle",
            "at": [
              7.2,
              8.6
            ]
          }
        ],
        "exit": {
          "type": "cut"
        }
      },
      {
        "id": "sanctum",
        "type": "still",
        "length": 2.2,
        "chapter": {
          "en": "The blessing",
          "hi": "आशीर्वाद"
        },
        "image": {
          "src": "../../walks/walk-ram-mandir/sanctum.webp",
          "w": 1536,
          "h": 2752
        },
        "camera": {
          "from": {
            "box": [
              0.0708,
              0,
              0.9292,
              0.8586
            ],
            "mode": "fill"
          },
          "to": {
            "box": [
              0.16,
              0.2,
              0.84,
              0.88
            ],
            "mode": "fill"
          },
          "ease": "inOut",
          "span": [
            0,
            0.45
          ]
        },
        "copy": [
          {
            "block": "blessing",
            "zone": [
              0.22,
              0.3,
              0.78,
              0.74
            ],
            "align": "middle",
            "at": [
              0.3,
              0.55
            ],
            "tone": "dark",
            "veil": 0.88
          }
        ],
        "exit": {
          "type": "zoom",
          "portal": [
            0.405,
            0.35,
            0.605,
            0.67
          ],
          "shape": "rect",
          "length": 0.8
        }
      },
      {
        "id": "darshan",
        "type": "still",
        "blessing": true,
        "length": 1.4,
        "chapter": {
          "en": "Ram Darbar",
          "hi": "राम दरबार"
        },
        "image": {
          "src": "../../walks/walk-ram-mandir/darshan.webp",
          "w": 1536,
          "h": 2752
        },
        "extend": {
          "top": 0.32,
          "mirror": 0.06,
          "tone": "#B88E62",
          "dark": 0.25
        },
        "camera": {
          "from": {
            "box": [
              0,
              -0.3,
              1,
              1
            ],
            "mode": "fill",
            "align": [
              0.5,
              0.62
            ]
          },
          "to": {
            "box": [
              0,
              -0.3,
              1,
              1
            ],
            "mode": "fill",
            "align": [
              0.5,
              0.62
            ]
          },
          "ease": "out"
        },
        "copy": [],
        "exit": {
          "type": "cut"
        }
      },
      {
        "id": "rooms",
        "type": "room",
        "each": "function",
        "budget": 3.6,
        "length": 0.9,
        "arch": {
          "src": "../../walks/walk-ram-mandir/arch-tall.webp",
          "w": 900,
          "h": 1612
        },
        "plaster": "#C9A28C",
        "floor": 0.7,
        "depth": {
          "art": 1.14,
          "arch": 1.45
        },
        "camera": {
          "from": {
            "box": [
              0,
              0,
              1,
              1
            ],
            "mode": "fill"
          },
          "to": {
            "box": [
              0.03,
              0.03,
              0.97,
              0.97
            ],
            "mode": "fill",
            "align": [
              0.5,
              0.42
            ]
          },
          "ease": "out"
        },
        "copy": [
          {
            "block": "function",
            "zone": "auto",
            "align": "middle",
            "at": [
              0.08,
              0.5
            ]
          }
        ],
        "exit": {
          "type": "fade",
          "length": 0.4
        }
      },
      {
        "id": "saryu",
        "type": "film",
        "film": "film-b2.json",
        "poster": "../../walks/walk-ram-mandir/film-b2-poster.webp",
        "secondsPerScreen": 3.4,
        "chapter": {
          "en": "By the Saryu",
          "hi": "सरयू के तट पर"
        },
        "copy": [
          {
            "block": "venue",
            "zone": [
              0.08,
              0.06,
              0.92,
              0.46
            ],
            "align": "top",
            "at": [
              4.3,
              5.4
            ]
          },
          {
            "block": "reply",
            "zone": [
              0.1,
              0.06,
              0.9,
              0.46
            ],
            "align": "top",
            "at": [
              7.4,
              7.833
            ]
          }
        ],
        "exit": {
          "type": "end"
        }
      }
    ]
  },
  "walkId": "walk-ram-mandir",
  "slug": "amit-priyanka",
  "api": null,
  "familyKey": null
}
};
