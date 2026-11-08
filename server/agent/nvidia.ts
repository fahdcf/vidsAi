/** Resolve only the task-compatible, explicitly configured NVIDIA route. */
export function nvidiaProviders(): string[][] {
  const ids = [process.env.NVIDIA_ROUTE_AGENT_COMPLEX_PRIMARY,
    ...(process.env.NVIDIA_ROUTE_AGENT_COMPLEX_FALLBACKS || '').split(',')]
    .map(x => x?.trim()).filter((x): x is string => Boolean(x));
  return [...new Set(ids)].slice(0, 6).flatMap(id => {
    const entry = Object.entries(process.env).find(([name, value]) =>
      name.startsWith('NVIDIA_') && name.endsWith('_MODEL_ID') && value === id);
    if (!entry) return [];
    const prefix = entry[0].slice(0, -'_MODEL_ID'.length);
    const key = process.env[`${prefix}_API_KEY`] || process.env.NVIDIA_API_KEY;
    return key ? [[(process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, ''), key, id]] : [];
  });
}
