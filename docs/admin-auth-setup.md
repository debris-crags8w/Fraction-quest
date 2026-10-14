# Admin dashboard sign-in setup

The admin page is at `/api/admin` when the API server is running a build that includes the admin dashboard. It is not linked from the learner app.

## One-time setup

1. Generate two separate random values in a private shell. Do not run this command in a workflow log, paste the output into chat, or commit the output:

   ```sh
   node -e 'const c=require("node:crypto"),a="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let n=0,v=0,s="";for(const b of c.randomBytes(20)){v=v*256+b;n+=8;while(n>=5){const p=2**(n-5);s+=a[Math.floor(v/p)%32];v%=p;n-=5}}if(n)s+=a[v*2**(5-n)];console.log("ADMIN_TOKEN="+c.randomBytes(32).toString("base64url"));console.log("ADMIN_TOTP_SECRET="+s)'
   ```

2. In Replit **Tools → Secrets**, add the printed values separately:
   - `ADMIN_TOKEN`: the long random token (43 characters from this command).
   - `ADMIN_TOTP_SECRET`: the base32 authenticator key (32 characters).
3. Enroll your authenticator app manually using the `ADMIN_TOTP_SECRET` value. Choose **time-based**, **SHA1**, **6 digits**, and a **30-second period**. The authenticator displays a new code every 30 seconds. The server accepts a small clock-drift window but will not accept a code twice.
4. Restart the **API Server** workflow so it reads the new secrets.
5. Open `/api/admin`, enter `ADMIN_TOKEN` and the current six-digit authenticator code. The page never displays the configured secret values.

## If sign-in fails

- A hidden page or 404 usually means `ADMIN_TOKEN` is missing, the TOTP secret is missing or invalid, or `ADMIN_ALLOWED_IPS` excludes your current IP.
- A 401 means the token or current authenticator code did not match. Check the device clock and enter a fresh code.
- A 429 means the login rate limit was reached; wait before retrying.

The dashboard uses one server-side TOTP secret, so anyone authorized to administer it must enroll the same authenticator key. Keep it private and only share it with trusted administrators.
