# Contributing

## Before you push

```bash
# Confirm data file still parses
npm run validate:data

# Run tests against Chromium (fast)
npm run test:e2e:chromium
```

Full browser matrix (`npm run test:e2e`) is optional for local work but required to pass CI.

## Hard rules

- **No production dependencies.** `package.json` must stay `"dependencies": {}`. Add only to `devDependencies`.
- **No build step.** The app is served as-is from `mortar_core/`. Do not introduce Webpack, Vite, Babel, or a transpilation step.
- **Vanilla ES6 modules only.** No TypeScript, JSX, or compile-to-JS syntax.
- **Weapon data lives in JSON.** Never hardcode a weapon ID, name, or ballistic value in `.js` or `.html`.
- **DOM is the source of truth.** Do not add a state management library.

## Common tasks with runbooks

- [Adding a weapon system](ADDING_A_WEAPON.md)
- [Adding a test](ADDING_A_TEST.md)

## Branch naming

`feature/<short-description>` or `fix/<short-description>`. PRs target `main`.
