# GitHub Pages + Firebase (no paid plan required)

The website is static and hosted on GitHub Pages. Firebase Authentication handles email/password accounts, verification, and password resets. Cloud Firestore stores each verified learner's progress in `/progress/{uid}`. The repository and course content are public; account data is protected by `firestore.rules`.

## Firebase console

1. Create a project named **Computational Study Studio**. Keep the **Spark** plan, skip Google Analytics and Gemini, and do not attach billing.
2. Register a **Web app** named **Study Studio**. Copy its public configuration into `firebase-config.json` (apiKey, authDomain, projectId, appId). These web configuration values are designed for browser use; never add a service-account key or administrative credential.
3. Under **Authentication → Sign-in method**, enable **Email/Password**. Leave email-link/passwordless sign-in disabled.
4. Under **Authentication → Settings → Authorized domains**, add `hsbsidd.github.io`. The local preview, if needed, also requires `localhost`.
5. Create the default **Cloud Firestore Standard** database in **production mode**. Choose an appropriate region for your users.
6. In **Firestore → Rules**, paste the complete contents of `firestore.rules` and publish. Do not use open test-mode rules.
7. Under **Authentication → Templates**, optionally customize the sender display name to **Study Studio**. Firebase sends verification and password-reset emails without a separate SMTP account. Quotas apply.

## GitHub

The workflow in `.github/workflows/pages.yml` rebuilds the website and deploys `dist/` whenever `main` changes. Repository **Settings → Pages → Source** must be **GitHub Actions**.

Expected repository: `hsbsidd/computational-thinking-study-studio`.
Expected website: `https://hsbsidd.github.io/computational-thinking-study-studio/`.

No GitHub repository secret is required for browser Firebase configuration. Security comes from Firebase Authentication and the published database rules, not from hiding the public API key.

## Verify end to end

- Create an account using your real email, open the verification message, then click **I verified my email**.
- Complete one lecture and add a note. Wait for **All changes saved**.
- Sign in with the same account in another browser. Confirm the progress and note appear.
- Your partner signs up with their own email. Their account should start with zero progress and cannot read yours.
- Try **Forgot password?** and complete the reset using the email link.
- Guest visitors may browse the course but cannot save notes or progress.

Progress writes are debounced. An outdated browser is prevented from overwriting a newer saved revision: export that browser's draft and reload before continuing. No background sync is promised while offline. Keep the page open until saving finishes; export a backup if it reports a sync error.

## Free-tier limits

GitHub Pages is free for public repositories. Firebase Spark has no-cost quotas for email authentication and Firestore. Stay on Spark to avoid usage billing; operations may stop when a quota is reached. No paid Cloud Functions, Cloud Storage, or custom domain is required.

References: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Firebase pricing](https://firebase.google.com/pricing), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas).
