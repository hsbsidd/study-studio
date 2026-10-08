# Computational Thinking — Study Studio

An independent companion for MIT OCW **18.S191, Fall 2020**: 26 lectures, 56 video links, 31 notebook links, 10 assignments, search, bookmarks, notes, and an adjustable study pace.

Hosted using **GitHub Pages**, with **Firebase email/password authentication** and private per-user progress in **Cloud Firestore**. See [SETUP.md](SETUP.md) for configuration, deployment, and end-to-end checks.

## Development

```sh
python3 build.py
npm test
python3 -m http.server 8765 --directory dist
```

Edit `template.html`, `styles.css`, and `app.js` for the interface; `cloud.js` contains authentication and cloud persistence. Public Firebase web configuration belongs in `firebase-config.json`. `sync-core.js` guards against stale-device writes and oversized notes. The build embeds the original source data from `source-data/` and copies required modules into `dist/`.

Progress is saved to the signed-in, verified account. Guest visitors can browse course resources. Videos and notebook links need internet; Julia code runs in Julia/Pluto on your computer, not in the website. The original downloaded course files outside this directory are unchanged.

## Attribution

Course by MIT OpenCourseWare. Instructors: Alan Edelman, David P. Sanders, Grant Sanderson, James Schloss, and Henri Drake.

Source: https://ocw.mit.edu/courses/18-s191-introduction-to-computational-thinking-fall-2020/

MIT OCW metadata identifies course materials as CC BY-NC-SA 4.0. The materials page separately identifies code as MIT-licensed and text as CC BY-SA 4.0. Original resources retain their respective licenses; adapted course content retains the applicable source license. The companion adds interface, self-assessment tools, study groupings, and partner discussion prompts. It is not an official MIT product and provides no official grading or certificates.
