(() => {
  const form = document.querySelector("#requestForm");
  if (!form) return;

  const field = (name) => form.querySelector(`[name="${name}"]`);
  const fields = {
    quoteType: field("quoteType"),
    items: field("items"),
    aiSituation: field("aiSituation"),
    familyComposition: field("familyComposition"),
    budgetStatus: field("budgetStatus"),
    budgetRange: field("budgetRange"),
    purchasePriority: field("purchasePriority"),
    aiRequestSummary: field("aiRequestSummary"),
    aiModelRecommendations: ensureHiddenField("aiModelRecommendations"),
    image: field("quoteImage"),
    customer: field("customer"),
    phone: field("phone"),
    purpose: field("purchasePurpose"),
    brand: field("desiredBrand"),
    price: field("price"),
    region: field("region"),
    installDate: field("installDate"),
    memo: field("memo"),
  };

  const message = form.querySelector("#requestFormMessage") || document.createElement("p");
  const previewTitle = document.querySelector("#previewTitle");
  const previewMeta = document.querySelector("#previewMeta");
  const imagePreview = document.querySelector("#imagePreview");

  const state = {
    stepIndex: 0,
    selectedProducts: [],
    productOptions: {},
    aiContext: {
      situation: "",
      family: [],
      budgetStatus: "",
      budgetRange: "",
      priorities: [],
      note: "",
    },
    catalogs: {},
    recommendationGroups: [],
    recommending: false,
  };

  async function fetchWithTimeout(path, options = {}, timeoutMs = 16000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(path, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const quoteTypes = [
    {
      value: "with_quote",
      title: "견적서가 있어요",
      text: "받은 견적서 사진을 올려 판매자 제안가와 혜택을 비교합니다.",
      badge: "정확한 견적 가능",
    },
    {
      value: "without_quote",
      title: "견적서가 없어요",
      text: "품목과 상황을 선택하면 AI가 브랜드별 후보 모델로 간이 견적서를 정리합니다.",
      badge: "",
    },
  ];

  const purposeOptions = [
    { value: "웨딩,혼수 특별혜택", title: "웨딩,혼수", text: "혼수 패키지 조건과 카드 혜택을 함께 비교합니다.", badge: "특별혜택" },
    { value: "신축입주 특별혜택", title: "신축입주", text: "입주 일정에 맞춘 배송, 설치 조건을 확인합니다.", badge: "특별혜택" },
    { value: "이사", title: "이사", text: "이사 일정에 맞춰 필요한 품목을 비교합니다." },
    { value: "인테리어", title: "인테리어", text: "공간과 빌트인 조건을 기준으로 비교합니다." },
    { value: "일반", title: "일반", text: "교체와 단품 구매 조건을 비교합니다." },
  ];

  const brandOptions = [
    { value: "LG전자", title: "LG전자", text: "LG전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "삼성전자", title: "삼성전자", text: "삼성전자 제품 중심으로 제안을 받고 싶어요." },
    { value: "비교견적", title: "비교견적", text: "LG와 삼성 조건을 함께 비교하고 싶어요." },
  ];

  const productOptions = [
    {
        "value": "TV",
        "title": "TV",
        "icon": "TV",
        "thumb": "tv"
    },
    {
        "value": "\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c TV",
        "title": "\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c TV",
        "icon": "LS",
        "thumb": "lifestyle"
    },
    {
        "value": "\ub0c9\uc7a5\uace0",
        "title": "\ub0c9\uc7a5\uace0",
        "icon": "\ub0c9",
        "thumb": "fridge"
    },
    {
        "value": "\uae40\uce58\ub0c9\uc7a5\uace0",
        "title": "\uae40\uce58\ub0c9\uc7a5\uace0",
        "icon": "\uae40",
        "thumb": "kimchi"
    },
    {
        "value": "\uc138\ud0c1\uae30/\uac74\uc870\uae30",
        "title": "\uc138\ud0c1\uae30+\uac74\uc870\uae30",
        "icon": "\uc138",
        "thumb": "washer"
    },
    {
        "value": "\uc758\ub958\uad00\ub9ac\uae30",
        "title": "\uc758\ub958 \uad00\ub9ac\uae30",
        "icon": "\uc758",
        "thumb": "styler"
    },
    {
        "value": "\uc5d0\uc5b4\ucee8",
        "title": "\uc5d0\uc5b4\ucee8",
        "icon": "\uc5d0",
        "thumb": "aircon"
    },
    {
        "value": "\uccad\uc18c\uae30",
        "title": "\uccad\uc18c\uae30",
        "icon": "\uccad",
        "thumb": "vacuum"
    },
    {
        "value": "\uc2dd\uae30\uc138\ucc99\uae30",
        "title": "\uc2dd\uae30\uc138\ucc99\uae30",
        "icon": "\uc2dd",
        "thumb": "dishwasher"
    },
    {
        "value": "\uc778\ub355\uc158",
        "title": "\uc778\ub355\uc158",
        "icon": "\uc778",
        "thumb": "induction"
    },
    {
        "value": "\uc624\ube10 / \uc804\uc790\ub808\uc778\uc9c0",
        "title": "\uc624\ube10 / \uc804\uc790\ub808\uc778\uc9c0",
        "icon": "\uc624",
        "thumb": "oven"
    },
    {
        "value": "\uc815\uc218\uae30",
        "title": "\uc815\uc218\uae30",
        "icon": "\uc815",
        "thumb": "water"
    },
    {
        "value": "\uacf5\uae30\uccad\uc815\uae30",
        "title": "\uacf5\uae30\uccad\uc815\uae30",
        "icon": "\uacf5",
        "thumb": "purifier"
    }
];

  const unknownOption = "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825";
  const brandOptionSchema = {
    "LG\uc804\uc790": {
        "TV": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "QNED",
                    "OLED",
                    "MRGB"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\uc778\uce58",
                "dependsOn": "type",
                "optionsByValue": {
                    "QNED": [
                        "32\uc778\uce58",
                        "43\uc778\uce58",
                        "55\uc778\uce58",
                        "65\uc778\uce58",
                        "75\uc778\uce58",
                        "85\uc778\uce58",
                        "100\uc778\uce58"
                    ],
                    "OLED": [
                        "42\uc778\uce58",
                        "48\uc778\uce58",
                        "55\uc778\uce58",
                        "65\uc778\uce58",
                        "77\uc778\uce58",
                        "83\uc778\uce58",
                        "98\uc778\uce58"
                    ],
                    "MRGB": [
                        "32\uc778\uce58",
                        "43\uc778\uce58",
                        "55\uc778\uce58",
                        "65\uc778\uce58",
                        "75\uc778\uce58",
                        "85\uc778\uce58",
                        "100\uc778\uce58"
                    ]
                }
            }
        ],
        "\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c TV": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8",
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8 GO"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\uc778\uce58",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8": [
                        "27\uc778\uce58"
                    ],
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8 GO": [
                        "27\uc778\uce58"
                    ]
                }
            }
        ],
        "\ub0c9\uc7a5\uace0": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc0c1\ub0c9\uc7a5",
                    "\ud54f\uc564\ub9e5\uc2a4",
                    "\uc591\ubb38\ud615",
                    "\ucee8\ubc84\ud130\ube14"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc0c1\ub0c9\uc7a5": [
                        "\uc5bc\uc74c\uc815\uc218\uae30 \ub0c9\uc7a5\uace0"
                    ],
                    "\ud54f\uc564\ub9e5\uc2a4": [
                        "\ub178\ud06c\uc628",
                        "\uc77c\ubc18"
                    ],
                    "\uc591\ubb38\ud615": [
                        "2\ub3c4\uc5b4"
                    ],
                    "\ucee8\ubc84\ud130\ube14": [
                        "1\ub3c4\uc5b4"
                    ]
                }
            }
        ],
        "\uae40\uce58\ub0c9\uc7a5\uace0": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ub69c\uaed1\uc2dd",
                    "\uc2a4\ud0e0\ub4dc",
                    "\ucee8\ubc84\ud130\ube14"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\ub69c\uaed1\uc2dd": [
                        "1\ub3c4\uc5b4",
                        "2\ub3c4\uc5b4"
                    ],
                    "\uc2a4\ud0e0\ub4dc": [
                        "\ud54f\uc564\ub9e5\uc2a4 3\ub3c4\uc5b4",
                        "\ud54f\uc564\ub9e5\uc2a4 4\ub3c4\uc5b4",
                        "\uc77c\ubc18 3\ub3c4\uc5b4",
                        "\uc77c\ubc18 4\ub3c4\uc5b4"
                    ],
                    "\ucee8\ubc84\ud130\ube14": [
                        "1\ub3c4\uc5b4"
                    ]
                }
            }
        ],
        "\uc138\ud0c1\uae30/\uac74\uc870\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc6cc\uc2dc\ud0c0\uc6cc",
                    "\ucf64\ubcf4",
                    "\ubd84\ub9ac\ud615(\uc138\ud0c1\uae30/\uac74\uc870\uae30)"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc6cc\uc2dc\ud0c0\uc6cc": [
                        "\uc635\uc158\ud615",
                        "AI"
                    ],
                    "\ucf64\ubcf4": [
                        "AI"
                    ],
                    "\ubd84\ub9ac\ud615": [
                        "\ubcd1\ub82c\uc124\uce58",
                        "\uc9c1\ub82c\uc124\uce58",
                        "\ubd84\ub9ac\uc124\uce58"
                    ]
                }
            }
        ],
        "\uc758\ub958\uad00\ub9ac\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc2a4\ud0c0\uc77c\ub7ec",
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                ]
            }
        ],
        "\uc5d0\uc5b4\ucee8": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc885\ub958",
                "options": [
                    "2IN1",
                    "\uc2a4\ud0e0\ub4dc",
                    "\ubcbd\uac78\uc774",
                    "\ucc9c\uc7a5\ud615",
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\ub0c9\ubc29\uba74\uc801",
                "dependsOn": "type",
                "optionsByValue": {
                    "2IN1": [
                        "18\ud3c9",
                        "24\ud3c9",
                        "34\ud3c9",
                        "40\ud3c9\ud615 \uc774\uc0c1"
                    ],
                    "\uc2a4\ud0e0\ub4dc": [
                        "18\ud3c9",
                        "24\ud3c9",
                        "34\ud3c9",
                        "40\ud3c9\ud615 \uc774\uc0c1"
                    ],
                    "\ubcbd\uac78\uc774": [
                        "6\ud3c9",
                        "7\ud3c9",
                        "9\ud3c9",
                        "11\ud3c9"
                    ],
                    "\ucc9c\uc7a5\ud615": [
                        "3\uc2e4",
                        "4\uc2e4",
                        "5\uc2e4",
                        "6\uc2e4"
                    ],
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825": [
                        "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                    ]
                }
            }
        ],
        "\uccad\uc18c\uae30": [
            {
                "mode": "multi",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ubb34\uc120\uccad\uc18c\uae30",
                    "\ub85c\ubd07\uccad\uc18c\uae30",
                    "\uc720\uc120\uccad\uc18c\uae30"
                ]
            }
        ],
        "\uc2dd\uae30\uc138\ucc99\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ube5d\ud2b8\uc778",
                    "\uce74\uc6b4\ud130\ud0d1",
                    "\ud504\ub9ac\uc2a4\ud0e0\ub529"
                ]
            }
        ],
        "\uc778\ub355\uc158": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ube4c\ud2b8\uc778 O",
                    "\ube4c\ud2b8\uc778 X"
                ]
            },
            {
                "mode": "single",
                "key": "burner",
                "label": "\ud654\uad6c\uc218",
                "options": [
                    "2\uad6c",
                    "3\uad6c",
                    "4\uad6c"
                ]
            }
        ],
        "\uc624\ube10 / \uc804\uc790\ub808\uc778\uc9c0": [
            {
                "mode": "multi",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ubcf5\ud569\uc624\ube10",
                    "\uc804\uc790\ub808\uc778\uc9c0"
                ]
            }
        ],
        "\uc815\uc218\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc5bc\uc74c\uc815\uc218\uae30",
                    "\ub0c9\uc628\uc815\uc218\uae30",
                    "\ub0c9\uc815\uc218\uae30",
                    "\uc628\uc815\uc218\uae30"
                ]
            }
        ],
        "\uacf5\uae30\uccad\uc815\uae30": [
            {
                "mode": "single",
                "key": "size",
                "label": "\uc0ac\uc6a9\uba74\uc801",
                "options": [
                    "10\ud3c9 \uc774\ud558",
                    "10\ud3c9\ub300",
                    "20\ud3c9\ub300",
                    "30\ud3c9\ub300 \uc774\uc0c1"
                ]
            }
        ]
    },
    "\uc0bc\uc131\uc804\uc790": {
        "TV": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "NEO QLED",
                    "OLED",
                    "MRGB"
                ]
            },
            {
                "mode": "single",
                "key": "install",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ubcbd\uac78\uc774",
                    "\uc2a4\ud0e0\ub4dc"
                ]
            },
            {
                "mode": "single",
                "key": "size",
                "label": "\uc778\uce58",
                "options": [
                    "43\uc778\uce58",
                    "50\uc778\uce58",
                    "55\uc778\uce58",
                    "65\uc778\uce58",
                    "75\uc778\uce58",
                    "85\uc778\uce58",
                    "100\uc778\uce58"
                ]
            }
        ],
        "\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c TV": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ub354 \ubb34\ube59\uc2a4\ud0c0\uc77c"
                ]
            },
            {
                "mode": "single",
                "key": "size",
                "label": "\uc778\uce58",
                "options": [
                    "27\uc778\uce58"
                ]
            }
        ],
        "\ub0c9\uc7a5\uace0": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc0c1\ub0c9\uc7a5",
                    "\ud0a4\uce5c\ud54f \ub9e5\uc2a4",
                    "\uc591\ubb38\ud615",
                    "1\ub3c4\uc5b4"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc0c1\ub0c9\uc7a5": [
                        "\ud328\ubc00\ub9ac\ud5c8\ube0c",
                        "\ud558\uc774\ube0c\ub9ac\ub4dc"
                    ],
                    "\ud0a4\uce5c\ud54f \ub9e5\uc2a4": [
                        "\ud558\uc774\ube0c\ub9ac\ub4dc"
                    ],
                    "\uc591\ubb38\ud615": [
                        "2\ub3c4\uc5b4"
                    ],
                    "1\ub3c4\uc5b4": [
                        "1\ub3c4\uc5b4"
                    ]
                }
            }
        ],
        "\uae40\uce58\ub0c9\uc7a5\uace0": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ub69c\uaed1\uc2dd",
                    "\uc2a4\ud0e0\ub4dc",
                    "1\ub3c4\uc5b4"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\ub69c\uaed1\uc2dd": [
                        "1\ub3c4\uc5b4",
                        "2\ub3c4\uc5b4"
                    ],
                    "\uc2a4\ud0e0\ub4dc": [
                        "\ud0a4\uce5c\ud54f 3\ub3c4\uc5b4",
                        "\ud0a4\uce5c\ud54f 4\ub3c4\uc5b4",
                        "\uc77c\ubc18 3\ub3c4\uc5b4",
                        "\uc77c\ubc18 4\ub3c4\uc5b4"
                    ],
                    "1\ub3c4\uc5b4": [
                        "1\ub3c4\uc5b4"
                    ]
                }
            }
        ],
        "\uc138\ud0c1\uae30/\uac74\uc870\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc6d0\ubc14\ub514",
                    "\ucf64\ubcf4",
                    "\ubd84\ub9ac\ud615(\uc138\ud0c1\uae30/\uac74\uc870\uae30)"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc6d0\ubc14\ub514": [
                        "\uc778\ud53c\ub2c8\ud2b8",
                        "AI"
                    ],
                    "\ucf64\ubcf4": [
                        "AI"
                    ],
                    "\ubd84\ub9ac\ud615": [
                        "25KG / 20KG",
                        "25KG / 22KG"
                    ]
                }
            }
        ],
        "\uc758\ub958\uad00\ub9ac\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc5d0\uc5b4\ub4dc\ub808\uc11c",
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                ]
            }
        ],
        "\uc5d0\uc5b4\ucee8": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc885\ub958",
                "options": [
                    "2IN1",
                    "\uc2a4\ud0e0\ub4dc",
                    "\ubcbd\uac78\uc774",
                    "\ucc9c\uc7a5\ud615",
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\ub0c9\ubc29\uba74\uc801",
                "dependsOn": "type",
                "optionsByValue": {
                    "2IN1": [
                        "18\ud3c9",
                        "24\ud3c9",
                        "34\ud3c9",
                        "40\ud3c9\ud615 \uc774\uc0c1"
                    ],
                    "\uc2a4\ud0e0\ub4dc": [
                        "18\ud3c9",
                        "24\ud3c9",
                        "34\ud3c9",
                        "40\ud3c9\ud615 \uc774\uc0c1"
                    ],
                    "\ubcbd\uac78\uc774": [
                        "6\ud3c9",
                        "7\ud3c9",
                        "9\ud3c9",
                        "11\ud3c9"
                    ],
                    "\ucc9c\uc7a5\ud615": [
                        "3\uc2e4",
                        "4\uc2e4",
                        "5\uc2e4",
                        "6\uc2e4"
                    ],
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825": [
                        "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                    ]
                }
            }
        ],
        "\uccad\uc18c\uae30": [
            {
                "mode": "multi",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ubb34\uc120\uccad\uc18c\uae30",
                    "\ub85c\ubd07\uccad\uc18c\uae30",
                    "\uc720\uc120\uccad\uc18c\uae30"
                ]
            }
        ],
        "\uc2dd\uae30\uc138\ucc99\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ube4c\ud2b8\uc778",
                    "\uce74\uc6b4\ud130\ud0d1",
                    "\ud504\ub9ac\uc2a4\ud0e0\ub529"
                ]
            }
        ],
        "\uc778\ub355\uc158": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ube4c\ud2b8\uc778 O",
                    "\ube4c\ud2b8\uc778 X"
                ]
            },
            {
                "mode": "single",
                "key": "burner",
                "label": "\ud654\uad6c\uc218",
                "options": [
                    "2\uad6c",
                    "3\uad6c",
                    "4\uad6c"
                ]
            }
        ],
        "\uc624\ube10 / \uc804\uc790\ub808\uc778\uc9c0": [
            {
                "mode": "multi",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc624\ube10",
                    "\uc804\uc790\ub808\uc778\uc9c0"
                ]
            }
        ],
        "\uc815\uc218\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc5bc\uc74c\uc815\uc218\uae30",
                    "\ub0c9\uc628\uc815\uc218\uae30",
                    "\ub0c9\uc815\uc218\uae30",
                    "\uc628\uc815\uc218\uae30"
                ]
            }
        ],
        "\uacf5\uae30\uccad\uc815\uae30": [
            {
                "mode": "single",
                "key": "size",
                "label": "\uc0ac\uc6a9\uba74\uc801",
                "options": [
                    "10\ud3c9 \uc774\ud558",
                    "10\ud3c9\ub300",
                    "20\ud3c9\ub300",
                    "30\ud3c9\ub300 \uc774\uc0c1"
                ]
            }
        ]
    },
    "\ube44\uad50\uacac\uc801": {
        "TV": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "QNED",
                    "OLED",
                    "MRGB"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\uc778\uce58",
                "dependsOn": "type",
                "optionsByValue": {
                    "QNED": [
                        "32\uc778\uce58",
                        "43\uc778\uce58",
                        "55\uc778\uce58",
                        "65\uc778\uce58",
                        "75\uc778\uce58",
                        "85\uc778\uce58",
                        "100\uc778\uce58"
                    ],
                    "OLED": [
                        "42\uc778\uce58",
                        "48\uc778\uce58",
                        "55\uc778\uce58",
                        "65\uc778\uce58",
                        "77\uc778\uce58",
                        "83\uc778\uce58",
                        "98\uc778\uce58"
                    ],
                    "MRGB": [
                        "32\uc778\uce58",
                        "43\uc778\uce58",
                        "55\uc778\uce58",
                        "65\uc778\uce58",
                        "75\uc778\uce58",
                        "85\uc778\uce58",
                        "100\uc778\uce58"
                    ]
                }
            }
        ],
        "\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c TV": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8",
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8 GO"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\uc778\uce58",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8": [
                        "27\uc778\uce58"
                    ],
                    "\uc2a4\ud0e0\ubc14\uc774\ubbf8 GO": [
                        "27\uc778\uce58"
                    ]
                }
            }
        ],
        "\ub0c9\uc7a5\uace0": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc0c1\ub0c9\uc7a5",
                    "\ud54f\uc564\ub9e5\uc2a4",
                    "\uc591\ubb38\ud615",
                    "\ucee8\ubc84\ud130\ube14"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc0c1\ub0c9\uc7a5": [
                        "\uc5bc\uc74c\uc815\uc218\uae30 \ub0c9\uc7a5\uace0"
                    ],
                    "\ud54f\uc564\ub9e5\uc2a4": [
                        "\ub178\ud06c\uc628",
                        "\uc77c\ubc18"
                    ],
                    "\uc591\ubb38\ud615": [
                        "2\ub3c4\uc5b4"
                    ],
                    "\ucee8\ubc84\ud130\ube14": [
                        "1\ub3c4\uc5b4"
                    ]
                }
            }
        ],
        "\uae40\uce58\ub0c9\uc7a5\uace0": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ub69c\uaed1\uc2dd",
                    "\uc2a4\ud0e0\ub4dc",
                    "\ucee8\ubc84\ud130\ube14"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\ub69c\uaed1\uc2dd": [
                        "1\ub3c4\uc5b4",
                        "2\ub3c4\uc5b4"
                    ],
                    "\uc2a4\ud0e0\ub4dc": [
                        "\ud54f\uc564\ub9e5\uc2a4 3\ub3c4\uc5b4",
                        "\ud54f\uc564\ub9e5\uc2a4 4\ub3c4\uc5b4",
                        "\uc77c\ubc18 3\ub3c4\uc5b4",
                        "\uc77c\ubc18 4\ub3c4\uc5b4"
                    ],
                    "\ucee8\ubc84\ud130\ube14": [
                        "1\ub3c4\uc5b4"
                    ]
                }
            }
        ],
        "\uc138\ud0c1\uae30/\uac74\uc870\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc6cc\uc2dc\ud0c0\uc6cc",
                    "\ucf64\ubcf4",
                    "\ubd84\ub9ac\ud615(\uc138\ud0c1\uae30/\uac74\uc870\uae30)"
                ]
            },
            {
                "mode": "singleBy",
                "key": "detail",
                "label": "\uad6c\ubd84",
                "dependsOn": "type",
                "optionsByValue": {
                    "\uc6cc\uc2dc\ud0c0\uc6cc": [
                        "\uc635\uc158\ud615",
                        "AI"
                    ],
                    "\ucf64\ubcf4": [
                        "AI"
                    ],
                    "\ubd84\ub9ac\ud615": [
                        "\ubcd1\ub82c\uc124\uce58",
                        "\uc9c1\ub82c\uc124\uce58",
                        "\ubd84\ub9ac\uc124\uce58"
                    ]
                }
            }
        ],
        "\uc758\ub958\uad00\ub9ac\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc2a4\ud0c0\uc77c\ub7ec",
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                ]
            }
        ],
        "\uc5d0\uc5b4\ucee8": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc885\ub958",
                "options": [
                    "2IN1",
                    "\uc2a4\ud0e0\ub4dc",
                    "\ubcbd\uac78\uc774",
                    "\ucc9c\uc7a5\ud615",
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                ]
            },
            {
                "mode": "singleBy",
                "key": "size",
                "label": "\ub0c9\ubc29\uba74\uc801",
                "dependsOn": "type",
                "optionsByValue": {
                    "2IN1": [
                        "18\ud3c9",
                        "24\ud3c9",
                        "34\ud3c9",
                        "40\ud3c9\ud615 \uc774\uc0c1"
                    ],
                    "\uc2a4\ud0e0\ub4dc": [
                        "18\ud3c9",
                        "24\ud3c9",
                        "34\ud3c9",
                        "40\ud3c9\ud615 \uc774\uc0c1"
                    ],
                    "\ubcbd\uac78\uc774": [
                        "6\ud3c9",
                        "7\ud3c9",
                        "9\ud3c9",
                        "11\ud3c9"
                    ],
                    "\ucc9c\uc7a5\ud615": [
                        "3\uc2e4",
                        "4\uc2e4",
                        "5\uc2e4",
                        "6\uc2e4"
                    ],
                    "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825": [
                        "\uc0c1\uc138 \uc635\uc158 \ubbf8\uc785\ub825"
                    ]
                }
            }
        ],
        "\uccad\uc18c\uae30": [
            {
                "mode": "multi",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ubb34\uc120\uccad\uc18c\uae30",
                    "\ub85c\ubd07\uccad\uc18c\uae30",
                    "\uc720\uc120\uccad\uc18c\uae30"
                ]
            }
        ],
        "\uc2dd\uae30\uc138\ucc99\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ube5d\ud2b8\uc778",
                    "\uce74\uc6b4\ud130\ud0d1",
                    "\ud504\ub9ac\uc2a4\ud0e0\ub529"
                ]
            }
        ],
        "\uc778\ub355\uc158": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc124\uce58\ud615\ud0dc",
                "options": [
                    "\ube4c\ud2b8\uc778 O",
                    "\ube4c\ud2b8\uc778 X"
                ]
            },
            {
                "mode": "single",
                "key": "burner",
                "label": "\ud654\uad6c\uc218",
                "options": [
                    "2\uad6c",
                    "3\uad6c",
                    "4\uad6c"
                ]
            }
        ],
        "\uc624\ube10 / \uc804\uc790\ub808\uc778\uc9c0": [
            {
                "mode": "multi",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\ubcf5\ud569\uc624\ube10",
                    "\uc804\uc790\ub808\uc778\uc9c0"
                ]
            }
        ],
        "\uc815\uc218\uae30": [
            {
                "mode": "single",
                "key": "type",
                "label": "\uc720\ud615",
                "options": [
                    "\uc5bc\uc74c\uc815\uc218\uae30",
                    "\ub0c9\uc628\uc815\uc218\uae30",
                    "\ub0c9\uc815\uc218\uae30",
                    "\uc628\uc815\uc218\uae30"
                ]
            }
        ],
        "\uacf5\uae30\uccad\uc815\uae30": [
            {
                "mode": "single",
                "key": "size",
                "label": "\uc0ac\uc6a9\uba74\uc801",
                "options": [
                    "10\ud3c9 \uc774\ud558",
                    "10\ud3c9\ub300",
                    "20\ud3c9\ub300",
                    "30\ud3c9\ub300 \uc774\uc0c1"
                ]
            }
        ]
    }
};

  const aiSituations = ["혼수/웨딩", "신축 입주", "이사", "교체", "사업장/B2B"];
  const familyOptions = ["1인", "2인", "3~4인", "5인 이상", "아이 있음", "반려동물 있음"];
  const priorityOptions = ["가격", "설치 일정", "배송", "카드 혜택", "공간 맞춤", "프리미엄"];

  const steps = [
    { key: "quoteType", render: renderQuoteType, validate: validateQuoteType },
    { key: "personal", render: renderPersonal, validate: validatePersonal },
    { key: "purpose", render: renderPurpose, validate: validatePurpose },
    { key: "brand", render: renderBrand, validate: validateBrand },
    { key: "products", render: renderProducts, validate: validateProducts, show: isWithoutQuote },
    { key: "options", render: renderOptions, validate: validateOptions, show: isWithoutQuote },
    { key: "ai", render: renderAiContext, validate: validateAiContext, show: shouldUseAiRecommendation },
    { key: "quoteInfo", render: renderQuoteInfo, validate: validateQuoteInfo },
  ];

  installWizard();

  function installWizard() {
    const wizard = document.createElement("div");
    wizard.className = "customer-wizard quote-wizard";
    form.prepend(wizard);
    form.dataset.wizardReady = "true";
    form._wizardSubmitAllowed = false;

    bindNativeFields();
    hideNativeFields();
    render();
    syncAllFields();
  }

  function ensureHiddenField(name) {
    let input = field(name);
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.prepend(input);
    }
    return input;
  }

  function bindNativeFields() {
    fields.phone?.addEventListener("input", () => {
      fields.phone.value = formatPhoneInput(fields.phone.value);
    });

    form.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter" || event.target?.tagName === "TEXTAREA") return;
        event.preventDefault();
      },
      true
    );

    form.addEventListener(
      "submit",
      (event) => {
        syncAllFields();
        if (!isFinalVisibleStep()) {
          event.preventDefault();
          move(1);
          return;
        }
        if (!validateCurrentStep()) {
          event.preventDefault();
          return;
        }
        form._wizardSubmitAllowed = true;
      },
      true
    );
  }

  function hideNativeFields() {
    [
      fields.image?.closest(".upload-box"),
      fields.customer?.closest("label"),
      fields.phone?.closest("label"),
      fields.purpose?.closest("label"),
      fields.brand?.closest("label"),
      fields.price?.closest("label"),
      fields.region?.closest("label"),
      fields.installDate?.closest("label"),
      fields.memo?.closest("label"),
    ]
      .filter(Boolean)
      .forEach((element) => {
        element.classList.add("wizard-native-hidden");
      });
  }

  function visibleSteps() {
    return steps.filter((step) => !step.show || step.show());
  }

  function currentStep() {
    const list = visibleSteps();
    state.stepIndex = Math.min(state.stepIndex, list.length - 1);
    return list[state.stepIndex];
  }

  function isFinalVisibleStep() {
    return state.stepIndex === visibleSteps().length - 1;
  }

  function render() {
    const step = currentStep();
    const list = visibleSteps();
    const wizard = form.querySelector(".customer-wizard");
    const busyAttr = state.recommending ? "disabled aria-disabled=\"true\"" : "";
    wizard.innerHTML = `
      <div class="wizard-progress" style="--wizard-step-count:${list.length}" aria-label="견적 등록 진행 단계">
        ${list.map((_, index) => `<span class="${index <= state.stepIndex ? "is-active" : ""}"></span>`).join("")}
      </div>
      <div class="wizard-step-label">Step ${state.stepIndex + 1}</div>
      <div class="wizard-step" data-step="${step.key}">${step.render()}</div>
      <div class="wizard-actions">
        ${state.stepIndex > 0 ? '<button type="button" class="wizard-back">이전</button>' : ""}
        <button type="${isFinalVisibleStep() ? "submit" : "button"}" class="wizard-next primary-btn" ${busyAttr}>${state.recommending ? "AI 추천 중" : isFinalVisibleStep() ? "견적 요청 등록" : "다음"}</button>
      </div>
    `;

    wizard.querySelector(".wizard-back")?.addEventListener("click", () => move(-1));
    wizard.querySelector(".wizard-next")?.addEventListener("click", (event) => {
      if (!isFinalVisibleStep()) {
        event.preventDefault();
        move(1);
      }
    });

    bindStepEvents(wizard, step.key);
    updateNativeRequirement();
    updatePreview();
  }

  function move(delta) {
    if (delta > 0 && !validateCurrentStep()) return;
    state.stepIndex = Math.max(0, Math.min(visibleSteps().length - 1, state.stepIndex + delta));
    render();
  }

  function validateCurrentStep() {
    clearMessage();
    syncAllFields();
    const step = currentStep();
    const ok = step.validate();
    updatePreview();
    return ok;
  }

  function setMessage(text) {
    if (!message) return;
    message.textContent = text;
    message.dataset.type = text ? "error" : "";
  }

  function clearMessage() {
    setMessage("");
  }

  function renderQuoteType() {
    return `
      <h3>견적서가 있는지 먼저 선택해주세요.</h3>
      <p>견적서 유무에 따라 필요한 입력 단계가 달라집니다.</p>
      <div class="wizard-choice-grid wizard-choice-grid-two">
        ${quoteTypes.map((item) => choiceCard(item, "wizardQuoteTypeProxy", fields.quoteType.value)).join("")}
      </div>
    `;
  }

  function renderPersonal() {
    return `
      <h3>고객님 정보를 입력해주세요.</h3>
      <p>내 견적 확인과 알림 안내에 필요한 최소 정보만 받습니다.</p>
      <div class="wizard-field-grid">
        <label>고객님 성함<input type="text" data-wizard-field="customer" value="${escapeHtml(fields.customer.value)}" placeholder="예: 홍길동" /></label>
        <label>연락처<input type="text" data-wizard-field="phone" value="${escapeHtml(fields.phone.value)}" placeholder="010-0000-0000" /></label>
      </div>
    `;
  }

  function renderPurpose() {
    return `
      <h3>구매 목적을 선택해주세요.</h3>
      <p>목적에 따라 비교해야 할 혜택과 일정 조건이 달라집니다.</p>
      <div class="wizard-choice-grid">${purposeOptions.map((item) => choiceCard(item, "wizardPurposeProxy", fields.purpose.value)).join("")}</div>
    `;
  }

  function renderBrand() {
    return `
      <h3>브랜드를 선택해주세요.</h3>
      <p>견적서가 없는 경우에도 LG전자, 삼성전자, 비교견적 모두 카탈로그 후보 모델 기준으로 AI가 간이 견적서를 정리합니다.</p>
      <div class="wizard-choice-grid wizard-choice-grid-three">${brandOptions.map((item) => choiceCard(item, "wizardBrandProxy", fields.brand.value)).join("")}</div>
    `;
  }

  function renderProducts() {
    return `
      <h3>구매 예정 품목을 모두 선택해주세요.</h3>
      <p>견적서가 없는 고객님은 선택한 품목 기준으로 판매자에게 요청이 전달됩니다.</p>
      <div class="wizard-product-list">
        ${productOptions
          .map((product) => {
            const checked = state.selectedProducts.includes(product.value);
            return `
              <button type="button" class="wizard-product-card ${checked ? "is-selected" : ""}" data-product="${escapeHtml(product.value)}">
                <span class="wizard-checkbox" aria-hidden="true">${checked ? "✓" : ""}</span>
                <span class="product-thumb product-thumb-${escapeHtml(product.thumb)}" aria-hidden="true"><span>${escapeHtml(product.icon)}</span></span>
                <strong>${escapeHtml(product.title)}</strong>
              </button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderOptions() {
    return `
      <h3>선택한 품목의 옵션을 확인해주세요.</h3>
      <p>옵션을 모르시면 해당 품목은 옵션 미선택 상태로 접수할 수 있습니다.</p>
      <div class="wizard-option-list">
        ${state.selectedProducts
          .map((product) => {
            const summary = productOptionSummary(product);
            return `
              <div class="wizard-option-row">
                <div>
                  <strong>${escapeHtml(product)}</strong>
                  <span>${escapeHtml(summary || "옵션 미선택")}</span>
                </div>
                <button type="button" class="secondary-btn wizard-open-option" data-product="${escapeHtml(product)}">옵션 선택</button>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderAiContext() {
    return `
      <h3>AI 추천에 필요한 상황을 알려주세요.</h3>
      <p>선택한 브랜드와 품목에 맞춰 후보 모델을 정리합니다. 비교견적은 LG전자와 삼성전자 후보를 함께 검토합니다.</p>
      <div class="wizard-choice-block">
        <h4>구매 목적</h4>
        <div class="wizard-chip-grid">${aiSituations.map((item) => chip(item, "ai-situation", state.aiContext.situation === item)).join("")}</div>
      </div>
      <div class="wizard-choice-block">
        <h4>가족 구성</h4>
        <div class="wizard-chip-grid">${familyOptions.map((item) => chip(item, "ai-family", state.aiContext.family.includes(item))).join("")}</div>
      </div>
      <div class="wizard-choice-block">
        <h4>예산</h4>
        <div class="wizard-chip-grid">
          ${["예산 확정", "예산 미정"].map((item) => chip(item, "ai-budget-status", state.aiContext.budgetStatus === item)).join("")}
        </div>
        <input class="wizard-inline-input" type="text" data-ai-budget-range value="${escapeHtml(state.aiContext.budgetRange)}" placeholder="예: 1,000만원대, 2,000만원 이하" />
      </div>
      <div class="wizard-choice-block">
        <h4>중요한 조건</h4>
        <div class="wizard-chip-grid">${priorityOptions.map((item) => chip(item, "ai-priority", state.aiContext.priorities.includes(item))).join("")}</div>
      </div>
      <label class="wizard-wide-label">추가 상황
        <textarea data-ai-note rows="4" placeholder="예: 34평 신축 입주, 주방은 핏앤맥스 선호, 11월 설치 예정">${escapeHtml(state.aiContext.note)}</textarea>
      </label>
    `;
  }

  function renderQuoteInfo() {
    const showUpload = isWithQuote();
    const showAiNotice = shouldUseAiRecommendation();
    return `
      <h3>${showUpload ? "견적서 이미지와 설치 정보를 확인해주세요." : "설치 정보와 요청사항을 확인해주세요."}</h3>
      <p>${showAiNotice ? "AI가 고객님 상황에 맞는 추천 모델과 네이버 최저가 일반 구매가를 함께 정리합니다." : "판매자가 확인할 설치 일정과 요청사항을 입력해주세요."}</p>
      ${showUpload ? renderUploadBox() : ""}
      ${showAiNotice ? renderRecommendationPanel() : ""}
      <div class="wizard-field-grid">
        <label>설치 지역<input type="text" data-wizard-field="region" value="${escapeHtml(fields.region.value)}" placeholder="서울 송파구" /></label>
        <label>설치 예정일<input type="text" data-wizard-field="installDate" value="${escapeHtml(fields.installDate.value)}" placeholder="예: 8월 말, 2026년 8월 15일" /></label>
      </div>
      <label class="wizard-wide-label">추가 요청사항
        <textarea data-wizard-field="memo" rows="4" placeholder="모델명을 입력해주세요.">${escapeHtml(fields.memo.value)}</textarea>
      </label>
    `;
  }

  function renderUploadBox() {
    const count = fields.image?.files?.length || 0;
    return `
      <label class="upload-box wizard-upload-proxy" for="quoteImage">
        <span class="upload-icon">+</span>
        <strong>견적서 이미지 선택</strong>
        <small>견적서가 있는 경우 최소 1장, 최대 4장까지 등록해야 합니다. 현재 ${count}장 선택됨</small>
      </label>
    `;
  }

  function renderRecommendationPanel() {
    const loading = state.recommending ? "<p>AI가 모델 후보를 정리하고 있습니다.</p>" : "";
    const body = state.recommendationGroups.length
      ? `${state.recommendationGroups
            .map(
              (group) => `
                <div class="ai-recommendation-group">
                  <strong>[${escapeHtml(group.product)}]</strong>
                  <span>${escapeHtml(group.optionSummary || "상세 옵션 미입력")}</span>
                  <ul>${group.models.map((model) => `<li>${renderModelWithPrice(model)}</li>`).join("")}</ul>
                </div>
              `
            )
            .join("")}
          ${renderRecommendationTotal(state.recommendationGroups)}`
      : "<p>마지막 단계에서 AI 추천 모델이 자동으로 정리됩니다.</p>";
    return `<div class="ai-recommendation-panel"><b>AI 추천 간이 견적서</b>${loading || body}</div>`;
  }

  function bindStepEvents(root, key) {
    root.querySelectorAll("input[data-choice-name]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.name === "wizardQuoteTypeProxy") {
          fields.quoteType.value = input.value;
          if (input.value === "with_quote") {
            state.selectedProducts = [];
            state.productOptions = {};
            clearAiRecommendation();
          }
        }
        if (input.name === "wizardPurposeProxy") fields.purpose.value = input.value;
        if (input.name === "wizardBrandProxy") {
          fields.brand.value = input.value;
          clearAiRecommendation();
        }
        syncAllFields();
        render();
      });
    });

    root.querySelectorAll("[data-wizard-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const target = field(input.dataset.wizardField);
        if (!target) return;
        target.value = input.dataset.wizardField === "phone" ? formatPhoneInput(input.value) : input.value;
        if (input.dataset.wizardField === "phone") input.value = target.value;
        updatePreview();
      });
    });

    root.querySelectorAll(".wizard-product-card").forEach((button) => {
      button.addEventListener("click", () => {
        const product = button.dataset.product;
        if (state.selectedProducts.includes(product)) {
          state.selectedProducts = state.selectedProducts.filter((item) => item !== product);
          deleteOptionState(product);
        } else {
          state.selectedProducts.push(product);
        }
        clearAiRecommendation();
        syncAllFields();
        render();
      });
    });

    root.querySelectorAll(".wizard-open-option").forEach((button) => {
      button.addEventListener("click", () => openOptionModal(button.dataset.product));
    });

    root.querySelectorAll("[data-ai-situation]").forEach((button) => {
      button.addEventListener("click", () => {
        state.aiContext.situation = button.dataset.aiSituation;
        syncAllFields();
        render();
      });
    });

    root.querySelectorAll("[data-ai-family]").forEach((button) => {
      button.addEventListener("click", () => toggleArray(state.aiContext.family, button.dataset.aiFamily));
    });

    root.querySelectorAll("[data-ai-budget-status]").forEach((button) => {
      button.addEventListener("click", () => {
        state.aiContext.budgetStatus = button.dataset.aiBudgetStatus;
        syncAllFields();
        render();
      });
    });

    root.querySelector("[data-ai-budget-range]")?.addEventListener("input", (event) => {
      state.aiContext.budgetRange = event.target.value;
      syncAllFields();
    });

    root.querySelectorAll("[data-ai-priority]").forEach((button) => {
      button.addEventListener("click", () => toggleArray(state.aiContext.priorities, button.dataset.aiPriority));
    });

    root.querySelector("[data-ai-note]")?.addEventListener("input", (event) => {
      state.aiContext.note = event.target.value;
      syncAllFields();
    });

    if (key === "quoteInfo" && shouldUseAiRecommendation() && !state.recommending && !state.recommendationGroups.length) {
      runAiRecommendation();
    }
  }

  function toggleArray(array, value) {
    const index = array.indexOf(value);
    if (index >= 0) array.splice(index, 1);
    else array.push(value);
    syncAllFields();
    render();
  }

  function choiceCard(item, name, currentValue) {
    const checked = currentValue === item.value;
    return `
      <label class="wizard-choice-card ${checked ? "is-selected" : ""} ${item.badge ? "has-badge" : ""}">
        <input type="radio" name="${name}" value="${escapeHtml(item.value)}" ${checked ? "checked" : ""} data-choice-name="${name}" />
        <span class="wizard-radio" aria-hidden="true">${checked ? "✓" : ""}</span>
        <span class="wizard-choice-copy">
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.text || "")}</small>
        </span>
        ${item.badge ? `<em>${escapeHtml(item.badge)}</em>` : ""}
      </label>
    `;
  }

  function chip(label, name, selected) {
    const attr = `data-${name}="${escapeHtml(label)}"`;
    return `<button type="button" class="wizard-chip ${selected ? "is-selected" : ""}" ${attr}>${escapeHtml(label)}</button>`;
  }

  function openOptionModal(product) {
    const productKey = normalizeProductKey(product);
    const schema = optionSchemaFor(product);
    const draft = normalizeOptionDraft(optionStateFor(product));
    const modal = document.createElement("div");
    modal.className = "option-modal is-open";
    modal.innerHTML = `
      <div class="option-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(product)} 옵션 선택">
        <button type="button" class="option-close" aria-label="닫기">×</button>
        <h3>${escapeHtml(product)}</h3>
        <div class="option-section-wrap"></div>
        <div class="option-actions">
          <button type="button" class="secondary-btn option-clear">선택 초기화</button>
          <button type="button" class="primary-btn option-save">확인</button>
        </div>
      </div>
    `;
    document.body.append(modal);
    document.body.classList.add("modal-open");

    const wrap = modal.querySelector(".option-section-wrap");
    const close = () => {
      modal.remove();
      document.body.classList.remove("modal-open");
    };
    const rerender = () => {
      pruneOptionDraft(schema, draft);
      const visibleSections = schema
        .map((section) => renderOptionSection(product, section, draft))
        .filter(Boolean)
        .join("");
      wrap.innerHTML = visibleSections || `<p class="option-empty">선택할 수 있는 옵션이 없습니다.</p>`;
      wrap.querySelectorAll(".option-row input").forEach((input) => {
        input.addEventListener("change", () => {
          const key = input.dataset.optionKey;
          const section = schema.find((item) => item.key === key);
          if (!section) return;
          if (isMultiOption(section)) {
            draft[key] = [...wrap.querySelectorAll(`[data-option-key="${cssEscape(key)}"]:checked`)].map((item) => item.value);
          } else {
            draft[key] = input.value;
          }
          clearDependentOptionValues(schema, draft, key);
          clearAiRecommendation();
          rerender();
        });
      });
    };

    modal.querySelector(".option-close").addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector(".option-clear").addEventListener("click", () => {
      deleteOptionState(product);
      clearAiRecommendation();
      syncAllFields();
      close();
      render();
    });
    modal.querySelector(".option-save").addEventListener("click", () => {
      pruneOptionDraft(schema, draft);
      writeOptionState(product, cleanOptionDraft(schema, draft));
      clearAiRecommendation();
      syncAllFields();
      close();
      render();
    });
    rerender();
  }

  function normalizeOptionDraft(source) {
    const draft = {};
    Object.entries(source || {}).forEach(([key, value]) => {
      draft[key] = Array.isArray(value) ? [...value] : value;
    });
    return draft;
  }

  function selectedBrandKey() {
    const raw = String(fields.brand.value || "");
    if (raw.includes("\uc0bc\uc131")) return "\uc0bc\uc131\uc804\uc790";
    if (raw.includes("\ube44\uad50")) return "\ube44\uad50\uacac\uc801";
    return "LG\uc804\uc790";
  }

  function normalizeProductKey(product) {
    const raw = String(product || "").trim().replace(/\s+/g, " ");
    const compact = raw.replace(/\s+/g, "").replace(/\+/g, "/");
    if (!compact) return raw;
    if (/^TV$/i.test(compact) || compact.includes("티비")) return "TV";
    if (compact.includes("\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c")) return "\ub77c\uc774\ud504\uc2a4\ud0c0\uc77c TV";
    if (compact.includes("\uae40\uce58\ub0c9\uc7a5\uace0")) return "\uae40\uce58\ub0c9\uc7a5\uace0";
    if (compact.includes("\ub0c9\uc7a5\uace0")) return "\ub0c9\uc7a5\uace0";
    if (compact.includes("\uc138\ud0c1") || compact.includes("\uac74\uc870")) return "\uc138\ud0c1\uae30/\uac74\uc870\uae30";
    if (compact.includes("\uc758\ub958")) return "\uc758\ub958\uad00\ub9ac\uae30";
    if (compact.includes("\uc5d0\uc5b4\ucee8")) return "\uc5d0\uc5b4\ucee8";
    if (compact.includes("\uccad\uc18c\uae30")) return "\uccad\uc18c\uae30";
    if (compact.includes("\uc2dd\uae30\uc138\ucc99")) return "\uc2dd\uae30\uc138\ucc99\uae30";
    if (compact.includes("\uacf5\uae30\uccad\uc815")) return "\uacf5\uae30\uccad\uc815\uae30";
    if (compact.includes("\uc815\uc218\uae30")) return "\uc815\uc218\uae30";
    if (compact.includes("\uc778\ub355\uc158") || compact.includes("\uc804\uae30\ub808\uc778\uc9c0")) return "\uc778\ub355\uc158/\uc804\uae30\ub808\uc778\uc9c0";
    if (compact.includes("\uc624\ube10") || compact.includes("\uc804\uc790\ub808\uc778\uc9c0")) return "\uc624\ube10 / \uc804\uc790\ub808\uc778\uc9c0";
    return raw;
  }

  function optionLookupAliases(product) {
    const productKey = normalizeProductKey(product);
    const manualAliases = {
      "라이프스타일 TV": ["라이프스타일TV"],
      "세탁기/건조기": ["세탁기+건조기", "세탁기 / 건조기", "세탁기건조기"],
      "인덕션/전기레인지": ["인덕션", "전기레인지", "인덕션 / 전기레인지"],
      "오븐 / 전자레인지": ["오븐/전자레인지", "오븐", "전자레인지"],
    };
    return [...new Set([
      productKey,
      product,
      productKey.replace(/\s*\/\s*/g, "/"),
      productKey.replace(/\//g, " / "),
      ...(manualAliases[productKey] || []),
    ].filter(Boolean))];
  }

  function optionStateFor(product) {
    return optionLookupAliases(product).reduce((found, key) => found || state.productOptions[key], null) || {};
  }

  function writeOptionState(product, value) {
    deleteOptionState(product);
    state.productOptions[normalizeProductKey(product)] = value;
  }

  function deleteOptionState(product) {
    optionLookupAliases(product).forEach((key) => {
      delete state.productOptions[key];
    });
  }

  function optionSchemaFor(product) {
    const brandKey = selectedBrandKey();
    let schema = [];
    for (const key of optionLookupAliases(product)) {
      schema = brandOptionSchema[brandKey]?.[key] || brandOptionSchema["LG\uc804\uc790"]?.[key] || [];
      if (schema.length) break;
    }
    if (schema.length) return schema.map(cloneOptionSection);
    return [
      {
        mode: "single",
        key: "detail",
        label: "\uc0c1\uc138 \uc635\uc158",
        options: [unknownOption]
      }
    ];
  }

  function cloneOptionSection(section) {
    const cloned = { ...section };
    if (Array.isArray(section.options)) cloned.options = [...section.options];
    if (Array.isArray(section.values)) cloned.values = [...section.values];
    const sourceByValue = section.optionsByValue || section.valuesByParent;
    if (sourceByValue) {
      cloned.optionsByValue = {};
      Object.entries(sourceByValue).forEach(([key, values]) => {
        cloned.optionsByValue[key] = Array.isArray(values) ? [...values] : [];
      });
    }
    return cloned;
  }

  function isMultiOption(section) {
    return section.mode === "multi" || section.mode === "multiBy" || section.type === "multi";
  }

  function optionParentKey(section) {
    return section.dependsOn || section.parent || "";
  }

  function optionSectionLabel(section) {
    return section.label || section.title || "";
  }

  function sectionValues(section, draft) {
    if (Array.isArray(section.options)) return [...new Set(section.options)];
    if (Array.isArray(section.values)) return [...new Set(section.values)];
    const parentKey = optionParentKey(section);
    const valuesByParent = section.optionsByValue || section.valuesByParent;
    if (!parentKey || !valuesByParent) return [];
    const parentValue = draft[parentKey];
    const parents = Array.isArray(parentValue) ? parentValue : [parentValue].filter(Boolean);
    const values = parents.flatMap((item) => valuesByParent[item] || []);
    return [...new Set(values)];
  }

  function clearDependentOptionValues(schema, draft, changedKey) {
    const changedKeys = new Set([changedKey]);
    let changed = true;
    while (changed) {
      changed = false;
      schema.forEach((section) => {
        const parentKey = optionParentKey(section);
        if (!parentKey || !changedKeys.has(parentKey) || !Object.prototype.hasOwnProperty.call(draft, section.key)) return;
        delete draft[section.key];
        changedKeys.add(section.key);
        changed = true;
      });
    }
  }

  function pruneOptionDraft(schema, draft) {
    let changed = true;
    while (changed) {
      changed = false;
      schema.forEach((section) => {
        const values = sectionValues(section, draft);
        if (!values.length && optionParentKey(section)) {
          if (Object.prototype.hasOwnProperty.call(draft, section.key)) {
            delete draft[section.key];
            changed = true;
          }
          return;
        }
        if (isMultiOption(section)) {
          const current = Array.isArray(draft[section.key]) ? draft[section.key] : [];
          const next = current.filter((item) => values.includes(item));
          if (next.length !== current.length) {
            if (next.length) draft[section.key] = next;
            else delete draft[section.key];
            changed = true;
          }
          return;
        }
        if (draft[section.key] && !values.includes(draft[section.key])) {
          delete draft[section.key];
          changed = true;
        }
      });
    }
  }

  function cleanOptionDraft(schema, draft) {
    const next = {};
    schema.forEach((section) => {
      const values = sectionValues(section, draft);
      if (!values.length) return;
      if (isMultiOption(section)) {
        const selected = Array.isArray(draft[section.key]) ? draft[section.key].filter((item) => values.includes(item)) : [];
        if (selected.length) next[section.key] = selected;
        return;
      }
      if (draft[section.key] && values.includes(draft[section.key])) next[section.key] = draft[section.key];
    });
    return next;
  }

  function renderOptionSection(product, section, draft) {
    const sectionValuesList = sectionValues(section, draft);
    if (!sectionValuesList.length) return "";
    const selectedValues = Array.isArray(draft[section.key]) ? draft[section.key] : [draft[section.key]].filter(Boolean);
    const inputType = isMultiOption(section) ? "checkbox" : "radio";
    const inputName = `option-${product}-${section.key}`;
    return `
      <section class="option-section">
        <h4>${escapeHtml(optionSectionLabel(section))}</h4>
        ${sectionValuesList
          .map((value) => {
            const checked = selectedValues.includes(value);
            return `
              <label class="option-row">
                <span>${escapeHtml(value)}</span>
                <input type="${inputType}" data-option-key="${escapeHtml(section.key)}" name="${escapeHtml(inputName)}" value="${escapeHtml(value)}" ${checked ? "checked" : ""} />
                <b aria-hidden="true">${checked ? "✓" : ""}</b>
              </label>
            `;
          })
          .join("")}
      </section>
    `;
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  
function validateQuoteType() {
    if (fields.quoteType.value) return true;
    setMessage("견적서 유무를 선택해주세요.");
    return false;
  }

  function validatePersonal() {
    if (!fields.customer.value.trim()) {
      setMessage("고객님 성함을 입력해주세요.");
      return false;
    }
    if (onlyDigits(fields.phone.value).length < 9) {
      setMessage("연락처를 정확히 입력해주세요.");
      return false;
    }
    return true;
  }

  function validatePurpose() {
    if (fields.purpose.value) return true;
    setMessage("구매 목적을 선택해주세요.");
    return false;
  }

  function validateBrand() {
    if (fields.brand.value) return true;
    setMessage("브랜드를 선택해주세요.");
    return false;
  }

  function validateProducts() {
    if (state.selectedProducts.length) return true;
    setMessage("견적서가 없는 경우 구매 예정 품목을 선택해주세요.");
    return false;
  }

  function validateOptions() {
    return true;
  }

  function validateAiContext() {
    if (!shouldUseAiRecommendation()) return true;
    if (!state.aiContext.situation) {
      setMessage("AI 추천을 위해 구매 목적을 선택해주세요.");
      return false;
    }
    if (!state.aiContext.family.length) {
      setMessage("AI 추천을 위해 가족 구성을 선택해주세요.");
      return false;
    }
    if (!state.aiContext.budgetStatus) {
      setMessage("AI 추천을 위해 예산 여부를 선택해주세요.");
      return false;
    }
    return true;
  }

  function validateQuoteInfo() {
    if (state.recommending) {
      setMessage("AI가 추천 모델을 찾고 있습니다. 잠시만 기다려주세요.");
      return false;
    }
    if (shouldUseAiRecommendation() && !state.recommendationGroups.length) {
      setMessage("AI 추천 모델이 아직 정리되지 않았습니다. 잠시 후 다시 시도해주세요.");
      runAiRecommendation();
      return false;
    }
    if (isWithQuote() && (!fields.image.files || !fields.image.files.length)) {
      setMessage("견적서가 있는 경우 견적서 이미지를 최소 1장 첨부해주세요.");
      return false;
    }
    if (!fields.region.value.trim()) {
      setMessage("설치 지역을 입력해주세요.");
      return false;
    }
    if (!fields.installDate.value.trim()) {
      setMessage("설치 예정일을 입력해주세요.");
      return false;
    }
    syncAllFields();
    return true;
  }

  function isWithQuote() {
    return fields.quoteType.value === "with_quote";
  }

  function isWithoutQuote() {
    return fields.quoteType.value === "without_quote";
  }

  function shouldUseAiRecommendation() {
    return isWithoutQuote() && ["LG전자", "삼성전자", "비교견적"].includes(fields.brand.value);
  }

  function updateNativeRequirement() {
    if (fields.image) fields.image.required = isWithQuote();
    if (fields.price) fields.price.required = false;
  }

  function syncAllFields() {
    fields.items.value = buildItemsValue();
    fields.aiSituation.value = state.aiContext.situation;
    fields.familyComposition.value = state.aiContext.family.join(", ");
    fields.budgetStatus.value = state.aiContext.budgetStatus;
    fields.budgetRange.value = state.aiContext.budgetRange;
    fields.purchasePriority.value = state.aiContext.priorities.join(", ");
    fields.aiRequestSummary.value = buildAiSummary();
    if (!shouldUseAiRecommendation()) fields.aiModelRecommendations.value = "";
    if (isWithQuote()) {
      fields.items.value = "견적서 첨부";
      fields.price.value = "0";
    }
    updateNativeRequirement();
  }

  function buildItemsValue() {
    if (isWithQuote()) return "견적서 첨부";
    return state.selectedProducts
      .map((product) => {
        const summary = productOptionSummary(product);
        return summary ? `${product} (${summary})` : product;
      })
      .join(", ");
  }

  function productOptionSummary(product) {
    const productKey = normalizeProductKey(product);
    const schema = optionSchemaFor(product);
    const options = optionStateFor(productKey);
    const parts = [];
    schema.forEach((section) => {
      const values = sectionValues(section, options);
      if (!values.length) return;
      const selected = Array.isArray(options[section.key]) ? options[section.key] : [options[section.key]].filter(Boolean);
      selected.forEach((item) => {
        if (item && item !== unknownOption && values.includes(item)) parts.push(item);
      });
    });
    return [...new Set(parts)].join(" · ");
  }

  
function buildAiSummary() {
    if (!shouldUseAiRecommendation()) return "";
    const lines = [
      "고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다.",
      state.aiContext.situation ? `구매 목적: ${state.aiContext.situation}` : "",
      state.aiContext.family.length ? `가족 구성: ${state.aiContext.family.join(", ")}` : "",
      state.aiContext.budgetStatus ? `예산: ${state.aiContext.budgetStatus}${state.aiContext.budgetRange ? ` (${state.aiContext.budgetRange})` : ""}` : "",
      state.aiContext.priorities.length ? `중요 조건: ${state.aiContext.priorities.join(", ")}` : "",
      state.aiContext.note ? `추가 상황: ${state.aiContext.note}` : "",
    ];
    return lines.filter(Boolean).join("\n");
  }

  function clearAiRecommendation() {
    state.recommendationGroups = [];
    fields.aiModelRecommendations.value = "";
    if (isWithoutQuote()) fields.price.value = "0";
  }

  async function runAiRecommendation() {
    state.recommending = true;
    showAiRecommendationLoading();
    render();
    try {
      const groups = await buildAiModelRecommendations();
      state.recommendationGroups = groups;
      fields.aiModelRecommendations.value = recommendationsToText(groups);
      applyAutoLowestPrice(groups);
    } catch (error) {
      console.warn("AI recommendation failed", error);
      fields.aiModelRecommendations.value = fallbackRecommendationText();
      fields.price.value = "0";
    } finally {
      state.recommending = false;
      hideAiRecommendationLoading();
      syncAllFields();
      render();
    }
  }

  function showAiRecommendationLoading() {
    const modal = document.querySelector("#serverLoadingModal");
    const title = document.querySelector("#serverLoadingTitle");
    const text = document.querySelector("#serverLoadingText");
    const brandLabel = selectedAiBrandLabel();
    if (title) title.textContent = "AI가 추천모델을 찾는 중입니다.";
    if (text) text.textContent = `선택한 품목, 옵션, 예산을 기준으로 판매 가능한 ${brandLabel} 후보 모델을 정리하고 있습니다.`;
    if (modal) modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function hideAiRecommendationLoading() {
    const modal = document.querySelector("#serverLoadingModal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function selectedAiBrandLabel() {
    if (fields.brand.value === "삼성전자") return "삼성전자";
    if (fields.brand.value === "비교견적") return "LG전자와 삼성전자";
    return "LG전자";
  }

  async function loadCatalogByBrand(brand) {
    if (state.catalogs[brand]) return state.catalogs[brand];
    const path = brand === "삼성전자" ? "/assets/samsung-catalog-product-model-map.json" : "/assets/pickquote-product-model-map.json";
    const response = await fetchWithTimeout(path, { cache: "no-store" }, 12000);
    if (!response.ok) throw new Error("catalog load failed");
    state.catalogs[brand] = await response.json();
    return state.catalogs[brand];
  }

  async function loadCatalog() {
    if (fields.brand.value === "삼성전자") return loadCatalogByBrand("삼성전자");
    if (fields.brand.value !== "비교견적") return loadCatalogByBrand("LG전자");

    const [lgCatalog, samsungCatalog] = await Promise.all([loadCatalogByBrand("LG전자"), loadCatalogByBrand("삼성전자")]);
    const merged = {};
    productOptions.forEach((product) => {
      const key = product.value;
      const lgModels = Array.isArray(lgCatalog?.[key]?.models) ? lgCatalog[key].models.map((model) => ({ ...model, brand: model.brand || "LG전자" })) : [];
      const samsungModels = Array.isArray(samsungCatalog?.[key]?.models) ? samsungCatalog[key].models.map((model) => ({ ...model, brand: model.brand || "삼성전자" })) : [];
      merged[key] = { brand: "비교견적", source: "merged_lg_samsung_catalogues", models: [...lgModels, ...samsungModels] };
    });
    return merged;
  }

  async function buildAiModelRecommendations() {
    const catalog = await loadCatalog();
    const selectedProducts = state.selectedProducts.filter(Boolean);
    const totalWeight = selectedProducts.reduce((sum, product) => sum + productBudgetWeight(product), 0) || 1;
    const budgetWon = parseBudgetWon(state.aiContext.budgetRange);
    const groups = [];
    for (const product of selectedProducts) {
      const productKey = normalizeProductKey(product);
      const models = Array.isArray(catalog?.[productKey]?.models) ? catalog[productKey].models : [];
      const candidates = filterModelsByProductOptions(product, models);
      const targetPrice = budgetWon
        ? Math.round((budgetWon * productBudgetWeight(product)) / totalWeight)
        : defaultTargetPrice(product, candidates);
      const shortlist = rankModelCandidates(product, candidates, targetPrice).slice(0, 5);
      const enriched = [];
      for (const model of shortlist) {
        const lowest = await fetchLowestPrice(model.modelName);
        enriched.push({ ...model, naverLowestPrice: lowest || 0 });
      }
      const chosen = chooseRecommendedModel(product, enriched.length ? enriched : shortlist, targetPrice);
      groups.push({
        product,
        optionSummary: productOptionSummary(product),
        targetPrice,
        models: chosen ? [chosen] : [{ modelName: "판매자 상담 후 모델 확정", normalPrice: 0, naverLowestPrice: 0 }],
      });
    }
    return groups;
  }

  function filterModelsByProductOptions(product, models) {
    const productKey = normalizeProductKey(product);
    const options = optionStateFor(productKey);
    const normalized = models
      .filter((model) => model && model.modelName)
      .filter((model) => isAllowedRecommendationModel(productKey, model))
      .map((model) => ({ ...model, normalPrice: Number(model.normalPrice || 0) }))
      .sort((a, b) => b.normalPrice - a.normalPrice);
    const optionText = Object.values(options)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter(Boolean)
      .join(" ");
    const matchers = [];

    if (productKey === "TV" && options.size) {
      const selectedSize = Number(String(options.size).match(/\d+/)?.[0] || 0);
      const isOrAbove = /↑|이상|\+/.test(String(options.size));
      if (selectedSize) {
        matchers.push((model) => {
          const inches = extractTvInches(model.modelName);
          if (!inches) return false;
          return isOrAbove ? inches >= selectedSize : inches === selectedSize;
        });
      }
    }

    if (productKey === "라이프스타일 TV") {
      matchers.push((model) => /스탠바이미|STANBYME|27LX|32LX|라이프/i.test(modelSearchText(model)));
    }

    if (productKey === "냉장고") {
      const wantsFitAndMax = /핏앤맥스|빌트인|FIT\s*&?\s*MAX/i.test(optionText);
      const wantsFreeStanding = /프리스탠딩|용량/i.test(optionText);
      const wantsIceWater = /얼음정수기/i.test(optionText);
      if (wantsFitAndMax) matchers.push((model) => isFitAndMaxFridgeModel(model));
      else if (wantsIceWater) matchers.push((model) => /^W\d{3}/.test(modelBody(model)) || /얼음정수기/i.test(modelSearchText(model)));
      else if (wantsFreeStanding) matchers.push((model) => isFreeStandingFridgeModel(model));
      if (/4도어/.test(optionText)) matchers.push((model) => isFourDoorFridgeModel(model));
      if (/2도어|양문형/.test(optionText)) matchers.push((model) => isTwoDoorFridgeModel(model));
    }

    if (productKey === "김치냉장고") {
      matchers.push((model) => isKimchiFridgeModel(model));
      if (/뚜껑식/.test(optionText)) matchers.push((model) => /뚜껑|K\d{3}|Z1/i.test(modelSearchText(model)));
      if (/스탠드|오브제/.test(optionText)) matchers.push((model) => /스탠드|Z\d{3}|RQ/i.test(modelSearchText(model)));
      if (/4도어/.test(optionText)) matchers.push((model) => /4도어|Z4|Z5|RQ5/i.test(modelSearchText(model)));
      if (/3도어/.test(optionText)) matchers.push((model) => /3도어|Z3|RQ3/i.test(modelSearchText(model)));
      if (/1도어/.test(optionText)) matchers.push((model) => /1도어|Z1|K\d{3}/i.test(modelSearchText(model)));
    }

    if (productKey === "세탁기/건조기" && optionText) {
      if (/분리형/.test(optionText)) matchers.push((model) => /(F\d{2}|RH|RD|세탁|건조)/i.test(modelSearchText(model)) && !/워시타워|원바디|콤보/i.test(modelSearchText(model)));
      if (/콤보/.test(optionText)) matchers.push((model) => /콤보|세탁건조|FX|FH/i.test(modelSearchText(model)) && !/^TR/i.test(modelBody(model)));
      if (/일체형|원바디|워시타워/.test(optionText)) matchers.push((model) => /워시타워|원바디|W\d{2}|WL|WK/i.test(modelSearchText(model)));
    }

    if (productKey === "청소기" && Array.isArray(options.type) && options.type.length) {
      matchers.push((model) => options.type.some((type) => modelSearchText(model).includes(type.replace("청소기", ""))));
    }
    if (productKey === "에어컨" && optionText) {
      if (/천장형/.test(optionText)) matchers.push((model) => /천장|시스템/i.test(modelSearchText(model)));
      if (/2IN1/.test(optionText)) matchers.push((model) => /2IN1|2in1|투인원|멀티|FQ.*2/i.test(modelSearchText(model)));
      if (/스탠드/.test(optionText)) matchers.push((model) => /스탠드|FQ/i.test(modelSearchText(model)));
      if (/벽걸이/.test(optionText)) matchers.push((model) => /벽걸이|SQ|SW/i.test(modelSearchText(model)));
    }
    if (productKey === "식기세척기") matchers.push((model) => /식기|식세|D[FBE]/i.test(modelSearchText(model)));
    if (productKey === "인덕션/전기레인지") matchers.push((model) => /인덕션|전기레인지|하이라이트|BE|CB/i.test(modelSearchText(model)));
    if (productKey === "오븐 / 전자레인지" || productKey === "오븐/전자레인지") matchers.push((model) => /오븐|전자레인지|ML|MW/i.test(modelSearchText(model)));
    if (productKey === "공기청정기") matchers.push((model) => /공기|퓨리|청정|AS/i.test(modelSearchText(model)));
    if (productKey === "의류관리기") matchers.push((model) => /스타일러|의류|SC|S5|S3|DF/i.test(modelSearchText(model)));

    const matched = matchers.length ? normalized.filter((model) => matchers.every((matcher) => matcher(model))) : normalized;
    return matched;
  }

  function isAllowedRecommendationModel(product, model) {
    const productKey = normalizeProductKey(product);
    const body = modelBody(model);
    const name = compactModelName(model?.modelName || "");
    const text = compactModelName(modelSearchText(model));
    const brand = compactModelName(model?.brand || "");

    if (!body || body.includes("상담")) return false;

    if (brand.includes("삼성") || brand.includes("SAMSUNG")) {
      return isAllowedSamsungRecommendationModel(product, model);
    }

    const blockedBodies = new Set([
      "75QNED9MAKW",
      "27LX6TEGA",
      "27LX6TKGA",
      "27LX6TPGA",
    ]);
    if (blockedBodies.has(body) && /\.AKXT7SC$/i.test(name)) return false;
    if (body === "75QNED9MAKW") return false;

    if (productKey === "라이프스타일 TV") {
      return /^(27LX6T|32LX)/.test(body) && !/AKXT7SC$/.test(name);
    }

    if (productKey === "냉장고") {
      const optionText = Object.values(optionStateFor(productKey))
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter(Boolean)
        .join(" ");
      const wantsFitAndMax = /빌트인|핏앤맥스|FIT\s*&?\s*MAX/i.test(optionText);
      const wantsFreeStanding = /프리스탠딩|용량/i.test(optionText);

      if (wantsFitAndMax) return isFitAndMaxFridgeModel(model);
      if (wantsFreeStanding && /^D646/.test(body)) return false;
      if (/^(B18|B182|A202|RT|RB)/.test(body)) return false;
    }

    if (productKey === "김치냉장고") {
      if (!isKimchiFridgeModel(model)) return false;
      if (/^(Z|K|RQ)/.test(body)) return true;
      return /김치|GBB/.test(text);
    }

    return true;
  }

  function isAllowedSamsungRecommendationModel(product, model) {
    const productKey = normalizeProductKey(product);
    const body = modelBody(model);
    const text = compactModelName(modelSearchText(model));

    if (!body || /^KMR/.test(body)) return false;

    if (productKey === "TV") return /^(KQ|KU|UN|QN|QA)\d{2,3}/.test(body);
    if (productKey === "라이프스타일 TV") return /^(KQ\d{2}LS|LSH|SP-L)/.test(body);
    if (productKey === "냉장고") return /^(RF|RM|RR|RS|RB)\d{2}/.test(body) || /BESPOKE/.test(text);
    if (productKey === "김치냉장고") return /^(RQ|RK)\d{2}/.test(body);
    if (productKey === "세탁기/건조기") return /^(WF|DV|WD|WR|WW)\d{2}/.test(body);
    if (productKey === "의류관리기") return /^DF\d{2}/.test(body);
    if (productKey === "에어컨") return /^(AF|AR|AP|AC)\d{2}/.test(body);
    if (productKey === "청소기") return /^(VS|VR|VC)\d{2}/.test(body);
    if (productKey === "식기세척기") return /^DW\d{2}/.test(body);
    if (productKey === "공기청정기") return /^AX\d{2}/.test(body);
    if (productKey === "인덕션/전기레인지") return /^(NZ|NZI|NZP|CTR)\d*/.test(body);
    if (productKey === "오븐 / 전자레인지" || productKey === "오븐/전자레인지") return /^(MC|MS|MG|MO|NQ)\d*/.test(body);

    return true;
  }

  function modelSearchText(model) {
    return [model?.modelName, model?.productGroup, model?.category, model?.title].filter(Boolean).join(" ");
  }

  function compactModelName(value) {
    return String(value || "").toUpperCase().replace(/\s+/g, "");
  }

  function modelBody(value) {
    const source = typeof value === "object" ? value?.modelName : value;
    return compactModelName(source).split(".")[0];
  }

  function isGbbPreferredModel(value) {
    return /GBB/i.test(compactModelName(modelSearchText(value)));
  }

  function isFitAndMaxFridgeModel(value) {
    const body = modelBody(value);
    const text = compactModelName(modelSearchText(value));
    if (/^(M876|W\d{3}|D\d{3}|B18|B182|A202|T87|T80|RT|RB)/.test(body)) return false;
    return /^G646/.test(body) || /^M623/.test(body) || /FITANDMAX|핏앤맥스/.test(text);
  }

  function isBuiltInFridgeModel(value) {
    return isFitAndMaxFridgeModel(value);
  }

  function isFreeStandingFridgeModel(value) {
    const body = modelBody(value);
    const text = modelSearchText(value);
    if (isFitAndMaxFridgeModel(value)) return false;
    return /프리스탠딩|스탠드|용량/i.test(text) || /^(M87|M86|W82|T87|T80)/.test(body);
  }

  function isFourDoorFridgeModel(value) {
    const body = modelBody(value);
    const text = compactModelName(modelSearchText(value));
    if (/^(B18|B182|A202|RT|RB|D\d{3})/.test(body)) return false;
    return /4도어|노크온|상냉장|매직스페이스/.test(modelSearchText(value)) || /^(G646|M623|M87|M86|W82|T87|RF)\d*/.test(body) || /BESPOKE/.test(text);
  }

  function isTwoDoorFridgeModel(value) {
    const body = modelBody(value);
    return /2도어|양문형|일반냉장고/i.test(modelSearchText(value)) || /^(B18|B182|D\d{3}|RS|RT|RB)/.test(body);
  }

  function isKimchiFridgeModel(value) {
    const body = modelBody(value);
    const text = modelSearchText(value);
    return /김치|Z\d{3}|K\d{3}|RQ/i.test(text) || /^(Z|K|RQ)\d{2,3}/.test(body);
  }

  function productBudgetWeight(product) {
    return {
      TV: 1.45,
      "라이프스타일 TV": 0.7,
      냉장고: 1.25,
      김치냉장고: 0.95,
      "세탁기/건조기": 1.35,
      의류관리기: 0.75,
      에어컨: 1.25,
      청소기: 0.45,
      식기세척기: 0.55,
      공기청정기: 0.4,
      "인덕션/전기레인지": 0.55,
      "오븐/전자레인지": 0.35,
    }[product] || 0.8;
  }

  function parseBudgetWon(value) {
    const source = String(value || "").replace(/,/g, "").trim();
    if (!source) return 0;
    const numbers = [...source.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1])).filter(Boolean);
    if (!numbers.length) return 0;
    const number = Math.max(...numbers);
    if (/억/.test(source)) return Math.round(number * 100000000);
    if (/만원|만/.test(source) || number < 100000) return Math.round(number * 10000);
    return Math.round(number);
  }

  function defaultTargetPrice(product, candidates) {
    const prices = candidates.map((model) => Number(model.normalPrice || 0)).filter(Boolean).sort((a, b) => a - b);
    if (!prices.length) return productBudgetWeight(product) * 1800000;
    const indexRatio = isPremiumAiContext() ? 0.72 : 0.58;
    return prices[Math.min(prices.length - 1, Math.floor(prices.length * indexRatio))];
  }

  function isPremiumAiContext() {
    const text = [state.aiContext.situation, state.aiContext.budgetRange, ...state.aiContext.priorities, state.aiContext.note].join(" ");
    return /혼수|웨딩|신축|입주|프리미엄|하이엔드|오브제|핏앤맥스/i.test(text);
  }

  function estimatedOnlinePrice(model) {
    const normalPrice = Number(model?.normalPrice || 0);
    return normalPrice ? Math.round(normalPrice * 0.62) : 0;
  }

  function rankModelCandidates(product, candidates, targetPrice) {
    const premium = isPremiumAiContext();
    return [...candidates].sort((a, b) => modelPreScore(product, a, targetPrice, premium) - modelPreScore(product, b, targetPrice, premium));
  }

  function modelPreScore(product, model, targetPrice, premium) {
    const price = estimatedOnlinePrice(model) || Number(model.normalPrice || 0) || targetPrice || 1;
    const target = targetPrice || price || 1;
    let score = Math.abs(price - target) / target;
    if (premium && price < target * 0.72) score += 0.9;
    if (!premium && price < target * 0.5) score += 0.35;
    if (price > target * 1.65) score += 0.25;
    return score + modelQualityAdjustment(product, model);
  }

  function chooseRecommendedModel(product, candidates, targetPrice) {
    const premium = isPremiumAiContext();
    return [...candidates]
      .filter((model) => model && model.modelName)
      .filter((model) => isAllowedRecommendationModel(product, model))
      .sort((a, b) => {
        const aNaverPrice = Number(a.naverLowestPrice || 0);
        const bNaverPrice = Number(b.naverLowestPrice || 0);
        const aPrice = aNaverPrice >= 300000 ? aNaverPrice : estimatedOnlinePrice(a);
        const bPrice = bNaverPrice >= 300000 ? bNaverPrice : estimatedOnlinePrice(b);
        const target = targetPrice || Math.max(aPrice, bPrice, 1);
        let aScore = Math.abs(aPrice - target) / target;
        let bScore = Math.abs(bPrice - target) / target;
        if (premium && aPrice < target * 0.72) aScore += 0.95;
        if (premium && bPrice < target * 0.72) bScore += 0.95;
        if (!premium && aPrice < target * 0.5) aScore += 0.35;
        if (!premium && bPrice < target * 0.5) bScore += 0.35;
        if (aPrice > target * 1.65) aScore += 0.2;
        if (bPrice > target * 1.65) bScore += 0.2;
        if (a.catalogueHit) aScore -= 0.08;
        if (b.catalogueHit) bScore -= 0.08;
        return aScore + modelQualityAdjustment(product, a) - (bScore + modelQualityAdjustment(product, b));
      })[0];
  }

  function modelQualityAdjustment(product, model) {
    const productKey = normalizeProductKey(product);
    const name = String(typeof model === "object" ? model?.modelName : model || "").toUpperCase();
    const text = compactModelName(modelSearchText(typeof model === "object" ? model : { modelName: name }));
    const body = modelBody(model);
    const brand = typeof model === "object" ? model?.brand || "" : "";
    let score = 0;
    if (productKey === "TV") {
      if (/OLED|QNED9|QNED8/.test(name)) score -= 0.22;
      if (/^(KQ|QN).*9|OLED|NEO/.test(name) || /NEO QLED|OLED/.test(text)) score -= 0.18;
      if (/QNED70|NANO70/.test(name)) score += 0.3;
      if (/^KU/.test(name)) score += 0.22;
    }
    if (productKey === "냉장고") {
      if (isGbbPreferredModel(model)) score -= 0.85;
      if (/^G646|^M623/.test(body)) score -= 0.7;
      if (/^M876|^W\d{3}|^D\d{3}|^T87|^T80/.test(body)) score += 0.55;
      if (/B18|B182|A202|^RT|^RB/.test(name)) score += 0.65;
    }
    if (productKey === "세탁기/건조기") {
      if (/FX|FH|W2|WL|WK/.test(name)) score -= 0.18;
      if (/WD|WR|BESPOKE|콤보/.test(text)) score -= 0.16;
      if (/TR16|RH9|단품/.test(name)) score += 0.4;
    }
    if (productKey === "김치냉장고") {
      if (isGbbPreferredModel(model)) score -= 0.85;
      if (/^Z|^K|^RQ/.test(body)) score -= 0.2;
      if (/BROWN|WHITE|SILVER/i.test(text)) score += 0.18;
    }
    if (productKey === "청소기" && /B95|B94|A9/.test(name)) score -= 0.12;
    if (productKey === "청소기" && /^VS/.test(name)) score -= 0.1;
    if (productKey === "의류관리기" && /SC5|S5/.test(name)) score -= 0.12;
    if (productKey === "의류관리기" && /^DF/.test(name)) score -= 0.12;
    if (brand === "삼성전자" && fields.brand.value === "삼성전자") score -= 0.03;
    return score;
  }

  function extractTvInches(modelName) {
    const name = String(modelName || "").toUpperCase().replace(/\s+/g, "");
    const patterns = [
      /OLED(\d{2,3})/,
      /(?:KQ|KU|QN|QA|UN|TQ|LH|KMR|MNA)(\d{2,3})/,
      /^(\d{2,3})(?:QNED|NANO)/,
      /(^|[^A-Z0-9])(\d{2,3})(?:QNED|NANO)/,
    ];

    for (const pattern of patterns) {
      const match = name.match(pattern);
      const raw = match?.[2] || match?.[1];
      const inches = Number(raw || 0);
      if (inches >= 20 && inches <= 120) return inches;
    }
    return 0;
  }

  async function fetchLowestPrice(modelName) {
    try {
      const response = await fetchWithTimeout(`/api/naver-shopping-lowest?query=${encodeURIComponent(modelName)}`, { cache: "no-store" }, 9000);
      if (!response.ok) return 0;
      const data = await response.json();
      if (!data.ok || data.confidence !== "exact-model-filtered") return 0;
      return Number(data.lowestPrice || 0);
    } catch {
      return 0;
    }
  }

  function recommendationsToText(groups) {
    const lines = ["고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다."];
    groups.forEach((group) => {
      lines.push("");
      lines.push(
        `[${group.product}]${group.optionSummary ? ` ${group.optionSummary}` : ""}` +
          (Number(group.models?.[0]?.naverLowestPrice || 0) >= 300000 ? ` / 네이버 최저가 ${formatWon(group.models[0].naverLowestPrice)}` : "")
      );
      group.models.forEach((model) => lines.push(`- ${displayModelName(model)}${formatModelLowestPrice(model)}`));
    });
    const total = recommendationTotalPrice(groups);
    if (total > 0) {
      lines.push("");
      lines.push(`네이버 최저가 기준 합계: ${formatWon(total)}`);
    }
    return lines.join("\n").trim();
  }

  function displayModelName(model) {
    const brand = model?.brand && fields.brand.value === "비교견적" ? `[${model.brand}] ` : "";
    return `${brand}${model?.modelName || "판매자 상담 후 모델 확정"}`;
  }

  function formatWon(value) {
    const price = Number(value || 0);
    return price > 0 ? `${price.toLocaleString("ko-KR")}원` : "";
  }

  function formatModelLowestPrice(model) {
    const price = Number(model?.naverLowestPrice || 0);
    return price >= 300000 ? ` (네이버 최저가 ${formatWon(price)})` : "";
  }

  function renderModelWithPrice(model) {
    const price = Number(model?.naverLowestPrice || 0);
    const priceLabel = price >= 300000 ? `네이버 최저가 ${formatWon(price)}` : "일반 구매가 확인 중";
    return `<span>${escapeHtml(displayModelName(model))}</span><em>${escapeHtml(priceLabel)}</em>`;
  }

  function recommendationModelPrice(model) {
    const naverPrice = Number(model?.naverLowestPrice || 0);
    if (naverPrice >= 300000) return naverPrice;
    const estimated = estimatedOnlinePrice(model);
    return estimated >= 300000 ? estimated : 0;
  }

  function recommendationTotalPrice(groups) {
    return groups.reduce((sum, group) => {
      const productTotal = (group.models || []).reduce((modelSum, model) => modelSum + recommendationModelPrice(model), 0);
      return sum + productTotal;
    }, 0);
  }

  function renderRecommendationTotal(groups) {
    const total = recommendationTotalPrice(groups);
    if (!total) return "";
    return `
      <div class="ai-recommendation-total">
        <span>네이버 최저가 기준 합계</span>
        <strong>${escapeHtml(formatWon(total))}</strong>
      </div>
    `;
  }

  function fallbackRecommendationText() {
    const lines = ["고객의 상황에 맞춰 AI가 추천한 모델임을 알려드립니다."];
    state.selectedProducts.forEach((product) => {
      lines.push("");
      lines.push(`[${product}]${productOptionSummary(product) ? ` ${productOptionSummary(product)}` : ""}`);
      lines.push("- 판매자 상담 후 모델 확정");
    });
    return lines.join("\n").trim();
  }

  function applyAutoLowestPrice(groups) {
    const total = recommendationTotalPrice(groups);
    fields.price.value = total ? String(Math.ceil(total / 10000)) : "0";
  }

  function updatePreview() {
    if (previewTitle) previewTitle.textContent = buildItemsValue() || "견적 요청서가 여기에 표시됩니다.";
    if (previewMeta) {
      const brand = fields.brand.value || "브랜드 미선택";
      const region = fields.region.value || "지역 미입력";
      const type = isWithoutQuote() ? "견적서 없음" : isWithQuote() ? "견적서 있음" : "견적서 유무 미선택";
      previewMeta.textContent = `${type} · ${brand} · ${region}`;
    }
    if (imagePreview && isWithoutQuote()) {
      imagePreview.innerHTML = "<span>견적서 없이 AI 추천 정보로 접수됩니다.</span>";
    }
  }

  function formatPhoneInput(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.startsWith("02")) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();

