# Computational Thinking — Study Studio

A self-contained study companion for the downloaded MIT OCW 18.S191, Fall 2020 course. Original downloaded files are untouched.

## Use

Open `dist/study-studio.html` in a modern browser. Send the same file to your partner; it includes all interface code and course metadata. Neither person needs to install website dependencies. Videos and original notebooks require internet. Julia code runs separately in Julia/Pluto, not in this website.

Start with **Getting started**, then **Course journey**. Check off resources, write notes, and explicitly mark lectures complete. Assignments have their own progress selector. Overall completion equally weights 26 lectures and 10 completed assignments; setup and resource checkboxes are separate.

Progress is independent for each browser/device and stored using localStorage. Keep the file in a stable location, use the same browser, and regularly export a JSON backup from **Settings & backups**. Browser storage may be unavailable for local files in some browsers. Import a backup when moving to another browser/device or between the local and hosted copies. Import replaces existing progress after confirmation. Markdown notes export is also available. No account, telemetry, or server data storage is part of the application.

The hosted Sites copy is private to its owner by default. For your partner, share `dist/study-studio.html`; opening the file does not require access to the owner's hosted site.

## Edit and rebuild

Edit `template.html`, `styles.css`, and `app.js`. The four original page metadata files are preserved in `source-data/` for reproducible extraction. Run:

```sh
python3 build.py
node --check app.js
```

Build output: `dist/index.html` and the identical downloadable `dist/study-studio.html`. Optionally preview with `python3 -m http.server 8765 --directory dist`, then visit `http://localhost:8765`.

## Attribution

Course by MIT OpenCourseWare. Instructors: Alan Edelman, David P. Sanders, Grant Sanderson, James Schloss, and Henri Drake.

Source: https://ocw.mit.edu/courses/18-s191-introduction-to-computational-thinking-fall-2020/

MIT OCW metadata identifies course materials as CC BY-NC-SA 4.0. The materials page separately identifies code as MIT-licensed and text as CC BY-SA 4.0. Original resources retain their respective licenses; adapted course content retains the applicable source license. The companion adds interface, self-assessment tools, study groupings, and partner discussion prompts. It is not an official MIT product and provides no official grading or certificates.

## Verification

Checked JavaScript syntax, extraction counts (26 sessions, 56 videos, 31 notebooks, 10 assignments), browser navigation/search/bookmarks, completion totals, notes and progress persistence across reload, and desktop/mobile layout. External resources preserve source links; availability and successful execution of every 2020 notebook are not guaranteed.
