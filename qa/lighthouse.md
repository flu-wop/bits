# Lighthouse (mobile emulation, default throttling), branch `cleaned-up`

Run against a local static server (`node qa/serve.mjs`), not the Vercel edge: no CDN, no compression, so absolute numbers are indicative. The first pass ran two audits in parallel (CPU contention inflated TBT on a few pages); those pages were re-run alone and the re-run value is shown.

| Page | Performance | Accessibility | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| home | 97 | 100 | 100 | 91 | 2.4 s |
| about-us | 100 | 100 | 100 | 100 | 1.5 s |
| Programming-Events | 98 | 100 | 100 | 100 | 1.5 s |
| MMNT-2-MMNT | 100 | 100 | 100 | 100 | 1.7 s |
| Sunset-Showcase | 99 | 100 | 100 | 100 | 2.3 s |
| Creative-Services | 100 | 100 | 100 | 100 | 1.5 s |
| Release-Rollout | 100 | 100 | 100 | 91 | 1.5 s |
| playlists | 98 | 100 | 100 | 100 | 1.6 s |
| Special-Inquiries | 100 | 100 | 100 | 100 | 1.5 s |
| Wellness-Resources | 95 | 100 | 100 | 100 | 2.4 s |
| Rewire-with-Rocky | 100 | 100 | 100 | 91 | 1.5 s |
| Show-Your-Support | 95 | 100 | 100 | 100 | 2.4 s |
| merch | 99 | 100 | 100 | 100 | 2.0 s |

SEO below 100 = Lighthouse `link-text` on the copy "HERE" (her wording) and a missing meta description on the home page (the live description is just "Cargo"). No accessibility audit failed (contrast, target size, names, alt, headings).
