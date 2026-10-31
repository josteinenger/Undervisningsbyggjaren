# Skjermfyllande fontskalering for «Tekst» og «Bibelord»

Plan for å utnytte heile storskjermen optimalt («topp til tå, venstre til høgre») for blokkene «Tekst» og «Bibelord», med aggressiv fontskalering opp til 70 pt tak, jamn nedskalering ved lange tekstar utan nedre fysisk grense, og tydeleg advarsel i blokka på arbeidsbordet ved $\le$ 36 pt.

## User Review & Critical Decisions

> [!IMPORTANT]
> Vi har analysert skjermbiletet ditt med ættetavla i Matteus 1 (~635 teikn). Problemet var at den førre skalaen la seg alt for lågt (`text-2xl` / 26px / 24 pt), noko som etterlét over 75 % av storskjermen som svart tomrom.
> Vi rekalibrerer heile fontskalaen slik at ein tekst på 600 teikn fyller heile skjermen på ~50px (`xl:text-[3.15rem]` / 38–40 pt) med romsleg linjehøgd, og skalerer opp til 70 pt tak for kortare tekstar.

- **Storskjermutnytting**: Både i `FullPresenterModal` og i leiar-/publikumsvisning vil teksten strekkje seg utover heile skjermbreidda (`max-w-[94vw]` eller `max-w-7xl`) og utnytte heile den vertikale høgda med balansert sentrering (`text-wrap: balance` / `text-pretty`).
- **Skaleringsformel og tak**:
  - Øvre tak for korte tekstar (< 80 teikn): ~70 pt PowerPoint-ekvivalent (`text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[6.25rem]`).
  - Matteus 1-storleik (~500–750 teikn): ~38–40 pt (`text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[3.15rem]`), som fyller ca. 80 % av skjermhøgda og breidda.
  - Advarselsterskel på arbeidsbordet: Nøyaktig ved $\le$ 36 pt PowerPoint-ekvivalent (når teksten passerer ~750 teikn), kjem det eit gult varsel i blokka om at fonten no er under 36 pt på storskjerm.
  - Ingen nedre grense: Tekstar på 1500–2500+ teikn vert skalerte jamt vidare ned slik at alt innhald alltid får plass.

---

## 1. Overview & Core Concept

- **Problem i dag**: På store skjermar og projektorar framstod teksten som ei lita øy midt i eit hav av svart skjerm.
- **Løysing**: Dynamisk tilpassing av fontstorleikar, linjeavstand og marginsystem basert på teiknlengd og skjermflate, slik at teksten får den monumentale, lesbare tilstadeverelsen som krevst i ei kyrkje, leir eller storsal.

---

## 2. User Experience & Visual Design

- **På storskjerm (FullPresenterModal & RightPanel preview)**:
  - Teksten sentrerast vertikalt og horisontalt i eit romsleg format som nyttar heile synsfeltet.
  - Romslege avsnitt og naturlege linjebrot (`whitespace-pre-line`, `leading-snug` eller `leading-relaxed`).
  - Bibelord får kursivert hovudvers med sitatteikn og tydeleg, stilig referanse under (`— Matt 1, 1–17`).
- **På arbeidsbordet (BlockItem)**:
  - Teiknteljar og PowerPoint-ekvivalent indikator i sanntid for «Tekst» og «Bibelord» (t.d. `635 teikn • ~38 pt`).
  - Når estimert punktstorleik fell til eller under 36 pt, visast eit diskret og informativt varsel:
    * *«Tips: Fontstørrelsen på storskjerm kjem no ned i ca. [X] pt (under 36 pt). Vurder å dele opp teksten eller korte inn for optimal lesbarheit i storsal.»*

---

## 3. Key Product Decisions & Trade-Offs

- **Skaleringskategoriar (PowerPoint-ekvivalentar)**:
  1. **1–80 teikn (Tak: ~70 pt)**: `text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[6.25rem]` font-extrabold.
  2. **80–180 teikn (~60 pt)**: `text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-[5.25rem]` font-bold.
  3. **180–320 teikn (~52 pt)**: `text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[4.35rem]` font-bold.
  4. **320–500 teikn (~44 pt)**: `text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[3.65rem]` font-semibold.
  5. **500–750 teikn (~38–40 pt, eksempelet ditt)**: `text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[3.15rem]` font-medium.
  6. **750–1100 teikn (~32–34 pt -> VARSELAKTIVERT)**: `text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[2.5rem]` font-normal.
  7. **1100–1600 teikn (~26–28 pt)**: `text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-[2.0rem]` font-normal.
  8. **> 1600 teikn (< 24 pt)**: Dynamisk vidare nedskalering utan noko nedre botntak.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                   WorkDesk (Arbeidsbord)                    │
│                                                             │
│  BlockItem ('tekst' / 'bibelord')                           │
│   ├── calculateSlideTextScale(text)                         │
│   │    └── returns { estimatedPt, isUnderWarningThreshold } │
│   └── Live Badge & Varsel ved estimatedPt <= 36             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 FullPresenterModal / Skjerm                 │
│                                                             │
│  Container: w-full h-full flex flex-col justify-center      │
│   ├── Max-width: max-w-[94vw] el. max-w-7xl                 │
│   ├── Typography: scale.cssClass + scale.lineHeightClass     │
│   └── Resultat: Full utnytting av høgde og breidde          │
└─────────────────────────────────────────────────────────────┘
```
