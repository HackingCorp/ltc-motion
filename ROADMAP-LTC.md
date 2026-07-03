# Roadmap LTC Motion

Fork de [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) (Apache 2.0) maintenu par [HackingCorp](https://github.com/HackingCorp) / LTC Group.

**Stratégie :** rester synchronisé avec l'upstream (workflow [`upstream-watch`](.github/workflows/upstream-watch.yml) : PR de sync quotidienne + issue à chaque release upstream), développer nos améliorations ici, et proposer en PR upstream celles qui sont génériques.

## Améliorations prévues

### Phase 1 — Quick wins (jours)

| #   | Amélioration                                                                                                            | Réf upstream              | Effort       | Statut                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------ | -------------------------------------------------- |
| 1   | **Templates catalogue 9:16** — blocs verticaux e-commerce (visuel produit, prix, CTA WhatsApp) pour Status/Reels/TikTok | label `component-request` | Faible       | ✅ `product-promo-vertical`, `whatsapp-cta`        |
| 2   | **i18n Studio + locale FR** — infrastructure de localisation du Studio et traduction française                          | #1766                     | Faible-moyen | 🚧 infra + FR sur le chrome principal (`?lang=fr`) |

### Phase 2 — Contributions ciblées (semaines)

| #   | Amélioration                                                                                              | Réf upstream | Effort  | Statut                                                                      |
| --- | --------------------------------------------------------------------------------------------------------- | ------------ | ------- | --------------------------------------------------------------------------- |
| 3   | **TTS pluggable** — interface provider + ElevenLabs, OpenAI TTS, Piper (voix locales). Voix FR/africaines | #337         | Moyen   | ✅ `hyperframes tts --provider heygen\|elevenlabs\|openai\|piper\|kokoro`   |
| 4   | **Fix rendu 60 fps** — le seek re-quantize à 30 fps (`canonicalFps` codé en dur)                          | #1737        | Moyen   | ✅ déjà corrigé upstream (PR #1739, hérité via fork)                        |
| 5   | **Fix inlining producer** — styles racine perdus dans les sous-compositions                               | #1847        | Moyen   | ⬆️ PR upstream [#1896](https://github.com/heygen-com/hyperframes/pull/1896) |
| 6   | **Stabilisation Studio** — triage et fixes des bugs Studio au fil de l'eau                                | (multiples)  | Continu | 🔜                                                                          |

### Phase 3 — Chantiers lourds (mois)

| #   | Amélioration                                                                                    | Réf upstream | Effort | Statut                                                                                            |
| --- | ----------------------------------------------------------------------------------------------- | ------------ | ------ | ------------------------------------------------------------------------------------------------- |
| 7   | **`@hyperframes/validator`** — package de validation léger côté navigateur pour pipelines tiers | #1749 (RFC)  | Élevé  | ✅ déjà livré upstream (`@hyperframes/lint` v0.7.15 + entrée `/browser` v0.7.17, hérité via fork) |
| 8   | **Export vidéo côté navigateur** — rendu sans serveur ni FFmpeg via Mediabunny                  | #1661        | Élevé  | ✅ package `@hyperframes/browser-export` + bouton « Export in browser » dans le Studio            |
| 9   | **Parité GCP Cloud Run** — amener le rendu GCP au niveau du stack AWS Lambda                    | —            | Élevé  | 📋                                                                                                |

Légende : 🔜 planifié · 🚧 en cours · ✅ livré · ⬆️ contribué upstream · 📋 backlog

## Politique de contribution upstream

- Les corrections de bugs et fonctionnalités **génériques** (fixes 60fps/inlining, TTS providers, i18n, blocs catalogue) sont proposées en PR à `heygen-com/hyperframes` — l'upstream accepte les contributions assistées par IA et n'exige pas de CLA (gouvernance BDFL HeyGen).
- Les développements **spécifiques LTC/WazeApp** (pipelines e-commerce, intégrations WhatsApp) restent dans ce fork ou dans des dépôts séparés consommant le SDK.
- Conformité Apache 2.0 : LICENSE et NOTICE conservés, modifications signalées, pas d'usage des marques HeyGen/HyperFrames pour désigner ce fork.
