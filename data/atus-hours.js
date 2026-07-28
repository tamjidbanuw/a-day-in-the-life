/**
 * Share of the American population in each activity, by clock hour.
 *
 * Aggregated from the American Time Use Survey multi-year microdata in
 * data/time_use_atus/ (2003-2015): 3,347,093 activity records belonging to
 * 170,842 respondents, each record weighted by the survey's final weight and
 * spread across the clock hours its start time and duration actually cover.
 * Weekday and weekend diaries are pooled.
 *
 * Values are percentages, so every hour sums to 100. Index is the hour, 0-23.
 *
 * ATUS tier-1 codes are folded into the same five categories the rest of the
 * page uses, so this chart and the OECD charts can be read together:
 *   PCA  personal care (1) + eating and drinking (11)
 *   PAW  work (5) + education (6)
 *   UPW  household (2), care of household and others (3, 4),
 *        purchases and services (7, 8, 9)
 *   LEI  socialising and relaxing (12), sport (13), religion (14), volunteering (15)
 *   OTH  everything else, including travel (18)
 *
 * United States only. ATUS covers no other country, and no other country in
 * this story publishes diaries with times of day in a form we hold.
 */
window.ATUS_HOURS = [
    { PCA: 87.76, PAW: 2.27,  UPW: 0.95,  LEI: 7.70,  OTH: 1.31 },  /* 00 */
    { PCA: 92.86, PAW: 1.77,  UPW: 0.56,  LEI: 4.07,  OTH: 0.74 },  /* 01 */
    { PCA: 95.29, PAW: 1.47,  UPW: 0.46,  LEI: 2.24,  OTH: 0.54 },  /* 02 */
    { PCA: 96.04, PAW: 1.48,  UPW: 0.46,  LEI: 1.54,  OTH: 0.48 },  /* 03 */
    { PCA: 93.64, PAW: 2.19,  UPW: 1.23,  LEI: 1.98,  OTH: 0.96 },  /* 04 */
    { PCA: 87.82, PAW: 3.79,  UPW: 2.50,  LEI: 3.54,  OTH: 2.35 },  /* 05 */
    { PCA: 73.34, PAW: 8.17,  UPW: 6.75,  LEI: 6.33,  OTH: 5.41 },  /* 06 */
    { PCA: 52.48, PAW: 17.77, UPW: 11.41, LEI: 9.55,  OTH: 8.80 },  /* 07 */
    { PCA: 34.79, PAW: 29.09, UPW: 15.16, LEI: 12.98, OTH: 7.98 },  /* 08 */
    { PCA: 22.30, PAW: 34.22, UPW: 18.95, LEI: 17.03, OTH: 7.49 },  /* 09 */
    { PCA: 14.83, PAW: 35.87, UPW: 21.16, LEI: 20.38, OTH: 7.76 },  /* 10 */
    { PCA: 14.36, PAW: 34.36, UPW: 21.30, LEI: 21.67, OTH: 8.31 },  /* 11 */
    { PCA: 20.33, PAW: 28.49, UPW: 20.05, LEI: 21.87, OTH: 9.26 },  /* 12 */
    { PCA: 13.86, PAW: 33.04, UPW: 19.87, LEI: 24.32, OTH: 8.92 },  /* 13 */
    { PCA: 10.42, PAW: 33.35, UPW: 19.90, LEI: 26.73, OTH: 9.59 },  /* 14 */
    { PCA: 9.53,  PAW: 29.44, UPW: 20.78, LEI: 29.12, OTH: 11.13 }, /* 15 */
    { PCA: 10.52, PAW: 23.62, UPW: 22.11, LEI: 31.67, OTH: 12.08 }, /* 16 */
    { PCA: 15.71, PAW: 15.16, UPW: 22.17, LEI: 33.98, OTH: 12.98 }, /* 17 */
    { PCA: 19.20, PAW: 10.63, UPW: 19.95, LEI: 39.82, OTH: 10.40 }, /* 18 */
    { PCA: 16.56, PAW: 8.96,  UPW: 16.72, LEI: 49.83, OTH: 7.93 },  /* 19 */
    { PCA: 16.75, PAW: 7.69,  UPW: 12.71, LEI: 56.19, OTH: 6.66 },  /* 20 */
    { PCA: 28.10, PAW: 6.29,  UPW: 8.08,  LEI: 51.94, OTH: 5.58 },  /* 21 */
    { PCA: 52.86, PAW: 4.67,  UPW: 4.16,  LEI: 34.39, OTH: 3.92 },  /* 22 */
    { PCA: 75.53, PAW: 3.26,  UPW: 1.95,  LEI: 16.94, OTH: 2.32 }   /* 23 */
];
