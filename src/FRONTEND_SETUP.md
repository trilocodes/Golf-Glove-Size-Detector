# Holen Golf Frontend - Setup Instructions

## Quick Start

### 1. Create React App
```bash
npx create-react-app holen-golf-frontend
cd holen-golf-frontend
```

### 2. Replace Files
Copy the following files into your React project:

**Replace `src/App.jsx`** with the App.jsx provided
**Replace `src/App.css`** with the App.css provided

Your folder structure should look like:
```
holen-golf-frontend/
├── src/
│   ├── App.jsx (REPLACE with our version)
│   ├── App.css (REPLACE with our version)
│   ├── index.js (keep original)
│   └── ...
├── public/
├── package.json
└── ...
```

### 3. Create .env File
Create a file called `.env` in the root directory:

```bash
# .env
REACT_APP_API_URL=http://localhost:8080
```

When deploying to production, change this to your actual backend URL:
```bash
REACT_APP_API_URL=https://your-api-server.com
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start Development Server
```bash
npm start
```

The app opens at `http://localhost:3000`

---

## How to Test Locally

### Terminal 1: Start Backend
```bash
cd backend
go run main.go
```
Output:
```
✓ Database initialized
🏌️ Holen Golf API starting on :8080
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm start
```
Output:
```
Compiled successfully!
On Your Network:  http://localhost:3000
```

### Terminal 3 (Optional): Use ngrok to expose backend
```bash
ngrok http 8080
```
Get a URL like `https://abc123.ngrok.io`

Update `.env`:
```bash
REACT_APP_API_URL=https://abc123.ngrok.io
```

---

## Testing the App

1. **Open browser:** `http://localhost:3000`
2. **Click "Start Scanning"**
3. **Grant camera permission**
4. **Position your hand with golf ball on table**
5. **Tap "Ball Aligned" when ball fills the circle**
6. **Wait for measurement to appear**
7. **Tap "Capture" to lock measurement**
8. **Select your current glove size**
9. **Click "Submit"** → Check backend console for saved data

---

## How It Works (Technical)

### Stage Flow
1. **instruction** → User sees welcome screen
2. **measuring** → Camera captures hand
3. **result** → Shows measurement & form
4. **submit** → Data goes to backend

### Hand Detection
- Uses MediaPipe Hands (21 landmarks detected)
- Measures distance from landmark 0 (wrist) to landmark 12 (middle fingertip)
- Converts pixels to inches using golf ball calibration

### Golf Ball Calibration
```javascript
// Golf ball diameter = 1.68 inches (42.67mm)
handLengthInches = (handLengthPixels / ballDiameterPixels) × 1.68
```

### Size Recommendations (Holen's Chart)
```
< 6.5"       → "Please remeasure"
6.5 - 7.0"   → Small
7.0 - 7.25"  → Medium
7.25 - 7.5"  → Med/Large
7.5 - 8.0"   → Large
8.0 - 8.25"  → X-Large
> 8.25"      → "Please remeasure"
```

---

## Environment Variables

### Development
```bash
REACT_APP_API_URL=http://localhost:8080
```

### Production (GitHub Pages)
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

### Staging (ngrok tunnel)
```bash
REACT_APP_API_URL=https://abc123.ngrok.io
```

---

## Deploy to GitHub Pages

### 1. Update package.json
Add homepage:
```json
{
  "homepage": "https://yourusername.github.io/holen-golf-frontend",
  "name": "holen-golf-frontend",
  ...
}
```

### 2. Install gh-pages
```bash
npm install --save-dev gh-pages
```

### 3. Add deploy scripts to package.json
```json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

### 4. Deploy
```bash
npm run deploy
```

Your app lives at: `https://yourusername.github.io/holen-golf-frontend`

---

## Troubleshooting

### Camera won't load
- Check browser permissions (Chrome → Settings → Privacy → Camera)
- Try a different browser (Chrome, Safari, Edge)
- Check browser console for errors (F12)

### Hand not detected
- Improve lighting
- Get closer to camera
- Make sure hand is in frame
- Try different backgrounds

### Measurements not saving
- Check backend is running (`go run main.go`)
- Check `.env` file has correct API URL
- Check browser console for network errors
- Try `curl http://localhost:8080/health` to test backend

### API connection error
If you see "Connection error. Make sure the backend is running":
- Verify backend is started (`go run main.go`)
- Check API URL in `.env`
- If using ngrok, verify ngrok is running and URL is correct

---

## Features

✅ **Real-time hand detection** with MediaPipe
✅ **Circular guide** for golf ball calibration
✅ **Live measurements** displayed in real-time
✅ **Size recommendations** based on Holen's official sizing
✅ **Mobile-friendly** responsive design
✅ **Clean white + navy UI** with smooth animations
✅ **Error handling** with helpful messages
✅ **Data submission** to backend API
✅ **Loading states** and confirmations

---

## Browser Support

- ✅ Chrome/Chromium (recommended)
- ✅ Safari (iOS 15+)
- ✅ Firefox
- ✅ Edge

**Not supported:** IE11

---

## Performance Tips

1. **Use HTTPS** in production (ngrok provides this)
2. **Optimize image size** if you add any
3. **Use Chrome** for best performance
4. **Close other apps** if experiencing lag
5. **Good lighting** improves hand detection speed

---

## Next Steps

1. Test locally with `npm start`
2. Test with real customers
3. Collect measurements for 1-2 weeks
4. Train ML model (Week 4)
5. Deploy to production
6. Get feedback and iterate

---

## Questions?

Check the console (F12) for detailed error messages. Most issues are:
- Camera permissions
- API connection (backend not running)
- Hand positioning
- Lighting conditions

All fixable! 🚀
