# Official Three.js Showcase Submission Guide: Helical Time

> **Important Note on `files.json`**:
> The `mrdoob/three.js` repository **does not have a `files.json` file**. The instruction mentioning `files.json` was an AI-generated template confusion with other galleries.
>
> On the official [threejs.org](https://threejs.org/) homepage, the official **"submit project"** link points directly to:
> **[https://discourse.threejs.org/c/showcase](https://discourse.threejs.org/c/showcase)**

---

## 🌟 Method 1: The Official Submission Route (Recommended)

Mr.doob and the Three.js core maintainers select projects for the `threejs.org` homepage gallery directly from the **Three.js Discourse Showcase** and from **X/Twitter** mentions (`#threejs` / `@threejs`).

### Step-by-Step Instructions:

1. **Go to the Official Showcase Category**:
   - [https://discourse.threejs.org/c/showcase](https://discourse.threejs.org/c/showcase)
   - Log in with your GitHub account (`nimabeh`).

2. **Click "+ New Topic"**:
   - **Category**: `Showcase`
   - **Title**: `Helical Time – Interactive 3D Torus Clock Visualization`

3. **Post Body Template**:
   ```markdown
   Hi everyone!

   I wanted to share **Helical Time**, an interactive 3D clock visualization where continuous time flows along nested toroidal helix coils.

   - **Live Site**: https://nimabeh.github.io/time-torus/
   - **Source Code**: https://github.com/nimabeh/time-torus

   ### Features:
   - Nested continuous helical geometry (24-hour outer torus, 60-minute intermediate spiral, 60-second micro coil)
   - Astronomical sunrise and sunset markers calculated from observer coordinates
   - Real-time celestial atmospheric tones (Day, Night, Auto Twilight)
   - Particle motion trails and post-processing bloom
   - Multi-tier perspective zoom between macro 24h orbit and micro seconds ring

   Built with Three.js, React, and Tailwind CSS. Would love to hear your feedback!
   ```

4. **Attach the Screenshot**:
   - Drag and drop `public/helical-time.jpg` directly into your post!
   - (Or upload from your local machine).

5. **Bonus**: Tweet/post on X tagging `@threejs` and using the hashtag `#threejs` with a short clip or screenshot of the glowing node. Mr.doob frequently retweets and selects showcase additions directly from there.

---

## 🛠️ Method 2: The `gh-pages` Repository Code Route

If you were looking for where the homepage showcase gallery actually lives in code:

The `threejs.org` homepage is hosted on the **`gh-pages` branch** of `mrdoob/three.js`:
- Branch: `gh-pages`
- Images directory: `files/projects/`
- Homepage file: `index.html` (inside `<div id="projects">`)

### How it's structured in the actual repository:
Instead of a JSON file, the gallery in `gh-pages/index.html` uses direct HTML links:
```html
<a href="https://nimabeh.github.io/time-torus/" target="_blank" rel="noopener">
  <img src="files/projects/helical-time.jpg" loading="lazy"/>
</a>
```

*(Note: Direct pull requests to `gh-pages` to add external projects are usually declined or closed by maintainers because Mr.doob curates the homepage list personally from the Discourse forum).*
