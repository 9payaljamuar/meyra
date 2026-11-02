// Local / Docker entry point. On Vercel, /api/index.ts imports the app instead.
import app, {serveWeb} from './app.js';
import {migrate} from './db.js';

const PORT = Number(process.env.PORT ?? 4000);
await migrate();
app.listen(PORT, '0.0.0.0', () => console.log(`Meyra API on http://localhost:${PORT}${serveWeb ? ' (serving web panel)' : ''}`));
