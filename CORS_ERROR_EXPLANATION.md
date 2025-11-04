# CORS Error Explanation

## What is CORS?

**CORS** (Cross-Origin Resource Sharing) is a browser security feature that restricts web pages from making requests to a different domain, port, or protocol than the one serving the web page.

## The Error You Saw

```
Access to fetch at 'http://localhost:8000/backend/routes/login.php' 
from origin 'http://localhost:8082' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## What This Means

1. **Your frontend** is running on `http://localhost:8082`
2. **Your backend** is running on `http://localhost:8000`
3. These are **different origins** (different ports), so CORS applies
4. The browser sends a **preflight OPTIONS request** before the actual request
5. The backend must respond with proper CORS headers to allow the request

## The Fix

I've updated the backend router (`backend/router.php`) to:
1. Set CORS headers on **all requests** (including preflight)
2. Handle **OPTIONS requests** immediately (preflight)
3. Allow requests from any origin (`Access-Control-Allow-Origin: *`)

## How It Works Now

1. Browser sends OPTIONS request (preflight)
2. Router responds with CORS headers and 204 status
3. Browser sends actual POST/GET request
4. Router routes to appropriate PHP file
5. PHP file includes `headers.php` which sets CORS headers again (redundant but safe)
6. Request succeeds!

## Testing

Try refreshing your browser now. The CORS error should be resolved!

## Security Note

The current setup uses `Access-Control-Allow-Origin: *` which allows requests from any origin. For production, you should restrict this to your specific frontend domain:

```php
header('Access-Control-Allow-Origin: http://localhost:8082');
```

Or use environment variables to configure it per environment.

