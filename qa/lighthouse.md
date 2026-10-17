# Lighthouse (mobile emulation, default throttling), branch `immersive`

Run against a local static server (`node qa/serve.mjs`), not the Vercel edge: no CDN, no compression, so absolute numbers are indicative. The first pass ran two audits in parallel (CPU contention inflated TBT on a few pages); those pages were re-run alone and the re-run value is shown.

| Page | Performance | Accessibility | Best practices | SEO | LCP |
|---|---|---|---|---|---|
| home | 96 | 100 | 100 | 91 | 2.6 s |
| about-us | 98 | 100 | 100 | 100 | 1.7 s |
| Programming-Events | 99 | 100 | 100 | 100 | 1.7 s |
| MMNT-2-MMNT | 98 | 100 | 100 | 100 | 2.3 s |
| Sunset-Showcase | 97 | 100 | 100 | 100 | 2.4 s |
| Creative-Services | 96 | 100 | 100 | 100 | 1.7 s |
| Release-Rollout | 91 | 100 | 100 | 91 | 1.7 s |
| playlists | 97 | 100 | 100 | 100 | 2.1 s |
| Special-Inquiries | 99 | 100 | 100 | 100 | 1.7 s |
| Wellness-Resources | 94 | 100 | 100 | 100 | 2.6 s |
| Rewire-with-Rocky | 99 | 100 | 100 | 91 | 1.8 s |
| Show-Your-Support | 94 | 100 | 100 | 100 | 2.7 s |
| merch | 100 | 100 | 100 | 100 | 1.8 s |

SEO below 100 = Lighthouse `link-text` on the copy "HERE" (her wording) and a missing meta description on the home page (the live description is just "Cargo"). No accessibility audit failed (contrast, target size, names, alt, headings).
