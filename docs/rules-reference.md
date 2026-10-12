# Rules reference

The rules of *Source of the Nile* (Ross W. Maker and David A. Wesely, © 1978 Discovery Games) come from one place: the private repository **[egirard/SourceOfTheNileRulesReference](https://github.com/egirard/SourceOfTheNileRulesReference)**. It is the authority for every rules question in this project. When code, a test, a document, or a slice spec disagrees with it, the reference wins and the discrepancy is raised (see "Raising a discrepancy" below), never guessed at.

## Pin

| | |
|---|---|
| Repository | `egirard/SourceOfTheNileRulesReference` (private) |
| Branch | `main` |
| Commit | `6ee4718a64012e061e1b0f5d1491ebf9892fedaf` |
| Commit date | 2026-09-29T22:55:35-04:00 |
| Vendored on | 2026-10-11 |

Two files from that commit are vendored verbatim into [`docs/rules-reference/`](rules-reference/) so the project is self-contained and diffs against the upstream are mechanical:

| Vendored file | Upstream path | SHA-256 |
|---|---|---|
| [`source-of-the-nile-rules.md`](rules-reference/source-of-the-nile-rules.md) | `Source of the Nile/source-of-the-nile-rules.md` | `93f47cb68d9e40fc63f88637a7ec8372d6fb424a1b27cc4c5a111f9af7ad7a58` |
| [`source_of_the_nile_1978_deck.csv`](rules-reference/source_of_the_nile_1978_deck.csv) | `source_of_the_nile_1978_deck.csv` | `915ece03e735088916ffcfa99b869f031c07151af4ceddb16ac06ba99b7b2f1f` |

The PDFs, the board photograph, the card scans, and the phone photographs are **not** vendored. They are consulted in the upstream repository at the pinned commit. To move the pin: update the commit and date above, re-copy the two files, recompute the hashes, and record what changed in `docs/rules.md`.

## What the upstream contains

| Upstream file | What it is | Role |
|---|---|---|
| `Source of the Nile/source-of-the-nile-rules.md` | Transcription of the original 1978 rulebook (22 pages) as Markdown | **Primary authority** |
| `Source of the Nile/source-of-the-nile-rules.pdf` | The same rulebook as a 25-page typeset PDF | Consulted where the Markdown is garbled |
| `Source of the Nile/source-of-the-nile-modernized-rules.pdf` | A 12-page "Modernized Digital Typesetting & Reference Edition": a condensed restatement with tables and two flowcharts | Only where the original is silent |
| `Source of the Nile/source-of-the-nile-quickstart.pdf` | A 2-page quick-reference sheet | Illustrative only |
| `Source of the Nile/PXL_*.jpg` | 15 phone photographs of the physical components | Illustrative only |
| `source_of_the_nile_1978_deck.csv` (and `.xlsx`) | The 48 donation/disaster cards, one row each | **Sole authority for card data** |
| `source_of_the_nile_1978_cards.pdf` | Scans of the card faces the CSV was transcribed from | Consulted if a CSV row looks wrong |
| `source_of_the_nile_1978_map.jpg` | Photograph of the printed map board | **Sole authority for geography** |

## Precedence

When sources disagree, in this order:

1. `source-of-the-nile-rules.md` (the original rules, Markdown).
2. `source-of-the-nile-rules.pdf`, only where the Markdown transcription is garbled or ambiguous.
3. `source-of-the-nile-modernized-rules.pdf`, only where the original is silent.
4. The quickstart sheet and the photographs are illustrative and never decide a rule.

Independently of the above:

- `source_of_the_nile_1978_deck.csv` is the sole authority for card data: card numbers, disaster text, terrain context, donation values, free-ticket ports.
- `source_of_the_nile_1978_map.jpg` is the sole authority for geography: the hex grid, the pre-printed terrain, rivers, ports, the drainage numbers at river mouths, and the directional indicator.

The modernized rules and the quickstart sheet are derived restatements, not an official reprint (their colophon says they were generated for a photo portal). They occasionally add detail the original does not contain, for example a definition of "largest lake" by connected surface area, or "Horse: Cape Colony only". Such additions are **not** rules unless the original is silent on the point and the addition is recorded in `docs/rules.md` as a decision.

## Raising a discrepancy

A discrepancy is any of: the code or a test does something the reference does not say; two reference sources disagree; the reference is ambiguous in a way that changes what the player sees. Handle it like this:

1. Do not pick an interpretation silently.
2. Add it to the "Open rules questions" list in [`docs/rules.md`](rules.md) with an `RQ-n` number, the sources involved, and the smallest interpretation that lets the slice ship.
3. Implement that smallest interpretation, cite `RQ-n` in the unit test that pins it and in the commit message.
4. When the question is resolved by the maintainer, update `docs/rules.md`, the test, and (if the upstream was corrected) move the pin.

Known discrepancies found while vendoring are already listed in `docs/rules.md`.

## Respect for the source

The reference is used for **rules and data only**. Publisher artwork, the map's trade dress, card illustrations, and the rulebook's prose are not reproduced in the application. Terrain, rivers, ports and the hex grid are transcribed as data into a manifest and rendered with original iconography (see [`docs/assets.md`](assets.md)).
