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

| #   | Amélioration                                                                                              | Réf upstream | Effort  | Statut                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------- | ------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | **TTS pluggable** — interface provider + ElevenLabs, OpenAI TTS, Piper (voix locales). Voix FR/africaines | #337         | Moyen   | ✅ `hyperframes tts --provider heygen\|elevenlabs\|openai\|edgetts\|fishspeech\|piper\|kokoro` — fishspeech = clonage de voix (Fish Speech/OpenAudio, local ou RunPod) |
| 4   | **Fix rendu 60 fps** — le seek re-quantize à 30 fps (`canonicalFps` codé en dur)                          | #1737        | Moyen   | ✅ déjà corrigé upstream (PR #1739, hérité via fork)                                                                                                                   |
| 5   | **Fix inlining producer** — styles racine perdus dans les sous-compositions                               | #1847        | Moyen   | ✅ corrigé upstream via [#1886](https://github.com/heygen-com/hyperframes/pull/1886), synchronisé dans le fork (notre fix local retiré, PR #1896 superseded)           |
| 6   | **Stabilisation Studio** — triage et fixes des bugs Studio au fil de l'eau                                | (multiples)  | Continu | 🔜                                                                                                                                                                     |

### Ajouts hors roadmap initiale

| Amélioration                                                                                                                                                                                                                                                                                                                                                                                   | Statut |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **`hyperframes music`** — génération de musique originale par prompt d'ambiance : providers `lyria` (Google, temps réel, contrôle bpm/brightness/density/scale) et `musicgen` (Meta, 100 % local), résolution auto                                                                                                                                                                             | ✅     |
| **`hyperframes image`** — génération d'images par prompt : providers `zimage` (Z-Image-Turbo) et `qwenimage` (Qwen-Image), workers RunPod serverless. Code livré ; endpoints en sommeil (préemption GPU RunPod) — assets image produits via Higgsfield en attendant                                                                                                                            | 💤     |
| **`hyperframes video`** — clips vidéo AI par prompt : provider `wan` (Wan 2.2 TI2V-5B, 720p), worker RunPod serverless. Code livré ; endpoint en sommeil (même cause) — footage AI produit via Higgsfield en attendant                                                                                                                                                                         | 💤     |
| **Skill `/ad-spot`** — recette validée de spot pub vertical 26 s : plans IA réservés à l'humain/ambiance (jamais de texte d'écran généré — toujours illisible), panneaux HTML pour tout texte affiché, voix off neurale segmentée par scène, musique originale, légendes + carton CTA ; template complet + pipeline QC frame par frame. Éprouvée sur une série de 6 spots produits et diffusés | ✅     |

### Phase 3 — Chantiers lourds (mois)

| #   | Amélioration                                                                                    | Réf upstream | Effort | Statut                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------- | ------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | **`@hyperframes/validator`** — package de validation léger côté navigateur pour pipelines tiers | #1749 (RFC)  | Élevé  | ✅ déjà livré upstream (`@hyperframes/lint` v0.7.15 + entrée `/browser` v0.7.17, hérité via fork)                                                                                      |
| 8   | **Export vidéo côté navigateur** — rendu sans serveur ni FFmpeg via Mediabunny                  | #1661        | Élevé  | ⬆️ package `@hyperframes/browser-export` proposé upstream ([#1905](https://github.com/heygen-com/hyperframes/pull/1905)) + bouton « Export in browser » dans le Studio                 |
| 9   | **Parité GCP Cloud Run** — amener le rendu GCP au niveau du stack AWS Lambda                    | —            | Élevé  | ⬆️ progression mid-flight proposée upstream ([#1904](https://github.com/heygen-com/hyperframes/pull/1904)) ; `cloudrun policies` + harnais `--mode=cloudrun-local` livrés dans le fork |

Légende : 🔜 planifié · 🚧 en cours · ✅ livré · ⬆️ contribué upstream · 📋 backlog · 💤 livré mais en sommeil

## Politique de contribution upstream

- Les corrections de bugs et fonctionnalités **génériques** (fixes 60fps/inlining, TTS providers, i18n, blocs catalogue) sont proposées en PR à `heygen-com/hyperframes` — l'upstream accepte les contributions assistées par IA et n'exige pas de CLA (gouvernance BDFL HeyGen).
- Les développements **spécifiques LTC/WazeApp** (pipelines e-commerce, intégrations WhatsApp) restent dans ce fork ou dans des dépôts séparés consommant le SDK.
- Conformité Apache 2.0 : LICENSE et NOTICE conservés, modifications signalées, pas d'usage des marques HeyGen/HyperFrames pour désigner ce fork.
