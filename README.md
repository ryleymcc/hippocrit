# Hippocrit

Prototype CMMS scaffold built with Next.js, Prisma and PostgreSQL. It implements a basic Work Order API and a mobile-friendly quick create page.

See [VISION.md](./VISION.md) for the full product vision and roadmap.

## Getting Started

### With Docker

```bash
docker compose up
```

### Without Docker

```bash
npm install
npm run dev
```

Then open [http://localhost:3000/quick-wo](http://localhost:3000/quick-wo) to create a work order.

### In GitHub Codespaces

Launch a new Codespace for this repository. The dev container starts Postgres and installs dependencies automatically.

```
npm run dev
```

Forward port 3000 and open `quick-wo` to create a work order.
