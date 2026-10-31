import time
import logging
from typing import Optional, Any
import redis
import fakeredis
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class CacheManager:
    def __init__(self):
        self.client: Optional[redis.Redis] = None
        self.is_connected = False
        self.is_fake = False
        self.hits = 0
        self.misses = 0
        self.total_latency_ms = 0.0
        self.op_count = 0
        self._init_client()

    def _init_client(self):
        try:
            real_client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
                socket_timeout=1.0,
                decode_responses=True
            )
            real_client.ping()
            self.client = real_client
            self.is_connected = True
            self.is_fake = False
            logger.info(f"[+] Connected to live Redis at {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.warning(f"[-] Live Redis unavailable ({e}). Falling back to in-process Redis compatible engine.")
            self.client = fakeredis.FakeRedis(decode_responses=True)
            self.is_connected = True
            self.is_fake = True

    def get(self, key: str) -> Optional[str]:
        t0 = time.perf_counter()
        try:
            val = self.client.get(key)
            latency = (time.perf_counter() - t0) * 1000
            self.total_latency_ms += latency
            self.op_count += 1
            if val is not None:
                self.hits += 1
            else:
                self.misses += 1
            return val
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            self.misses += 1
            return None

    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        t0 = time.perf_counter()
        try:
            res = self.client.set(key, value, ex=ex)
            latency = (time.perf_counter() - t0) * 1000
            self.total_latency_ms += latency
            self.op_count += 1
            return bool(res)
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False

    def delete(self, *keys: str) -> int:
        try:
            return self.client.delete(*keys)
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return 0

    def delete_pattern(self, pattern: str) -> int:
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis delete_pattern error: {e}")
            return 0

    def get_stats(self) -> dict:
        total = self.hits + self.misses
        hit_ratio = round((self.hits / total * 100), 2) if total > 0 else 0.0
        avg_latency = round((self.total_latency_ms / self.op_count), 3) if self.op_count > 0 else 0.0
        return {
            "status": "connected",
            "engine": "Live Redis Server" if not self.is_fake else "Embedded Redis Server (Dev/Offline)",
            "host": settings.REDIS_HOST if not self.is_fake else "localhost:in-memory",
            "hits": self.hits,
            "misses": self.misses,
            "total_requests": total,
            "hit_ratio_percent": hit_ratio,
            "avg_latency_ms": avg_latency,
            "keys_count": len(self.client.keys("*"))
        }

cache_manager = CacheManager()

def get_redis_client():
    return cache_manager.client

