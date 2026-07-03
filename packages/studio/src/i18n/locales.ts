/**
 * Studio UI dictionaries. English is the source of truth — its key set types
 * every other locale, so a missing translation is a compile error, not a
 * runtime hole. Add a locale by exporting a full `Record<I18nKey, string>`
 * and registering it in `LOCALES`.
 */

export const en = {
  // Header
  "header.storyboard": "Storyboard",
  "header.preview": "Preview",
  "header.studioView": "Studio view",
  "header.undo": "Undo",
  "header.redo": "Redo",
  "header.capture": "Capture",
  "header.captureCurrentFrame": "Capture current frame",
  "header.inspector": "Inspector",

  // Sidebar
  "sidebar.show": "Show sidebar",

  // Timeline
  "timeline.dropToImport": "Drop media files to import",
  "timeline.dropOrDescribe": "Drop media here or describe your video to start",
  "timeline.describeToStart": "Describe your video to start creating",
} as const;

export type I18nKey = keyof typeof en;

export const fr: Record<I18nKey, string> = {
  // Header
  "header.storyboard": "Storyboard",
  "header.preview": "Aperçu",
  "header.studioView": "Vue studio",
  "header.undo": "Annuler",
  "header.redo": "Rétablir",
  "header.capture": "Capturer",
  "header.captureCurrentFrame": "Capturer l'image actuelle",
  "header.inspector": "Inspecteur",

  // Sidebar
  "sidebar.show": "Afficher le panneau latéral",

  // Timeline
  "timeline.dropToImport": "Déposez des fichiers média pour les importer",
  "timeline.dropOrDescribe": "Déposez un média ici ou décrivez votre vidéo pour commencer",
  "timeline.describeToStart": "Décrivez votre vidéo pour commencer à créer",
};

export const LOCALES: Record<string, Record<I18nKey, string>> = { en, fr };
