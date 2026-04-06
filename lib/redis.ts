export async function getRedis() {
  if (!process.env.REDIS_URL) return null
  const { default: Redis } = await import('ioredis')
  return new Redis(process.env.REDIS_URL)
}
