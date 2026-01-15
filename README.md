This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment variables

This repo uses different `.env*` files depending on what you’re running:

- **Next.js dev/build/start**: Next.js loads `.env*` automatically.
	- Put local developer values in `.env.local`.
	- Do not commit secrets.

- **Jest (`pnpm test`, `pnpm test:ci`, etc.)**: Jest loads test env files via `dotenv` in `jest.setup.ts`.
	- Committed defaults: `.env.test`
	- Local overrides (git-ignored): `.env.test.local`

- **Bench (`pnpm bench`)**: the benchmark runner loads env via `dotenv`.
	- Local developer values: `.env.local`
	- Optional shared defaults: `.env`

### Committed templates

- `.env.example` is the template you can copy from.
- `.env.test` is committed so tests have a consistent baseline across machines.

### CI

CI should inject secrets and environment variables through the CI system (GitHub Actions / etc.), not via committed `.env.local` files.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
