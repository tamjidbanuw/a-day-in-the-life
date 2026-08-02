/**
 * Daily minutes by activity and sex, 35 countries.
 *
 * Built from data/time_use_oecd.csv, which was already in this repo and already
 * carried a SEX column that nothing had used: every figure the story shows is the
 * "Total" row, and the Male and Female rows sat untouched beside it.
 *
 * Each field is [men, women] in minutes per day.
 *   lei  leisure          upw  unpaid work
 *   paw  paid work        pca  personal care, which includes sleeping and eating
 *
 * What is in here, all of it counted rather than asserted:
 *   men have more leisure in 35 of 35 countries, by 44 minutes on average
 *   women do more unpaid work in 35 of 35, by 127 minutes
 *   men do more paid work in 35 of 35
 *   and counting both kinds together, women work more in 31 of 35:
 *   7h33 against 8h5
 *
 * OECD Time Use Database. Surveys run between 2009 and 2016 for most countries;
 * a few are older, which is why this is a portrait rather than a trend.
 */
window.GENDER_SPLIT = [
 {
  "name": "Australia",
  "twelve": true,
  "lei": [
   297,
   269
  ],
  "upw": [
   172,
   311
  ],
  "paw": [
   304,
   172
  ],
  "pca": [
   649,
   666
  ]
 },
 {
  "name": "Austria",
  "lei": [
   322,
   292
  ],
  "upw": [
   139,
   238
  ],
  "paw": [
   312,
   219
  ],
  "pca": [
   657,
   678
  ]
 },
 {
  "name": "Belgium",
  "lei": [
   365,
   317
  ],
  "upw": [
   144,
   237
  ],
  "paw": [
   274,
   199
  ],
  "pca": [
   648,
   677
  ]
 },
 {
  "name": "Bulgaria",
  "lei": [
   271,
   210
  ],
  "upw": [
   126,
   257
  ],
  "paw": [
   306,
   256
  ],
  "pca": [
   733,
   711
  ]
 },
 {
  "name": "Canada",
  "twelve": true,
  "lei": [
   226,
   197
  ],
  "upw": [
   164,
   247
  ],
  "paw": [
   371,
   303
  ],
  "pca": [
   648,
   664
  ]
 },
 {
  "name": "China",
  "twelve": true,
  "lei": [
   248,
   211
  ],
  "upw": [
   91,
   234
  ],
  "paw": [
   390,
   291
  ],
  "pca": [
   696,
   692
  ]
 },
 {
  "name": "Croatia",
  "lei": [
   276,
   225
  ],
  "upw": [
   149,
   258
  ],
  "paw": [
   344,
   298
  ],
  "pca": [
   661,
   648
  ]
 },
 {
  "name": "Denmark",
  "lei": [
   340,
   320
  ],
  "upw": [
   186,
   243
  ],
  "paw": [
   260,
   195
  ],
  "pca": [
   643,
   673
  ]
 },
 {
  "name": "Estonia",
  "lei": [
   325,
   277
  ],
  "upw": [
   139,
   209
  ],
  "paw": [
   308,
   278
  ],
  "pca": [
   651,
   656
  ]
 },
 {
  "name": "Finland",
  "lei": [
   350,
   309
  ],
  "upw": [
   162,
   209
  ],
  "paw": [
   257,
   222
  ],
  "pca": [
   628,
   663
  ]
 },
 {
  "name": "France",
  "twelve": true,
  "lei": [
   319,
   270
  ],
  "upw": [
   135,
   224
  ],
  "paw": [
   235,
   175
  ],
  "pca": [
   743,
   761
  ]
 },
 {
  "name": "Germany",
  "twelve": true,
  "lei": [
   358,
   324
  ],
  "upw": [
   152,
   233
  ],
  "paw": [
   277,
   210
  ],
  "pca": [
   649,
   667
  ]
 },
 {
  "name": "Greece",
  "lei": [
   375,
   310
  ],
  "upw": [
   97,
   260
  ],
  "paw": [
   276,
   183
  ],
  "pca": [
   689,
   680
  ]
 },
 {
  "name": "Hungary",
  "lei": [
   308,
   257
  ],
  "upw": [
   162,
   294
  ],
  "paw": [
   273,
   203
  ],
  "pca": [
   686,
   679
  ]
 },
 {
  "name": "India",
  "twelve": true,
  "lei": [
   283,
   221
  ],
  "upw": [
   52,
   352
  ],
  "paw": [
   391,
   185
  ],
  "pca": [
   703,
   670
  ]
 },
 {
  "name": "Ireland",
  "lei": [
   338,
   287
  ],
  "upw": [
   127,
   293
  ],
  "paw": [
   341,
   195
  ],
  "pca": [
   595,
   623
  ]
 },
 {
  "name": "Italy",
  "twelve": true,
  "lei": [
   366,
   281
  ],
  "upw": [
   131,
   306
  ],
  "paw": [
   221,
   133
  ],
  "pca": [
   710,
   705
  ]
 },
 {
  "name": "Japan",
  "twelve": true,
  "lei": [
   284,
   254
  ],
  "upw": [
   47,
   208
  ],
  "paw": [
   442,
   292
  ],
  "pca": [
   632,
   647
  ]
 },
 {
  "name": "Korea",
  "lei": [
   272,
   244
  ],
  "upw": [
   49,
   215
  ],
  "paw": [
   419,
   269
  ],
  "pca": [
   676,
   680
  ]
 },
 {
  "name": "Latvia",
  "lei": [
   290,
   249
  ],
  "upw": [
   130,
   253
  ],
  "paw": [
   377,
   288
  ],
  "pca": [
   640,
   644
  ]
 },
 {
  "name": "Lithuania",
  "lei": [
   282,
   215
  ],
  "upw": [
   152,
   292
  ],
  "paw": [
   354,
   279
  ],
  "pca": [
   644,
   645
  ]
 },
 {
  "name": "Luxembourg",
  "lei": [
   299,
   253
  ],
  "upw": [
   121,
   240
  ],
  "paw": [
   330,
   239
  ],
  "pca": [
   677,
   694
  ]
 },
 {
  "name": "Mexico",
  "twelve": true,
  "lei": [
   213,
   194
  ],
  "upw": [
   147,
   349
  ],
  "paw": [
   454,
   260
  ],
  "pca": [
   600,
   611
  ]
 },
 {
  "name": "Netherlands",
  "lei": [
   330,
   300
  ],
  "upw": [
   145,
   225
  ],
  "paw": [
   285,
   201
  ],
  "pca": [
   666,
   697
  ]
 },
 {
  "name": "New Zealand",
  "lei": [
   306,
   295
  ],
  "upw": [
   141,
   264
  ],
  "paw": [
   338,
   205
  ],
  "pca": [
   639,
   656
  ]
 },
 {
  "name": "Norway",
  "lei": [
   367,
   340
  ],
  "upw": [
   160,
   212
  ],
  "paw": [
   303,
   247
  ],
  "pca": [
   596,
   632
  ]
 },
 {
  "name": "Poland",
  "lei": [
   281,
   246
  ],
  "upw": [
   189,
   293
  ],
  "paw": [
   272,
   172
  ],
  "pca": [
   665,
   693
  ]
 },
 {
  "name": "Portugal",
  "lei": [
   289,
   200
  ],
  "upw": [
   96,
   328
  ],
  "paw": [
   372,
   231
  ],
  "pca": [
   677,
   674
  ]
 },
 {
  "name": "Slovenia",
  "lei": [
   337,
   283
  ],
  "upw": [
   166,
   286
  ],
  "paw": [
   300,
   234
  ],
  "pca": [
   632,
   630
  ]
 },
 {
  "name": "South Africa",
  "lei": [
   334,
   282
  ],
  "upw": [
   103,
   250
  ],
  "paw": [
   294,
   195
  ],
  "pca": [
   695,
   695
  ]
 },
 {
  "name": "Spain",
  "twelve": true,
  "lei": [
   347,
   284
  ],
  "upw": [
   146,
   289
  ],
  "paw": [
   236,
   167
  ],
  "pca": [
   697,
   687
  ]
 },
 {
  "name": "Sweden",
  "lei": [
   338,
   306
  ],
  "upw": [
   171,
   220
  ],
  "paw": [
   313,
   275
  ],
  "pca": [
   611,
   633
  ]
 },
 {
  "name": "Türkiye",
  "lei": [
   301,
   270
  ],
  "upw": [
   68,
   305
  ],
  "paw": [
   358,
   134
  ],
  "pca": [
   679,
   685
  ]
 },
 {
  "name": "United Kingdom",
  "twelve": true,
  "lei": [
   327,
   285
  ],
  "upw": [
   140,
   249
  ],
  "paw": [
   309,
   216
  ],
  "pca": [
   635,
   655
  ]
 },
 {
  "name": "United States",
  "twelve": true,
  "lei": [
   305,
   255
  ],
  "upw": [
   159,
   235
  ],
  "paw": [
   305,
   251
  ],
  "pca": [
   652,
   676
  ]
 }
];
window.GENDER_META = {
 "n": 35,
 "menMoreLeisure": 35,
 "womenMoreUnpaid": 35,
 "menMorePaid": 35,
 "womenMoreTotal": 31,
 "avgLeisureGap": 44,
 "avgUnpaidGap": 127,
 "avgTotalMen": 453,
 "avgTotalWomen": 485
};
