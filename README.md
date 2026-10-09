# Study Studio

A static MIT OpenCourseWare course library for two verified learners. Hosted on GitHub Pages; Firebase Authentication handles sign-in and Cloud Firestore stores course definitions, independent catalogues, and private progress.

## Use it

- **My courses** lists your own catalogue and overall completion.
- **Add course** accepts a modern MIT OCW download ZIP or extracted folder containing `data.json`. Preview the detected sessions before saving.
- **Partner’s courses** shows the other account’s courses and numerical completion summaries. **Add to my courses** starts an independent copy with empty progress and notes. Adding an existing course keeps your progress.
- Each course has a study journey, linked videos/readings, assignments, private notebook, pace settings, and per-course backup/export.

Packages are parsed in the browser. Only metadata and online links are saved; original PDFs, videos, and ZIPs are not uploaded. The ZIP parser runs in a worker with size limits and a timeout. Unsupported packages produce an error without adding a course. The two supplied packages are included on the starter shelf; neither is automatically enrolled.

## Build and test

```sh
npm ci
npm test
python3 build.py
npm run test:rules
```

Rules tests need Java 21 and start the official Firebase Firestore emulator using a disposable `demo-study-studio` project. GitHub Actions runs the unit/import tests and emulator permission tests. The browser uses vendored fflate 0.8.3 and Firebase SDK 12.19.0; no bundler is required.

Serve `dist/` using HTTP for local preview. `build.py` builds the original computational-thinking course from `source-data/`, copies assets, and generates the starter-course manifest. The imported Algorithms and Mathematics definitions are in `courses/`; their unmodified package metadata is kept in `tests/fixtures/` for regression tests.

## Data boundaries

- `studio/settings`: administrator-configured pair of allowed email addresses; no client writes.
- `courseDefinitions/{courseId}`: immutable OCW course metadata, readable by the pair.
- `catalogues/{uid}/courses/{courseId}`: partner-readable numerical summaries, never notes.
- `learners/{uid}/progress/{courseId}`: owner-only notes, checklists, bookmarks, and preferences.
- `profiles/{uid}`: pair-readable display identity.
- `progress/{uid}`: original owner-only progress retained for migration and recovery.

The first verified sign-in migrates existing computational-thinking progress into its course entry without deleting the old document. Progress and the partner-visible summary save atomically. Revision checks reject a stale device overwrite. Export its draft before reloading when a conflict occurs.

See [SETUP.md](SETUP.md) for Firebase configuration and release checks. The database region has not been changed in this feature.

MIT OCW content retains its original licences and attribution. This is an independent study companion, not an official MIT product. It does not grade assignments or award certificates. fflate is MIT-licensed; its licence is in `vendor/fflate-LICENSE`.
