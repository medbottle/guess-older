import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;
const RAWG_API_KEY = process.env.RAWG_API_KEY;
if (!RAWG_API_KEY) {
  throw new Error('RAWG_API_KEY not set.');
}
const distPath = path.join(__dirname, '..', 'dist');
const isProduction = fs.existsSync(distPath);

app.use(cors());
app.use(express.json());

type RawgGame = {
  id: number;
  name: string;
  released: string | null;
  tba: boolean;
  background_image: string | null;
};

type Game = {
  id: number;
  name: string;
  released: string;
  background_image: string;
};

function isValidGame(game: RawgGame, excludeIds: Set<number>): game is Game {
  return (
    !excludeIds.has(game.id) &&
    Boolean(game.released) &&
    !game.tba &&
    Boolean(game.background_image)
  );
}

const MIN_OBSCURE_PAGE = 15;
const MAX_OBSCURE_PAGE = 250;

async function fetchGamesPage(page: number): Promise<{ results: RawgGame[]; count: number }> {
  const url = new URL('https://api.rawg.io/api/games');
  url.searchParams.set('key', RAWG_API_KEY!);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', '40');
  url.searchParams.set('ordering', '-added');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`RAWG API error: ${response.status}`);
  }

  return response.json() as Promise<{ results: RawgGame[]; count: number }>;
}

function pickObscurePage(totalPages: number): number {
  if (totalPages <= MIN_OBSCURE_PAGE) {
    return Math.floor(Math.random() * totalPages) + 1;
  }

  const maxPage = Math.min(totalPages, MAX_OBSCURE_PAGE);
  return MIN_OBSCURE_PAGE + Math.floor(Math.random() * (maxPage - MIN_OBSCURE_PAGE + 1));
}

async function getRandomGame(excludeIds: number[]): Promise<Game> {
  if (!RAWG_API_KEY) {
    throw new Error('RAWG_API_KEY is not configured');
  }

  const exclude = new Set(excludeIds);
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const firstPage = await fetchGamesPage(1);
    const totalPages = Math.max(1, Math.ceil(firstPage.count / 40));
    const randomPage = pickObscurePage(totalPages);
    const pageData = randomPage === 1 ? firstPage : await fetchGamesPage(randomPage);
    const validGames = pageData.results.filter((game) => isValidGame(game, exclude));

    if (validGames.length > 0) {
      return validGames[Math.floor(Math.random() * validGames.length)];
    }
  }

  throw new Error('Could not find a valid random game');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, hasApiKey: Boolean(RAWG_API_KEY) });
});

app.get('/api/games/random', async (req, res) => {
  try {
    const excludeParam = req.query.exclude;
    const excludeIds =
      typeof excludeParam === 'string'
        ? excludeParam
            .split(',')
            .map(Number)
            .filter((id) => !Number.isNaN(id))
        : [];

    const game = await getRandomGame(excludeIds);
    res.json(game);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

if (isProduction) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!RAWG_API_KEY) {
    console.warn('Warning: RAWG_API_KEY is not set');
  }
});
