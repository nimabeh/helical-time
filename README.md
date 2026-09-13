<div align="center">

# 🪐 Time Torus 3D Clock
### A Continuous Helical Torus ($S^1 \times S^1$) Chronometer

[![Live Demo](https://img.shields.io/badge/Live%20Demo-nimabeh.github.io%2Ftime--torus-22c55e?style=for-the-badge&logo=googlechrome&logoColor=white)](https://nimabeh.github.io/time-torus/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black?style=flat-square&logo=threedotjs)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

<p align="center">
  <a href="https://nimabeh.github.io/time-torus/">
    <strong>Explore Live 3D Experience »</strong>
  </a>
</p>

</div>

---

## 🌌 Overview

**Time on the clock is not flat.** 

This project reimagines time as a single, unbroken 1D space curve winding through a 3D helical torus ($S^1 \times S^1$). The entire 24-hour cycle is mapped into 24 continuous macro-loops, ensuring every unique moment occupies an exact, non-overlapping coordinate in 3D space.

---

## 📐 Spatial Perspectives & Recursive Geometry

* **Front View (24h Macro):** Displays the macro-rhythm of the 24-hour cycle across the main circular path, allowing immediate perception of the day’s progression.
* **Side View (Poloidal Depth):** Rotates perspective to reveal the depth of the 24 loops, showing hours and minutes as continuous spirals wrapping around the torus tube.
* **Recursive Geometry (Hours → Minutes → Seconds):** Minutes and seconds follow the exact same toroidal logic. Seconds form micro-helices nested seamlessly within the minute coils, eliminating discrete mechanical "ticks" in favor of uninterrupted cosmic flow.

---

## ☀️ Dynamic Solar Synchronization

* **Silent IP-Based Solar Tracking:** Detects approximate location without intrusive permission prompts to calculate precise astronomical sunrise and sunset times.
* **Celestial Wire Markers:** Exact sunrise and sunset coordinates are anchored directly onto the 3D helical wire. Hovering over either marker reveals the astronomical time.
* **Atmospheric Tone Shift:** The environmental palette continuously shifts from warm solar daylight to deep Aurora Borealis night skies as the active time spark crosses the solar threshold.

---

## 🕹️ Interactive Controls

| Action | Control |
| :--- | :--- |
| **Orbit & Rotate** | Left Click + Drag / Touch Drag |
| **Pan Camera** | Right Click + Drag / Two-finger Drag |
| **Zoom in / out** | Scroll Wheel / Pinch to Zoom |
| **Perspective Presets** | **Front View** (12h/24h overview), **Torus View** (oblique 3D), **Seconds View** (tight zoom into micro-spirals) |
| **Atmospheric Lighting** | **Auto** (solar synced), **Day** (warm solar ambient), **Night** (aurora borealis) |

---

## 📐 Mathematical Formulation

The macro wire is parameterized as a closed $(p, q) = (1, 24)$ helical curve embedded on the surface of a torus with major radius $R$ and minor radius $r$:

$$\begin{aligned}
\theta(t) &= 2\pi t \\
\phi(t) &= 24 \cdot 2\pi t \\
x(t) &= (R + r \cos \phi) \cos \theta \\
y(t) &= r \sin \phi \\
z(t) &= (R + r \cos \phi) \sin \theta
\end{aligned}$$

where $t \in [0, 1)$ represents the fractional progression of the 24-hour solar day. The micro-spiral of seconds introduces a second nested perturbation along the Frenet–Serret frame of the curve.

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/nimabeh/time-torus.git

# Navigate into project directory
cd time-torus

# Install dependencies
npm install

# Start local Vite development server
npm run dev

# Build production bundle
npm run build
```

---

<div align="center">
  <sub>Engineered with Three.js, WebGL Post-Processing, and React 19.</sub>
</div>
