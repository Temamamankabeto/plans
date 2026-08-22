/**
 * Passenger / cPanel entry point.
 *
 * cPanel's "Setup Node.js App" (Phusion Passenger) requires a plain
 * JavaScript file it can execute directly with `node`. It cannot run
 * npm scripts like `next start`. This file boots Next.js in production
 * mode and binds to the port Passenger assigns via process.env.PORT.
 *
 * Requires the project to have been built first:
 *   npm install   (cPanel: "Run NPM Install" — also triggers `next build`
 *                  via the postinstall script in package.json)
 */

const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
const hostname = "0.0.0.0";

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`> Next.js server ready on port ${port}`);
  });
}).catch((err) => {
  console.error("Failed to start Next.js server:", err);
  process.exit(1);
});
