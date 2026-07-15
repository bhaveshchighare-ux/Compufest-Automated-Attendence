import redis
import os
url = "redis://default:AYvp8hsH6338vToDg4RDWSzAb7YGnUBY@rabbit-courageous-talc-57770.db.redis.io:10765"
try:
    r = redis.Redis.from_url(url, socket_timeout=5)
    print(r.ping())
except Exception as e:
    print("Error:", e)

url_ssl = "rediss://default:AYvp8hsH6338vToDg4RDWSzAb7YGnUBY@rabbit-courageous-talc-57770.db.redis.io:10765"
try:
    r2 = redis.Redis.from_url(url_ssl, socket_timeout=5, ssl_cert_reqs=None)
    print("SSL:", r2.ping())
except Exception as e:
    print("Error SSL:", e)
