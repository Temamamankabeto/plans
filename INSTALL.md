# Plan & Achievement System Starter

This project is a clean Next.js-only starter with API routes as the backend and direct MySQL access using `mysql2`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Query
- MySQL using `mysql2`
- JWT authentication
- Bcrypt password hashing
- SQL migrations and JavaScript seeders

## Local Setup

```bash
npm install
```

Create `.env` from `.env.example` and set your database credentials:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=plan_achievement
DB_USER=root
DB_PASSWORD=
JWT_SECRET=change-this-secret
```

Create database, migrate, and seed:

```bash
npm run db:setup
```

For a complete reset:

```bash
npm run db:fresh
```

Run the app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:3000/login
```

## Default Login

```text
Email: admin@plan.local
Password: password
```

## Add Future Migrations

Add SQL files in:

```text
database/migrations/
```

Example:

```text
002_create_new_table.sql
```

Then run:

```bash
npm run db:migrate
```

## Add Future Seeders

Add JavaScript or SQL seeders in:

```text
database/seeders/
```

Recommended JavaScript seeder format:

```js
module.exports = async function seed(connection) {
  await connection.execute("INSERT INTO ... VALUES (?)", [value]);
};
```

Then run:

```bash
npm run db:seed
```
