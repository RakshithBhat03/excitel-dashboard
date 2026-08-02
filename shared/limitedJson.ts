/** Read a JSON response without allowing an unbounded upstream body into memory. */
export async function readJsonWithLimit<TResult>(
  response: Response,
  maxBytes: number,
): Promise<TResult> {
  const contentLength = response.headers.get('content-length');
  const declaredLength = contentLength ? Number.parseInt(contentLength, 10) : NaN;
  if (Number.isSafeInteger(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Upstream response exceeded the configured size limit');
  }

  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) {
      throw new Error('Upstream response exceeded the configured size limit');
    }
    return JSON.parse(text) as TResult;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error('Upstream response exceeded the configured size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(bytes)) as TResult;
}
