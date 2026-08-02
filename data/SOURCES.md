# Data Sources — A Day in the Life of the World

All datasets are public. Verify/complete the URLs marked TODO before submission
(VizCon judging gives 15% for cited, accessible sources).

## Raw sources

The **In use** column says whether the story reads it today. Several files were gathered
while the shape of the story was still moving and now sit unused; they are kept because
finding them again costs more than storing them, but nothing on the page depends on them.

| File | Dataset | Publisher | In use | URL |
|------|---------|-----------|--------|-----|
| `time_use_oecd.csv` | Time Use (minutes/day: paid work, unpaid work, personal care, leisure, other), 35 countries, by sex | OECD | **yes** — the spine of the whole story | https://data-explorer.oecd.org (Time Use dataflow DSD_TIME_USE) |
| `time_use_atus/` | American Time Use Survey (detailed US 24h microdata) | US Bureau of Labor Statistics (via Kaggle) | **yes** — Chapter Three and the live coda | TODO Kaggle link |
| `happiness/` | World Happiness Report 2015–2022 (score + 6 factors) | Gallup / WHR (via Kaggle) | **yes** — Chapter Two | TODO Kaggle link |
| `API_NY.GDP.PCAP.CD_DS2_en_csv_v2_*/` | GDP per capita, current US$ (NY.GDP.PCAP.CD); 2023 values used | World Bank | **yes** — the money-and-mood scatter, and the quiz's income axis | https://data.worldbank.org/indicator/NY.GDP.PCAP.CD |
| `tourism_worldbank/` | International tourism arrivals (ST.INT.ARVL) | World Bank WDI | **yes** — the quiz's openness axis | https://data.worldbank.org/indicator/ST.INT.ARVL |
| `world_population.csv` | Population, density, area by country | Kaggle (World Population) | **yes** — the opener's 52.5% share, and the only file carrying ISO3 codes | TODO Kaggle link |
| `WHR26_Data_Figure_2.1.xlsx` | World Happiness Report 2026, Figure 2.1 data (ladder + social support, freedom, generosity sub-scores) | World Happiness Report / Gallup | **no** — fed the quiz's old Community axis | https://worldhappiness.report/data/ |
| `population_projections_un.xlsx` | World Population Prospects 2024 (demographic indicators) | UN DESA | no | https://population.un.org/wpp |
| `spice.csv` | Spice production/consumption/trade by country | FAO FAOSTAT | no | https://www.fao.org/faostat |
| `flights_routes.csv` | Airline routes (OpenFlights) | OpenFlights | no | https://openflights.org/data.html |
| `city_happiness/` | City Happiness Index 2024 (noise, traffic, green space, AQI...) | Kaggle | no | TODO Kaggle link |

### Removed as unused

Four files were deleted once nothing read them: `life_expectancy.csv`, `food_meat.csv`,
`languages.csv`, and the derived `gender-split.js`. Git history has them, and the publisher
URLs above cover the first three if any is wanted again.

Life expectancy is the one worth explaining, because it shaped the whole story. It was the
constraint that held the page to twelve countries: one condition in `js/app.js` kept only
countries having life expectancy **and** happiness **and** tourism, and the file carried just
15 countries, three of which keep no time diary — so the intersection was exactly 12, and 23
countries whose days were already in the OECD file were being thrown away. Dropping the
measure tripled the sample.

It was dropped for the file being short, not wrong. **Our World in Data publishes all 35**
(https://ourworldindata.org/life-expectancy), so refilling it would restore the fifth rank
column and the DNA health axis. The WHR 2026 sub-scores are the same story: they only ever
covered the same twelve, which is why the quiz was rebuilt on percentiles instead.

## Generated files (committed; their build scripts are not)

Everything the page actually loads is baked to JS, because the story has to run from
`file://` where `fetch` is blocked. Each of these is rebuilt from the raw sources above and
carries its own provenance header.

| File | Built from | Contents |
|------|-----------|----------|
| `adl-data.js` | `time_use_oecd.csv`, `happiness/`, GDP, `tourism_worldbank/` | Per-country day (five measures), ladder score, GDP per person, arrivals. 35 countries with a day; 34 with a ladder — Luxembourg keeps a diary and has no score. Also holds unused `dna` and `community_raw` fields for twelve countries. |
| `day-us.js` | `time_use_atus/` | The whole American day: 431 activity codes rolled to the survey's own second tier, 44 groups summing to exactly **1,440 minutes**, filed under the same five blocks the OECD charts use. 170,842 weighted diaries, 2003–2015. Plus a finer six-digit leisure split, because the television figure needs codes the tier-2 spine does not reach. |
| `atus-hours.js` | `time_use_atus/` | Share of the American population in each activity by clock hour, for the live coda. |

**Do not read the ATUS totals against the OECD bars.** The two surveys draw the boundaries
differently and neither is wrong: ATUS counts travel as its own activity where the OECD folds
it into whatever the travel was for, which is why "travel and the rest" is 1h31 in Chapter
Three against the OECD's 21 minutes for the United States. Both captions say so.

### Removed: three superseded files

`adl.json`, `day.json` and `day-data.js` were leftovers from the data shape that preceded
`adl-data.js`, and nothing in the repo referenced them — not one HTML, JS or Markdown file.
Deleted. Git history has them if that turns out to be wrong.

## Not in the repo

The largest raw files are `.gitignore`d — they are big, and re-downloadable from the URLs
above. `data/time_use_atus/`, `data/city_happiness/`, the World Bank GDP folder,
`population_projections_un.xlsx`, `WHR26_Data_Figure_2.1.xlsx`, `flights_routes.csv`,
`spice.csv` and the ResMed sleep-survey PDF are all excluded. The generated `.js` files above
are committed precisely so a clone runs without them.
