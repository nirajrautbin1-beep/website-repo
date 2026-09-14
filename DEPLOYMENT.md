# Admin Panel Deployment Fix

## K problem thiyo?

1. **Dual Authentication System**: Local server le session-based auth use garcha, Netlify le Bearer token-based auth use garcha
2. **File Upload Path Mismatch**: Local ma `/uploads/tools/`, Netlify ma `/api/blob?key=...`
3. **Missing Environment Variables**: Netlify ma ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET set garera huna parcha

## K fix gareko?

### 1. Admin.js Updated
- Login function le token ra session duitai handle garcha
- Token xa bhane localStorage ma store garcha (Netlify ko lagi)
- Token xaina bhane session use garcha (local server ko lagi)

### 2. Server.js Updated
- Base64 upload support added (Netlify jastai)
- JSON payload ra multipart duitai handle garcha

### 3. Tools Upload Function Enhanced
- Better error messages
- Proper authentication check
- Console error logging for debugging

## Netlify Deployment Steps

### Step 1: Environment Variables Set Garnu

Netlify dashboard ma janu:
1. Site Settings → Environment Variables
2. Yo variables add garnu:
   ```
   ADMIN_USERNAME=hacker.nrz
   ADMIN_PASSWORD=fockyou.326655
   SESSION_SECRET=your-secret-key-here-change-this
   ```

### Step 2: Netlify Blobs Enable Garnu

Netlify Blobs (@netlify/blobs) package file storage ko lagi use huncha:
1. Site ma janu → Integrations
2. Netlify Blobs enable garnu (free tier ma 1GB storage milcha)
3. Ya terminal bata: `netlify blobs:setup`

### Step 3: Deploy Garnu

```bash
# Build ra deploy
git add .
git commit -m "Fix admin panel authentication and file upload"
git push origin main

# Netlify automatically deploy garcha
```

### Step 4: Test Garnu

1. `https://nirajrautbin.netlify.app/admin.html` ma janu
2. Login credentials use garnu:
   - Username: `hacker.nrz`
   - Password: `fockyou.326655`
3. Login successful bhayepaxi editor dekhincha
4. Tool add garnu, photo ra ZIP upload test garnu
5. Save Changes click garnu
6. Public page refresh garera check garnu

## Local Testing

```bash
# Start local server
npm start

# Browser ma kholu
http://localhost:3001/admin.html

# Same credentials use garnu
```

## Troubleshooting

### Login kaam gardaina bhane:
- Browser console ma error check garnu (F12)
- Network tab ma `/api/login` request hernu - 401 xa bhane credentials wrong
- Netlify environment variables set xa ki check garnu

### Upload kaam gardaina bhane:
- Netlify Blobs enabled xa ki check garnu
- File size 10MB bhanda sano xa ki check garnu
- Network tab ma error message hernu

### Save gardaina bhane:
- `/api/site` endpoint ma 401 error xa bhane token expired - logout garera re-login garnu
- 500 error xa bhane Netlify function logs hernu

## Security Notes

1. `.env` file git ma commit nagara (already .gitignore ma xa)
2. Production ma strong password use garnu
3. SESSION_SECRET change garnu
4. HTTPS use garnu (Netlify automatically provide garcha)

## Next Steps

1. Netlify ma environment variables set gara
2. Netlify Blobs enable gara
3. Git push gara
4. Admin panel test gara
5. Issue bhaye console ra Network tab check gara
