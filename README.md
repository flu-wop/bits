# Breaks In The Simulation - Website

A minimal, artist-centered website focused on wellness support and creative services for the music industry.

## 🎯 Overview

This is a complete static website revamp built with vanilla HTML, CSS, and JavaScript. The design maintains a minimal, Cargo.site-inspired aesthetic with:

- Clean, text-centric layout
- Generous spacing and typography
- Subtle interactivity
- Mobile-responsive design
- SEO optimization
- Fast performance

## 📁 Project Structure

```
breaks-in-the-simulation/
├── index.html          # Main single-page site
├── css/
│   └── styles.css      # All styles (minimal, Cargo-inspired)
├── js/
│   └── main.js         # Smooth scroll, form handling, interactions
├── images/
│   └── logo.png        # Logo (add your own)
├── vercel.json         # Vercel deployment configuration
└── README.md           # This file
```

## 🚀 Quick Start

### Local Development

1. Clone or download this repository
2. Open `index.html` in your browser
3. For live reload during development, use a simple server:

```bash
# Using Python (macOS/Linux)
python -m SimpleHTTPServer 8000
# or Python 3
python3 -m http.server 8000

# Using Node.js
npx serve

# Using VS Code
# Install "Live Server" extension and click "Go Live"
```

Then visit `http://localhost:8000`

### Deploying to Vercel

#### Option 1: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Navigate to project directory:
```bash
cd breaks-in-the-simulation
```

3. Initialize Git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

4. Deploy:
```bash
vercel
```

5. Follow the prompts. Your site will be live in seconds!

#### Option 2: Using Vercel Dashboard

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Vercel will auto-detect the configuration and deploy

#### Option 3: Drag & Drop

1. Go to [vercel.com](https://vercel.com)
2. Drag the entire `breaks-in-the-simulation` folder onto the dashboard
3. Your site is live!

## ⚙️ Configuration

### Email Form Setup

The contact form uses Formspree. To activate:

1. Go to [formspree.io](https://formspree.io)
2. Create a free account
3. Create a new form
4. Copy your form endpoint (e.g., `https://formspree.io/f/YOUR_FORM_ID`)
5. Update `index.html` line with your form ID:

```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

Alternative services: Netlify Forms, Basin, or any form backend.

### Adding Your Logo

1. Replace `images/logo.png` with your logo file
2. Recommended size: 200-400px width
3. Keep it simple - PNG with transparency works best
4. Update the alt text in `index.html` if needed

### Custom Domain

After deploying to Vercel:

1. Go to your project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., `breaksinthesimulation.com`)
4. Follow Vercel's DNS configuration instructions
5. SSL certificates are automatically provisioned

## 🎨 Customization

### Colors

Edit CSS variables in `css/styles.css`:

```css
:root {
  --bg: #ffffff;
  --text: #000000;
  --text-light: #666666;
  --accent: #333333;
  --border: #e0e0e0;
}
```

### Fonts

Current fonts (loaded via Google Fonts):
- **Display**: Playfair Display
- **Body**: Inter

To change fonts, update the Google Fonts link in `index.html` and the CSS variables.

### Content

All content is in `index.html`. Each section is clearly marked:
- `#about` - About Us
- `#programming` - Programming & Events
- `#services` - Creative Services
- `#wellness` - Wellness Support
- `#support` - Show Your Support

## 🔧 Features

### Implemented
- ✅ Smooth scrolling navigation
- ✅ Sticky header with auto-hide on scroll
- ✅ Mobile-responsive design
- ✅ Form validation
- ✅ SEO meta tags
- ✅ Subtle entrance animations
- ✅ Active navigation highlighting
- ✅ Print-friendly styles

### Optional Additions
- Add a blog (create `blog/` directory with posts)
- Integrate Spotify embeds in programming section
- Add testimonials section
- Create a resource library page
- Add newsletter archive

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 12+
- iOS Safari 12+
- Android Chrome (latest)

Compatible with macOS 11.7 (Big Sur) and newer.

## 🐛 Troubleshooting

**Forms not submitting?**
- Make sure you've updated the Formspree endpoint
- Check browser console for errors

**Fonts not loading?**
- Verify Google Fonts link is correct
- Check your internet connection

**Smooth scroll not working?**
- Ensure JavaScript is enabled
- Check for console errors

**Sticky header behaving oddly?**
- Clear browser cache
- Try in incognito/private mode

## 📝 Notes

- No build process required - pure HTML/CSS/JS
- All assets should be under 100KB for optimal performance
- Images should be optimized (use tools like TinyPNG)
- Keep the minimal aesthetic - less is more

## 🤝 Support

For questions or issues:
- Email: hello@breaksinthesimulation.com
- Instagram: @breaksinthesimulation

## 📄 License

Copyright © 2026 Breaks In The Simulation. All rights reserved.

---

Built with care for artists, by artists. 🎵✨
