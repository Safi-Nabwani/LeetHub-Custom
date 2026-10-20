# LeetHub Custom

A personal project to make LeetCode practice more comfortable, keep a cleaner Git history, and learn how browser extensions work.

## Why I started this project

I started practicing my coding skills on LeetCode and discovered LeetHub, which automatically saves submissions to GitHub. It quickly became a useful part of my practice routine.

As I used it, I noticed that each accepted submission could generate more commits than I wanted, including updates to repository-wide metadata. I wanted my solution repository's history to focus on meaningful progress and make it easier to revisit the problems I had solved.

That inspired me to customize LeetHub with the help of AI and Codex. My goal is to keep the convenience of automatic uploads while reducing unnecessary commits—ideally, one meaningful commit per accepted problem, containing the solution and its useful supporting files.

## What I want to learn

This project is also an opportunity to explore how browser extensions work: how they recognize an accepted submission, prepare its files, and communicate with GitHub.

AI and Codex are helping me understand the code, explore changes, and build the project step by step. They have made the process more approachable and fun, while giving me a practical way to learn something new.

## Project status

LeetHub 2.0 source (version 2.0.10) has been imported, and the acceptance check is committed. The submission flow now prepares and publishes changed solution files, descriptions, notes, root README/topics, and stats in one commit. Identical repeats create no commit. Automated validation passes (72 tests and a successful build); this implementation is awaiting review and live browser verification.

## Repository structure

This repository contains the browser extension. Solved problems are uploaded to the separate GitHub repository selected in the extension.

| Location | Purpose |
|---|---|
| `scripts/leetcode/` | Submission detection, acceptance checks, problem files, and GitHub uploads |
| `scripts/background.js` | Background messages and submission navigation events |
| `scripts/authorize.js`, `scripts/oauth2.js` | GitHub sign-in |
| `scripts/welcome.js`, `welcome.html` | Repository selection and setup |
| `scripts/popup.js`, `popup.html` | Extension popup and progress display |
| `css/`, `assets/` | Styles and images |
| `manifest-chrome.json`, `manifest-firefox.json` | Browser permissions and extension entry points |
| `spec/` | Automated tests |
| `package.json`, `package-lock.json`, `webpack.config.js` | Development dependencies and build configuration |
| `dist/` | Generated browser builds; excluded from Git |
| `node_modules/` | Installed development dependencies; excluded from Git |

The uploader preserves the existing solutions repository layout and root README updates. It collects all applicable solution, description, notes, topic, and stats changes and publishes them together in one commit, preserving existing user content. It retries concurrent branch updates safely and checks uncertain publication outcomes before retrying. An existing solutions repository without `stats.json` needs its progress baseline restored before uploads; the extension does not silently reset its history of solved problems.

Progress is tracked in [LEETHUB_ROADMAP.md](LEETHUB_ROADMAP.md).

## Acknowledgments

This project is inspired by [LeetHub 2.0](https://github.com/arunbhardwaj/LeetHub-2.0). Thank you to its maintainers and contributors for building the extension that made this project possible.
