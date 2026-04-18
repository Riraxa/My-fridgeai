interface FetcherError extends Error {
  info?: unknown;
  status?: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: FetcherError = new Error("An error occurred while fetching the data.");
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  return res.json();
};
