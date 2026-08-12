export type IgdbInvolvedCompany = {
  developer?: boolean;
  company?: { name?: string };
};

export type IgdbGame = {
  id: number;
  name: string;
  first_release_date?: number | null;
  total_rating_count?: number | null;
  cover?: { image_id?: string } | null;
  involved_companies?: IgdbInvolvedCompany[] | null;
};

export type GameInsert = {
  id: number;
  name: string;
  released: string;
  background_image: string;
  developers: string;
  added: number;
};

export const BATCH_SIZE = 500;

const MAX_FETCH_ATTEMPTS = 5;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524]);
const TOKEN_REFRESH_BUFFER_MS = 60_000;

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function getIgdbCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET must be set");
  }

  return { clientId, clientSecret };
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt - TOKEN_REFRESH_BUFFER_MS) {
    return tokenCache.accessToken;
  }

  const { clientId, clientSecret } = getIgdbCredentials();
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    throw new Error(`IGDB auth error: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

async function igdbPost<T>(endpoint: string, body: string): Promise<T> {
  const { clientId } = getIgdbCredentials();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Client-ID": clientId,
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      lastError = new Error(`IGDB API error: ${response.status}`);
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_FETCH_ATTEMPTS) {
        break;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cause =
        error instanceof Error && error.cause instanceof Error
          ? ` (${error.cause.message})`
          : "";
      lastError = new Error(`IGDB API error: ${message}${cause}`);
      if (attempt === MAX_FETCH_ATTEMPTS) {
        break;
      }
    }

    console.warn(
      `IGDB API error: attempt ${attempt}/${MAX_FETCH_ATTEMPTS} failed, retrying...`,
    );
    await delay(1000 * 2 ** (attempt - 1));
  }

  throw new Error(
    `${lastError?.message ?? "IGDB API error"}. IGDB may be unavailable — try again later.`,
  );
}

function unixToDateString(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function coverUrl(imageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`;
}

function developerName(game: IgdbGame): string {
  const developer = game.involved_companies?.find(
    (company) => company.developer && company.company?.name,
  );
  return developer?.company?.name ?? "Unknown";
}

export function toGameInsert(game: IgdbGame): GameInsert | null {
  const imageId = game.cover?.image_id;
  if (!game.name || !game.first_release_date || !imageId) {
    return null;
  }

  return {
    id: game.id,
    name: game.name,
    released: unixToDateString(game.first_release_date),
    background_image: coverUrl(imageId),
    developers: developerName(game),
    added: typeof game.total_rating_count === "number" ? game.total_rating_count : 0,
  };
}

export async function fetchGamesBatch(offset: number): Promise<IgdbGame[]> {
  const body = [
    "fields name, first_release_date, total_rating_count, cover.image_id, involved_companies.developer, involved_companies.company.name;",
    "where cover != null & first_release_date != null & version_parent = null;",
    "sort total_rating_count desc;",
    `limit ${BATCH_SIZE};`,
    `offset ${offset};`,
  ].join(" ");

  return igdbPost<IgdbGame[]>("games", body);
}
