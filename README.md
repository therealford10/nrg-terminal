# ARG Terminal Website

Retro OpenVMS/VAX-inspired ARG terminal.

## Requirements
- Node.js 18+ recommended

## Setup

1. Open a terminal in this folder.
2. Run:

   npm install

3. Copy `.env.example` to `.env`.
4. Put your private ARG password in `.env`:

   ARG_PASSWORD=your_real_password

5. Start:

   npm start

6. Open:

   http://localhost:3000

## Security

The ARG password is read from the server environment and is NOT included in
`public/index.html` or `public/terminal.js`.

Do not put `.env` into GitHub. `.gitignore` already excludes it.

This is suitable for an ARG gate, not for high-value authentication. For a
public production deployment, add HTTPS, rate limiting, secure session/cookie
handling, logging controls, and a proper database if needed.

## ARG customization

The server-side command responses are in `server.js`, inside the `responses`
object. You can turn them into your own clues, fake files, timestamps,
coordinates, ciphers, node names, etc.
