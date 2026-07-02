# React + Vite


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Admin API configuration

Image uploads and profile edits call `api/admin-update-profile.js` from the browser. For local or non-default hosting setups, you can point those requests at a host that serves the repo's `/api` routes:

```env
VITE_ADMIN_API_BASE_URL=http://localhost:3000
```

If `VITE_ADMIN_API_BASE_URL` is not set, the app falls back to same-origin `/api`. That means local image/profile writes must run behind a host such as `vercel dev`, or another origin that serves the repo's API functions.
