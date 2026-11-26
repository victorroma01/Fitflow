# Release notes in English

What the app shows when it is in English: the update notice, the “What's new” card after updating, and Settings → See
release notes. `build.py` reads this file next to [CHANGELOG.md](CHANGELOG.md), which is still the full history (in
Spanish, with the **Interno** section for development).

Each version here must say the same as its entry in `CHANGELOG.md`: the same headline (the lines that start with `> `),
the same sections in the same order (**What's new**, **Improvements**, **Fixes**) and the same number of items in each.
If it doesn't, or if the current version has no entry here, the build stops. Versions before 1.0.4, which had no English,
have no entry: the app shows them in Spanish.

## [1.0.4] — 2026-11-25

> App review and 3D model
>
> Exercises now have their own 3D figure, the library has been reviewed exercise by exercise, and the app is faster and
> more careful with your data.

### What's new
- 3D model: all 525 exercises in the library have a 3D figure that performs the whole exercise with its equipment, with
  the working muscles in red (primary) and orange (secondary). It stays still in lists, the day, the workout, and the
  exercise page; tap it and, in “How to do it,” it moves through the exercise (with “Reduce animations,” you get its still
  positions).
- Sign-in screen with a background image: a gym seen from above, in gray and in low light.
- New covers for CrossFit, Hyrox, and functional days and for their rest days; with the female profile, all of them.
- Languages: the app is now in English too. It follows your phone's language (English or Spanish), and you can change it
  anytime in Settings → Languages.
- New Legal notice and Privacy policy, also in English: you can read them without an account, from the sign-in screen, and
  in Settings. To create an account you need to accept the terms (being 16 or older) and the processing of your health data,
  with the full consent explained; with an account you already had, the app asks once when you open it.
- Your data, in Privacy: export a copy, write to us about privacy, withdraw consent, delete your data, and “Delete account,”
  which deletes the account and everything in it (also in Settings → Account). An account that goes unused for two years is
  deleted automatically.
- Equipment: at the end of each day's Overview, the equipment its exercises need, with their icons. Tap it to see the list
  with the name of each item.
- Redesigned exercise library: the groups come in cards with their illustration (the model with the primary muscle in red
  and the secondary in orange; for CrossFit, Hyrox, Functional, and Cardio, their equipment), their icon in the app's color,
  and how many exercises they have, with the color legend below. Quads are now called Quadriceps, and hamstrings and glutes, Hamstrings &
  glutes.

### Improvements
- Library reviewed: every exercise's muscles have been checked, and duplicates (the same exercise under another name) are
  gone. A plan or a saved workout that used one of them still shows it, with the figure and muscles of the one that remains.
- Hyrox distance exercises (sled, farmer's carry, burpee broad jumps) have their meters as the target.
- The button that saves the workout is called “Save workout” (it used to be “Log out”).
- Plain app background: black in the dark theme and very light gray in the light one. In Workout, the day card is taller
  and shows its photo between the name and the numbers, and the exercise library, custom workout, WOD timer, and cardio
  come in tiles, two per row, with their icon on top.
- Supersets, tri-sets, and circuits: each exercise's label says only which one it is and its place (“SUPERSET · 1/2”).
  Neither the label nor the exercise's line repeats the rest anymore (“10 s to the next one,” “Round rest”): it is on each
  set, in the “Rest” column.
- Workout: the “+ Drop set” button below the sets is gone. You still choose a drop set as the exercise's technique.
- “Delete all data” also deletes the sex in your profile and the automatic backups on the phone: what is deleted can't be
  recovered.
- Technical improvements and bug fixes. System and feature optimization.

### Fixes
- Progress chart: when you pick a point that is a record, “PR” appears next to the figure.
- Library: with a single exercise of your own, “My exercises” said “1 exercises.”
- A program's name (Programs and Profile) looks like the rest of the titles.
- Sign-in: the logo fills its frame.
- Workout: on a rest day you also see the week bar and, when it's time, the deload week notice (with “Skip”) and the
  suggestion to rotate exercises.
- On a small phone (320 px): Settings values that don't fit end in “…” (they used to be cut mid-letter), in My
  nutrition what scrolls underneath no longer shows through “Set manually,” and the first step of the tour no longer
  covers the day card.
