<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## /restart — Riavvio server di sviluppo

**Comando**: `/restart`
**Directory progetto**: `/Users/umbertomottola/Desktop/open code - ai act saas/aicomply`
**Comando da eseguire**: `npm run dev -- --webpack`
**Porta**: 3000

**Importante**: Usare `--webpack`. Turbopack crasha con "Next.js package not found" su Next.js 16.

Se bash tool dà errore `ENOENT posix_spawn '/bin/zsh'`:
- Il working directory del tool non esiste più
- Chiedere all'utente di aprire il Terminale e lanciare manualmente:
  ```bash
  cd ~/Desktop/open\ code\ -\ ai\ act\ saas/aicomply
  npm run dev -- --webpack
  ```
- Poi aprire http://localhost:3000
