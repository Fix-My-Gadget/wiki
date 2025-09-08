# AGENTS

This repository uses Node.js with Yarn.

## Workflow

- Use `yarn` for dependency management and for running scripts.
- Run `yarn test` before making changes to understand the current state and record any failures.
- After modifying files, run `yarn test` which runs ESLint, Pug Lint and Jest.
- Do not commit build artifacts or files in `node_modules` or other generated directories.

## Code Style

- JavaScript follows StandardJS conventions.
- Indentation is 2 spaces.
- Keep front-end Vue components consistent with existing patterns.

## Commit and PR Guidelines

- Commit messages should be short and written in the imperative mood.
- Each commit should contain a logically atomic change.
- Pull request descriptions should summarize changes and include test results.
