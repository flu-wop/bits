# Quick Deployment Guide for macOS 11.7 (Big Sur)

## Prerequisites

1. **Node.js & npm** (Optional but recommended)
   - Download from: https://nodejs.org/
   - Choose LTS version compatible with macOS 11.7
   - After installation, verify: `node --version` and `npm --version`

2. **Git** (Required for Vercel CLI)
   - macOS usually has Git pre-installed
   - Verify: `git --version`
   - If not installed: `xcode-select --install`

## Deployment Options

### Option 1: Vercel CLI (Fastest)

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Navigate to project**
```bash
cd path/to/breaks-in-the-simulation
```

**Step 3: Initialize Git (if not done)**
```bash
git init
git add .
git commit -m "Initial commit"
```

**Step 4: Deploy**
```bash
vercel
```

Follow the prompts:
- "Set up and deploy"? → Yes
- "Which scope"? → Your account
- "Link to existing project"? → No
- "What's your project's name"? → breaks-in-the-simulation
- "In which directory is your code located"? → ./
- "Want to override settings"? → No

Your site will be live at: `https://breaks-in-the-simulation.vercel.app`

**Step 5: Add custom domain (optional)**
```bash
vercel domains add breaksinthesimulation.com
```

### Option 2: GitHub + Vercel Dashboard

**Step 1: Create GitHub Repository**
1. Go to https://github.com/new
2. Name: "breaks-in-the-simulation"
3. Don't initialize with README (we have one)
4. Click "Create repository"

**Step 2: Push to GitHub**
```bash
cd path/to/breaks-in-the-simulation
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/breaks-in-the-simulation.git
git push -u origin main
```

**Step 3: Deploy on Vercel**
1. Go to https://vercel.com/signup
2. Sign up with GitHub
3. Click "New Project"
4. Import "breaks-in-the-simulation" repository
5. Click "Deploy"

Done! Your site is live.

### Option 3: Netlify (Alternative)

**Step 1: Via Drag & Drop**
1. Go to https://app.netlify.com/drop
2. Drag the entire project folder
3. Site is live instantly

**Step 2: Via Git (recommended for updates)**
1. Push to GitHub (see Option 2, Step 2)
2. Go to https://app.netlify.com
3. Click "New site from Git"
4. Choose GitHub → Select repository
5. Click "Deploy site"

## Pre-Deployment Checklist

Before deploying, make sure to:

- [ ] Update Formspree form ID in `index.html`
- [ ] Replace logo.svg with your actual logo
- [ ] Update email address in contact section
- [ ] Test all links work correctly
- [ ] Verify forms submit properly
- [ ] Check mobile responsiveness
- [ ] Test in Safari (primary browser on Mac)

## After Deployment

1. **Test the live site**
   - Check all navigation links
   - Submit a test email form
   - Test on mobile device
   - Verify social media links

2. **Set up custom domain**
   - In Vercel: Settings → Domains
   - Add your domain
   - Update DNS records at your registrar

3. **Configure SSL**
   - Automatically handled by Vercel/Netlify
   - May take 10-15 minutes to provision

4. **Set up analytics (optional)**
   - Vercel Analytics (built-in)
   - Google Analytics
   - Plausible Analytics (privacy-focused)

## Updating the Site

**Via Vercel CLI:**
```bash
cd path/to/breaks-in-the-simulation
# Make your changes
git add .
git commit -m "Update content"
vercel --prod
```

**Via Git (if connected to GitHub):**
```bash
# Make your changes
git add .
git commit -m "Update content"
git push
# Vercel/Netlify auto-deploys
```

## Troubleshooting

**"Command not found: vercel"**
- Ensure npm is installed: `npm --version`
- Reinstall Vercel CLI: `npm install -g vercel`
- Restart Terminal

**"Permission denied" when installing globally**
- Use sudo: `sudo npm install -g vercel`
- Or configure npm: https://docs.npmjs.com/resolving-eacces-permissions-errors

**Forms not working**
- Update Formspree endpoint in HTML
- Check browser console for errors
- Test form action URL directly

**Site not updating**
- Clear browser cache (Cmd + Shift + R)
- Wait 60 seconds for CDN propagation
- Check deployment logs in Vercel dashboard

## Resources

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Formspree: https://formspree.io/docs
- Git Guide: https://rogerdudler.github.io/git-guide

## Support

Questions? Email: hello@breaksinthesimulation.com

---

Good luck with your launch! 🚀
