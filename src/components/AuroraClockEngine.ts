import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  clockCurve,
  calculateClockTime,
  getPositionAtTimeFraction,
  getNestedClockPoint,
  getTangentAtTimeFraction,
  MAJOR_RADIUS,
  MINOR_RADIUS,
  MICRO_RADIUS,
  TOTAL_HOURS,
} from '../utils/clockMath';
import { CameraFocusMode } from '../types';
import { SolarInfo } from '../utils/solarCalculator';

export interface SceneCallbacks {
  onTimeUpdate: (time: ReturnType<typeof calculateClockTime>) => void;
  onFocusChange: (mode: CameraFocusMode) => void;
}

export class AuroraClockEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;

  // Root Clock Group
  private clockGroup: THREE.Group;

  // 1. Transparent Greyish Solid Torus (matching celestial bear silhouette)
  private solidTorusMesh!: THREE.Mesh;

  // 2. 24-Loop Helical Spring (Hours)
  private springMesh!: THREE.Mesh;
  private constellationLine!: THREE.Line;

  // 3. Nested Micro-Spiral (Seconds & Minutes within the active hour)
  private microSpiralLine!: THREE.Line;
  private microSpiralGeometry!: THREE.BufferGeometry;
  private readonly microSegments = 1800; // Resolution for micro-spiral of seconds

  // 4. Inner Hour Numbers (00 - 23 on inner rim)
  private hourNumbersGroup!: THREE.Group;

  // 5. Solar Indicators (Sunrise & Sunset directly on the wire)
  private solarIndicatorsGroup!: THREE.Group;
  private sunriseMeshGroup!: THREE.Group;
  private sunsetMeshGroup!: THREE.Group;
  private sunriseSprite!: THREE.Sprite;
  private sunsetSprite!: THREE.Sprite;
  private sunriseCoronaMesh!: THREE.Mesh;
  private sunsetCoronaMesh!: THREE.Mesh;
  private sunriseHitMesh!: THREE.Mesh;
  private sunsetHitMesh!: THREE.Mesh;
  public currentSolarInfo: SolarInfo | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-1000, -1000);
  private pointerDownPos = new THREE.Vector2();
  private pointerDownTime = 0;
  private activeSolarMarker: 'sunrise' | 'sunset' | null = null;
  private solarMarkerHideTimeout: number | null = null;

  // 6. Glowing Active Spark Time Indicator & Dust
  private activeNodeGroup!: THREE.Group;
  private sparkLight!: THREE.PointLight;
  private sparkDustParticles!: THREE.Points;
  private sparkDustPositions!: Float32Array;
  private sparkDustVelocities!: Float32Array;
  private sparkDustLifetimes!: Float32Array;
  private sparkDustAges!: Float32Array;
  private sparkDustCount = 24; // Previous glowing spark flecks

  // 6. Glowing Fine Tail
  private trailLine!: THREE.Line;
  private trailGeometry!: THREE.BufferGeometry;
  private trailPositions!: Float32Array;
  private trailColors!: Float32Array;
  private trailLength = 80;

  // 7. Sky & Aurora
  private skyMesh!: THREE.Mesh;
  private skyMaterial!: THREE.ShaderMaterial;
  private starsParticles!: THREE.Points;

  // Animation & Loop
  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();
  private callbacks: SceneCallbacks;

  // Simulation & Time
  public isSimulating = false;
  public simulationSpeed = 60;
  private simulatedTimeOffset = 0;
  private currentDayFraction = 0;

  // Camera & Focus
  public focusMode: CameraFocusMode = 'ring';
  private defaultCameraPos = new THREE.Vector3(0, 0, 48);
  private defaultTarget = new THREE.Vector3(0, 0, 0);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private activeNodeWorldPos = new THREE.Vector3();
  private activeHourCenterPos = new THREE.Vector3();
  private isUserInteracting = false;

  // Aurora Warmth (0.0 = Night, 1.0 = Daytime Warmth)
  public auroraWarmthOverride: 'auto' | 'day' | 'night' = 'auto';

  /**
   * Dynamically calculate camera Z distance to ensure the full 3D helical torus
   * is framed from the front view regardless of aspect ratio (desktop, tablet, or narrow mobile portrait).
   */
  private calculateOptimalCameraZ(aspect: number): number {
    const targetRadius = 18.5; // Bounds the entire 16.2-radius torus + numerals with aesthetic breathing room
    const vFovRad = (this.camera.fov * Math.PI) / 180;
    const halfTan = Math.tan(vFovRad / 2);
    const distV = targetRadius / halfTan;
    const distH = targetRadius / (halfTan * Math.max(0.2, aspect));
    return Math.max(distV, distH);
  }

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene setup with original deep celestial night atmosphere
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020617, 0.007);

    // 2. Camera setup with responsive distance (far plane 3000 to prevent any sky dome clipping)
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 3000);
    const initialZ = this.calculateOptimalCameraZ(aspect);
    this.defaultCameraPos.set(0, 0, initialZ);
    this.camera.position.copy(this.defaultCameraPos);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // Pointer tracking & click/tap detection for interactive solar indicator tooltips
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);

    // 4. OrbitControls with smooth zoom
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = Math.max(250, initialZ * 2.5);
    this.controls.maxPolarAngle = Math.PI * 0.95;
    this.controls.target.copy(this.defaultTarget);

    this.controls.addEventListener('start', () => {
      this.isUserInteracting = true;
      if (this.focusMode !== 'free') {
        this.focusMode = 'free';
        this.callbacks.onFocusChange('free');
      }
    });
    this.controls.addEventListener('end', () => {
      this.isUserInteracting = false;
    });

    // 5. Postprocessing Bloom
    // Set threshold so bright spark (emissive > 1.0) blooms vividly, but plain green hour numbers stay crisp & flat!
    const renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0.9,  // spark bloom strength
      0.35, // radius
      0.92  // threshold: sprites & background remain flat and unbloomed
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);

    // 6. Build scene elements
    this.clockGroup = new THREE.Group();
    this.scene.add(this.clockGroup);

    this.createSereneAuroraSky();
    this.createCosmicStars();
    this.createCelestialSolidTorus();
    this.createHelicalSpringClock();
    this.createMicroSpiralDetail();
    this.createInnerHourNumerals();
    this.createSolarIndicators();
    this.createRefinedActiveSparkNode();
    this.createLighting();

    // 7. Initial Time
    const now = calculateClockTime();
    this.currentDayFraction = now.dayFraction;
    getPositionAtTimeFraction(this.currentDayFraction, true, this.activeNodeWorldPos);
    getPositionAtTimeFraction(this.currentDayFraction, false, this.activeHourCenterPos);

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  /**
   * Serene Aurora Sky Dome with Day/Night warmth interpolation
   * Uses high-resolution sphere geometry centered with camera at infinity,
   * mathematically continuous simplex gradients, and soft organic curtain ripples.
   */
  private createSereneAuroraSky(): void {
    const skyGeometry = new THREE.SphereGeometry(1200, 64, 48);

    const vertexShader = `
      varying vec3 vViewDir;
      void main() {
        // Local position on the sphere gives the spherical ray direction from camera
        vViewDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float uTime;
      uniform float uWarmth; // 0.0 = Night, 1.0 = Daytime warmth
      varying vec3 vViewDir;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      // Seamless 3D simplex noise with mathematically balanced gradient normalization
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z; // Critical fix: z normalization prevents simplex facet shearing
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vec3 dir = normalize(vViewDir);
        float elevation = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

        // Night Base vs Warm Daytime Sky Background (Deep celestial indigo/obsidian)
        vec3 nightZenith = vec3(0.012, 0.025, 0.065);
        vec3 nightNadir  = vec3(0.003, 0.006, 0.015);
        vec3 dayZenith   = vec3(0.065, 0.045, 0.095); // Deep twilight warm cosmic blue
        vec3 dayNadir    = vec3(0.045, 0.025, 0.040);

        vec3 zenithColor = mix(nightZenith, dayZenith, uWarmth);
        vec3 nadirColor  = mix(nightNadir, dayNadir, uWarmth);
        vec3 baseSky = mix(nadirColor, zenithColor, elevation);

        // Soft, smooth-flowing celestial aurora curtains (northern lights ribbons)
        float t = uTime * 0.038;

        // Smooth elevation mask: gentle falloff towards horizon and zenith without harsh cuts
        float auroraMask = smoothstep(-0.15, 0.30, dir.y) * smoothstep(0.98, 0.60, dir.y);

        // Multi-frequency flowing coordinates
        vec3 coord1 = vec3(dir.x * 1.4 + t * 0.12, dir.y * 1.1, dir.z * 1.4 + t * 0.06);
        vec3 coord2 = vec3(dir.x * 2.2 - t * 0.08, dir.y * 1.4, dir.z * 2.2 + t * 0.09);

        float n1 = snoise(coord1);
        float n2 = snoise(coord2) * 0.5;
        float combinedNoise = n1 + n2;

        // Ethereal curtain ripples (smooth harmonics, zero clipping power curves)
        float wave1 = sin(dir.x * 3.6 + dir.z * 2.2 + combinedNoise * 1.8 + t * 0.25) * 0.5 + 0.5;
        float wave2 = sin(dir.x * 6.0 - dir.z * 3.4 + combinedNoise * 2.2 + t * 0.35) * 0.5 + 0.5;
        float curtainFolds = wave1 * 0.65 + wave2 * 0.35;

        // Gentle vertical fluting
        float flutes = sin(dir.x * 10.0 + n1 * 1.5 + t * 0.15) * 0.5 + 0.5;

        // Soft luminous intensity envelope - completely organic & continuous
        float intensity = pow(curtainFolds, 1.7) * (0.75 + 0.25 * flutes) * auroraMask * (0.6 + 0.4 * (n1 * 0.5 + 0.5));

        // Atmospheric Palettes:
        // Night: emerald aurora + glacial ice cyan + subtle ethereal violet
        vec3 nightEmerald = vec3(0.04, 0.84, 0.46);
        vec3 nightCyan    = vec3(0.06, 0.70, 0.92);
        vec3 nightViolet  = vec3(0.55, 0.22, 0.80);
        vec3 nightAurora  = mix(nightEmerald, nightCyan, sin(dir.x * 2.5 + t * 0.5) * 0.5 + 0.5);
        nightAurora       = mix(nightAurora, nightViolet, smoothstep(0.35, 0.80, dir.y) * 0.45);

        // Day warmth palette: celestial gold, rose, and soft peach
        vec3 dayGold      = vec3(0.92, 0.65, 0.22);
        vec3 dayRose      = vec3(0.88, 0.36, 0.42);
        vec3 dayPeach     = vec3(0.80, 0.50, 0.70);
        vec3 dayAurora    = mix(dayGold, dayRose, sin(dir.x * 2.5 + t * 0.5) * 0.5 + 0.5);
        dayAurora         = mix(dayAurora, dayPeach, smoothstep(0.30, 0.75, dir.y) * 0.5);

        vec3 auroraColor  = mix(nightAurora, dayAurora, uWarmth);

        vec3 finalColor = baseSky + auroraColor * intensity * 0.95;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    this.skyMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWarmth: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });

    this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.skyMesh.renderOrder = -1000;
    this.scene.add(this.skyMesh);
  }

  /**
   * Distant twinkling cosmic starfield (like Ursa Major reference)
   */
  private createCosmicStars(): void {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xa5f3fc), // ice cyan
      new THREE.Color(0x93c5fd), // celestial blue
      new THREE.Color(0xfef08a), // warm star
      new THREE.Color(0xe9d5ff), // faint violet
    ];

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      // Large radius placed between celestial space and the sky dome (850 - 950)
      const radius = 850 + Math.random() * 100;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.starsParticles = new THREE.Points(geometry, material);
    this.starsParticles.renderOrder = -900;
    this.scene.add(this.starsParticles);
  }

  /**
   * Transparent Greyish Solid Torus
   * Inspired by celestial sky atlases (such as the Ursa Major constellation illustration).
   * A smooth, ethereal translucent smoky grey solid torus around which the helical
   * spring winds, without wireframe lines, circles, or square point grids.
   */
  private createCelestialSolidTorus(): void {
    const torusGeometry = new THREE.TorusGeometry(
      MAJOR_RADIUS,
      MINOR_RADIUS,
      64,
      160
    );

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;

      uniform vec3 uBaseColor;
      uniform float uOpacity;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 V = normalize(vViewPosition);

        // Gentle, soft diffuse celestial lighting
        vec3 lightDir = normalize(vec3(0.3, 0.8, 0.5));
        float diff = max(dot(N, lightDir), 0.0) * 0.25;
        float lighting = 0.8 + diff;

        float vDotN = abs(dot(N, V));

        // Soft celestial smoky grey (whisper faint astronomical chart watermark)
        vec3 greySmoke = vec3(0.40, 0.44, 0.50) * lighting;

        // Much more transparent alpha - barely there, keeping stars and coils crystal clear
        float alpha = uOpacity * (0.35 + 0.65 * pow(1.0 - vDotN, 2.8));

        gl_FragColor = vec4(greySmoke, alpha);
      }
    `;

    const torusMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBaseColor: { value: new THREE.Color(0x64748b) },
        uOpacity: { value: 0.016 }, // Much more transparent!
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });

    this.solidTorusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    this.solidTorusMesh.renderOrder = 1;
    this.clockGroup.add(this.solidTorusMesh);
  }

  /**
   * Continuous 24-Loop Helical Spring (Hours)
   * Crisp, continuous 3D tube/line without bulky gems or glowing bands
   */
  private createHelicalSpringClock(): void {
    const tubularSegments = 3000;
    const tubeRadius = 0.042;
    const radialSegments = 8;

    const springGeometry = new THREE.TubeGeometry(
      clockCurve,
      tubularSegments,
      tubeRadius,
      radialSegments,
      true
    );

    const springMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Luminous sky blue
      emissive: 0x0369a1,
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.8,
    });

    this.springMesh = new THREE.Mesh(springGeometry, springMaterial);
    this.clockGroup.add(this.springMesh);

    // Crisp starlight line backbone for celestial clarity
    const curvePoints = clockCurve.getPoints(tubularSegments);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.constellationLine = new THREE.Line(lineGeom, lineMat);
    this.clockGroup.add(this.constellationLine);
  }

  /**
   * Micro-Spiral Detail:
   * Dynamically renders the micro-spiral coil of the active hour loop.
   * Completes 60 micro-turns per hour loop (each micro-turn = 1 minute, traversed in 60 seconds).
   * As the user zooms in, this micro-spiral is vividly visible in crisp detail!
   */
  private createMicroSpiralDetail(): void {
    this.microSpiralGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.microSegments * 3);
    const colors = new Float32Array(this.microSegments * 3);

    this.microSpiralGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.microSpiralGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const microMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5,
    });

    this.microSpiralLine = new THREE.Line(this.microSpiralGeometry, microMat);
    this.clockGroup.add(this.microSpiralLine);
  }

  /**
   * Update the active micro-spiral segment centered around the current hour
   */
  private updateMicroSpiral(currentT: number): void {
    const posAttr = this.microSpiralGeometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.microSpiralGeometry.attributes.color as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    // We render the micro-spiral spanning 1 full hour window around the active time
    // 1 hour = 1/24 of the day fraction = ~0.04166
    const halfSpan = 0.5 / TOTAL_HOURS;
    const startT = currentT - halfSpan;

    const baseCyan = new THREE.Color(0x38bdf8);
    const activeEmerald = new THREE.Color(0x34d399);

    const p = new THREE.Vector3();
    for (let i = 0; i < this.microSegments; i++) {
      const frac = startT + (i / this.microSegments) * (halfSpan * 2);
      getNestedClockPoint(frac, true, p);

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      // Distance from current active time node
      const dist = Math.abs(frac - currentT);
      const proximity = Math.max(0, 1.0 - dist / (halfSpan * 0.4));

      const c = baseCyan.clone().lerp(activeEmerald, proximity);
      const alpha = 0.4 + proximity * 0.6;

      colors[i * 3] = c.r * alpha;
      colors[i * 3 + 1] = c.g * alpha;
      colors[i * 3 + 2] = c.b * alpha;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  /**
   * Plain green hour numbers (00 to 23) displayed along the inner side
   * of the main ring. Plain and clearly readable without glow blur.
   */
  private createInnerHourNumerals(): void {
    this.hourNumbersGroup = new THREE.Group();

    // Radius comfortably inside the torus inner rim
    const innerRadius = MAJOR_RADIUS - MINOR_RADIUS - 0.9;

    for (let h = 0; h < TOTAL_HOURS; h++) {
      // Clockwise orientation vertically flipped so 12 (noon) is at top, 6 is on right, 0 is at bottom
      const phi = Math.PI * 0.5 - (h / TOTAL_HOURS) * Math.PI * 2;
      const x = innerRadius * Math.cos(phi);
      const y = -innerRadius * Math.sin(phi); // Flipped Y so 12 is top

      const labelText = h.toString().padStart(2, '0');
      const sprite = this.createNumberSprite(labelText);
      sprite.position.set(x, y, 0.2); // Positioned slightly in front of the torus plane
      this.hourNumbersGroup.add(sprite);

      // Clean subtle indicator tick from number to the hour meridian
      const tickGeom = new THREE.BufferGeometry();
      const tickOuterX = (innerRadius + 0.42) * Math.cos(phi);
      const tickOuterY = -(innerRadius + 0.42) * Math.sin(phi); // Flipped Y
      tickGeom.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([x, y, 0.1, tickOuterX, tickOuterY, 0.1], 3)
      );
      const tickMat = new THREE.LineBasicMaterial({
        color: 0x22c55e,
        transparent: true,
        opacity: 0.45,
      });
      const tickLine = new THREE.Line(tickGeom, tickMat);
      this.hourNumbersGroup.add(tickLine);
    }

    this.clockGroup.add(this.hourNumbersGroup);
  }

  /**
   * Plain numbers with green color (no glow, no blur, high contrast)
   */
  private createNumberSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);

    // Plain, bold, razor-sharp numerals
    ctx.font = 'bold 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Solid dark outline (no glow blur) to guarantee high contrast against starry sky & aurora
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 14;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 128, 128);

    // Plain vivid green color as requested (no shadow blur, no glow)
    ctx.fillStyle = '#22c55e'; // Bright, solid emerald green
    ctx.fillText(text, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.NormalBlending, // Normal blending prevents bloom washout
      depthTest: false, // Ensures numbers remain razor-sharp and never occluded
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 999;
    sprite.scale.set(1.5, 1.5, 1.0);
    return sprite;
  }

  /**
   * Two indicators anchored directly onto the helical wire at exact times of Sunrise and Sunset
   * Scaled down elegantly; hovering over them reveals the exact astronomical time.
   */
  private createSolarIndicators(): void {
    this.solarIndicatorsGroup = new THREE.Group();

    // 1. Sunrise Indicator (Golden Sun bead & Corona ring & Hover hit sphere)
    this.sunriseMeshGroup = new THREE.Group();

    const sunGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const sunMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.0,
      roughness: 0.15,
    });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunriseMeshGroup.add(sunMesh);

    const coronaGeom = new THREE.TorusGeometry(0.15, 0.015, 12, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
    });
    this.sunriseCoronaMesh = new THREE.Mesh(coronaGeom, coronaMat);
    this.sunriseMeshGroup.add(this.sunriseCoronaMesh);

    // Invisible touch/click hit target (0.65 radius) for effortless tapping on mobile
    this.sunriseHitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.sunriseMeshGroup.add(this.sunriseHitMesh);

    this.sunriseSprite = this.createSolarSprite('SUNRISE', '06:00', '#f59e0b');
    this.sunriseSprite.position.set(0, 0.52, 0);
    this.sunriseSprite.visible = false; // Appears on hover/tap!
    this.sunriseMeshGroup.add(this.sunriseSprite);

    this.solarIndicatorsGroup.add(this.sunriseMeshGroup);

    // 2. Sunset Indicator (Rose Coral Dusk bead & Ring & Hover hit sphere)
    this.sunsetMeshGroup = new THREE.Group();

    const duskGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const duskMat = new THREE.MeshStandardMaterial({
      color: 0xfecdd3,
      emissive: 0xf43f5e,
      emissiveIntensity: 3.0,
      roughness: 0.15,
    });
    const duskMesh = new THREE.Mesh(duskGeom, duskMat);
    this.sunsetMeshGroup.add(duskMesh);

    const duskRingGeom = new THREE.TorusGeometry(0.15, 0.015, 12, 32);
    const duskRingMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.85,
    });
    this.sunsetCoronaMesh = new THREE.Mesh(duskRingGeom, duskRingMat);
    this.sunsetMeshGroup.add(this.sunsetCoronaMesh);

    // Invisible touch/click hit target (0.65 radius) for effortless tapping on mobile
    this.sunsetHitMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.sunsetMeshGroup.add(this.sunsetHitMesh);

    this.sunsetSprite = this.createSolarSprite('SUNSET', '18:00', '#f43f5e');
    this.sunsetSprite.position.set(0, 0.52, 0);
    this.sunsetSprite.visible = false; // Appears on hover!
    this.sunsetMeshGroup.add(this.sunsetSprite);

    this.solarIndicatorsGroup.add(this.sunsetMeshGroup);

    this.clockGroup.add(this.solarIndicatorsGroup);

    // Initial positioning at standard 06:00 and 18:00 until localized solar data arrives
    const initSunrisePos = getPositionAtTimeFraction(6.0 / 24.0, false);
    this.sunriseMeshGroup.position.copy(initSunrisePos);

    const initSunsetPos = getPositionAtTimeFraction(18.0 / 24.0, false);
    this.sunsetMeshGroup.position.copy(initSunsetPos);
  }

  /**
   * Sharp canvas sprite for astronomical sunrise/sunset markers (revealed on hover)
   */
  private createSolarSprite(label: string, timeStr: string, accentColor: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 120;
    this.drawSolarSpriteCanvas(canvas, label, timeStr, accentColor);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.9, 0.72, 1);
    return sprite;
  }

  private drawSolarSpriteCanvas(
    canvas: HTMLCanvasElement,
    label: string,
    timeStr: string,
    accentColor: string
  ): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const r = 20;
    const x = 10, y = 10, w = canvas.width - 20, h = canvas.height - 20;

    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = accentColor;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = accentColor;
    ctx.fillText(label, canvas.width / 2, 40);

    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(timeStr, canvas.width / 2, 80);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(timeStr, canvas.width / 2, 80);
  }

  private updateSolarSprite(
    sprite: THREE.Sprite,
    label: string,
    timeStr: string,
    accentColor: string
  ): void {
    const texture = sprite.material.map as THREE.CanvasTexture;
    if (texture && texture.image) {
      this.drawSolarSpriteCanvas(texture.image as HTMLCanvasElement, label, timeStr, accentColor);
      texture.needsUpdate = true;
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onPointerLeave = (): void => {
    this.mouse.set(-1000, -1000);
  };

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos.set(e.clientX, e.clientY);
    this.pointerDownTime = performance.now();
  };

  private onPointerUp = (e: PointerEvent): void => {
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - this.pointerDownTime;

    // Distinguish intentional tap/click from camera orbit/pan drag (movement < 10px, duration < 450ms)
    if (dist < 10 && dt < 450) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(clickMouse, this.camera);
      if (this.sunriseHitMesh && this.sunsetHitMesh) {
        const intersects = this.raycaster.intersectObjects([this.sunriseHitMesh, this.sunsetHitMesh], false);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          if (hit === this.sunriseHitMesh) {
            this.toggleSolarMarker('sunrise');
          } else if (hit === this.sunsetHitMesh) {
            this.toggleSolarMarker('sunset');
          }
        } else if (this.activeSolarMarker) {
          // Tapping empty space dismisses open solar time tooltip
          this.activeSolarMarker = null;
          if (this.solarMarkerHideTimeout) {
            window.clearTimeout(this.solarMarkerHideTimeout);
            this.solarMarkerHideTimeout = null;
          }
        }
      }
    }
  };

  private toggleSolarMarker(marker: 'sunrise' | 'sunset'): void {
    if (this.activeSolarMarker === marker) {
      this.activeSolarMarker = null;
      if (this.solarMarkerHideTimeout) {
        window.clearTimeout(this.solarMarkerHideTimeout);
        this.solarMarkerHideTimeout = null;
      }
    } else {
      this.activeSolarMarker = marker;
      if (this.solarMarkerHideTimeout) {
        window.clearTimeout(this.solarMarkerHideTimeout);
      }
      // Keep visible for 5.5 seconds so mobile user can easily read the exact time
      this.solarMarkerHideTimeout = window.setTimeout(() => {
        this.activeSolarMarker = null;
        this.solarMarkerHideTimeout = null;
      }, 5500);
    }
  }

  /**
   * Update sunrise and sunset indicators from user local solar calculation
   */
  public setSolarInfo(info: SolarInfo): void {
    this.currentSolarInfo = info;

    // Anchor directly onto the 24-loop helical wire at calculated time fractions
    const sunrisePos = getPositionAtTimeFraction(info.sunriseDayFraction, false);
    this.sunriseMeshGroup.position.copy(sunrisePos);

    const sunsetPos = getPositionAtTimeFraction(info.sunsetDayFraction, false);
    this.sunsetMeshGroup.position.copy(sunsetPos);

    this.updateSolarSprite(this.sunriseSprite, 'SUNRISE', info.sunriseFormatted, '#f59e0b');
    this.updateSolarSprite(this.sunsetSprite, 'SUNSET', info.sunsetFormatted, '#f43f5e');
  }

  /**
   * Refined Active Spark Time Node:
   * Clean emerald green spark with bright core and fine glowing tail
   */
  private createRefinedActiveSparkNode(): void {
    this.activeNodeGroup = new THREE.Group();

    // 1. Glowing emerald green spark sphere (radius 0.13)
    const sparkGeom = new THREE.SphereGeometry(0.13, 16, 16);
    const sparkMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80, // Crisp emerald green
      emissive: 0x22c55e,
      emissiveIntensity: 3.2,
      roughness: 0.1,
      metalness: 0.1,
    });
    const sparkMesh = new THREE.Mesh(sparkGeom, sparkMat);
    this.activeNodeGroup.add(sparkMesh);

    // 2. Bright center core (radius 0.06)
    const coreGeom = new THREE.SphereGeometry(0.06, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    this.activeNodeGroup.add(coreMesh);

    // 3. Local PointLight (moderate intensity & radius)
    this.sparkLight = new THREE.PointLight(0x22c55e, 1.8, 5.5, 1.6);
    this.activeNodeGroup.add(this.sparkLight);

    // 4. Fine glowing tail trailing along the path
    this.trailPositions = new Float32Array(this.trailLength * 3);
    this.trailColors = new Float32Array(this.trailLength * 3);

    const initialPos = getPositionAtTimeFraction(this.currentDayFraction, true);
    for (let i = 0; i < this.trailLength; i++) {
      this.trailPositions[i * 3] = initialPos.x;
      this.trailPositions[i * 3 + 1] = initialPos.y;
      this.trailPositions[i * 3 + 2] = initialPos.z;

      const alpha = Math.pow(1.0 - i / this.trailLength, 1.8);
      // Soft emerald fading into delicate cyan
      this.trailColors[i * 3] = 0.2 * alpha;
      this.trailColors[i * 3 + 1] = 0.9 * alpha;
      this.trailColors[i * 3 + 2] = 0.5 * alpha;
    }

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.trailLine = new THREE.Line(this.trailGeometry, trailMat);
    this.scene.add(this.trailLine);

    // 5. Spark dust flecks
    const dustGeom = new THREE.BufferGeometry();
    this.sparkDustPositions = new Float32Array(this.sparkDustCount * 3);
    this.sparkDustVelocities = new Float32Array(this.sparkDustCount * 3);
    this.sparkDustAges = new Float32Array(this.sparkDustCount);
    this.sparkDustLifetimes = new Float32Array(this.sparkDustCount);

    for (let i = 0; i < this.sparkDustCount; i++) {
      this.sparkDustPositions[i * 3] = initialPos.x;
      this.sparkDustPositions[i * 3 + 1] = initialPos.y;
      this.sparkDustPositions[i * 3 + 2] = initialPos.z;

      this.sparkDustAges[i] = Math.random() * 1.0;
      this.sparkDustLifetimes[i] = 0.4 + Math.random() * 0.5;
    }

    dustGeom.setAttribute('position', new THREE.BufferAttribute(this.sparkDustPositions, 3));

    const dustMat = new THREE.PointsMaterial({
      color: 0x86efac,
      size: 0.18,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sparkDustParticles = new THREE.Points(dustGeom, dustMat);
    this.scene.add(this.sparkDustParticles);

    this.scene.add(this.activeNodeGroup);
  }

  /**
   * Scene Lighting
   */
  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x0c4a6e, 0.6);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.0);
    dirLight1.position.set(15, 25, 20);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x818cf8, 0.6);
    dirLight2.position.set(-15, -15, -15);
    this.scene.add(dirLight2);
  }

  /**
   * Calculate Aurora Daytime Warmth (0.0 = night, 1.0 = peak day)
   * Auto mode turns to Day Tone from exact sunrise until sunset!
   */
  private getAuroraWarmth(hour: number): number {
    if (this.auroraWarmthOverride === 'day') return 1.0;
    if (this.auroraWarmthOverride === 'night') return 0.0;

    // Use exact local solar times when available, or standard 06:00-18:00
    const sunriseHr = this.currentSolarInfo ? this.currentSolarInfo.sunriseDayFraction * 24 : 6.0;
    const sunsetHr = this.currentSolarInfo ? this.currentSolarInfo.sunsetDayFraction * 24 : 18.0;

    // Turn to Day Tone once sunrise is reached until sunset!
    if (hour >= sunriseHr && hour < sunsetHr) {
      // 25-minute gentle blending transition at dawn and dusk, full Day Tone throughout the day
      const dawnProgress = Math.min(1.0, (hour - sunriseHr) / 0.4);
      const duskProgress = Math.min(1.0, (sunsetHr - hour) / 0.4);
      return Math.min(dawnProgress, duskProgress);
    }
    return 0.0;
  }

  public setWarmthMode(mode: 'auto' | 'day' | 'night'): void {
    this.auroraWarmthOverride = mode;
  }

  /**
   * Resize viewport
   */
  public onResize = (): void => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const optimalZ = this.calculateOptimalCameraZ(aspect);
    this.defaultCameraPos.set(0, 0, optimalZ);
    this.controls.maxDistance = Math.max(250, optimalZ * 2.5);

    // If currently in Ring / Front Torus mode and not actively dragging, keep it framed
    if (this.focusMode === 'ring' && !this.isUserInteracting) {
      this.camera.position.set(0, 0, optimalZ);
      this.controls.target.copy(this.defaultTarget);
    }

    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };

  /**
   * Camera focus modes
   */
  public setFocusMode(mode: CameraFocusMode): void {
    this.focusMode = mode;
    this.callbacks.onFocusChange(mode);

    if (mode === 'ring') {
      this.targetLookAt.copy(this.defaultTarget);
    } else if (mode === 'node') {
      this.targetLookAt.copy(this.activeNodeWorldPos);
    }
  }

  public toggleFocus(): CameraFocusMode {
    const nextMode: CameraFocusMode = this.focusMode === 'node' ? 'ring' : 'node';
    this.setFocusMode(nextMode);
    return nextMode;
  }

  public resetToRealtime(): void {
    this.isSimulating = false;
    this.simulatedTimeOffset = 0;
  }

  /**
   * Render Loop
   */
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Calculate Time
    let clockTime: ReturnType<typeof calculateClockTime>;
    if (this.isSimulating) {
      this.simulatedTimeOffset += (delta * this.simulationSpeed) / 86400;
      this.currentDayFraction =
        (((this.currentDayFraction + (delta * this.simulationSpeed) / 86400) % 1.0) + 1.0) % 1.0;

      const totalSecs = this.currentDayFraction * 86400;
      const hours = Math.floor(totalSecs / 3600) % 24;
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = Math.floor(totalSecs % 60);
      const milliseconds = Math.floor((totalSecs - Math.floor(totalSecs)) * 1000);

      clockTime = {
        hours,
        minutes,
        seconds,
        milliseconds,
        dayFraction: this.currentDayFraction,
        hourProgress: (minutes * 60 + seconds + milliseconds / 1000) / 3600,
      };
    } else {
      clockTime = calculateClockTime();
      this.currentDayFraction = clockTime.dayFraction;
    }

    this.callbacks.onTimeUpdate(clockTime);

    // 2. Update Aurora Sky & Stars (centered on camera at infinity, slow celestial motion + day warmth)
    if (this.skyMesh) {
      this.skyMesh.position.copy(this.camera.position);
    }
    if (this.skyMaterial) {
      this.skyMaterial.uniforms.uTime.value = elapsedTime;
      const targetWarmth = this.getAuroraWarmth(clockTime.hours);
      this.skyMaterial.uniforms.uWarmth.value +=
        (targetWarmth - this.skyMaterial.uniforms.uWarmth.value) * 0.05;
    }

    if (this.starsParticles) {
      this.starsParticles.position.copy(this.camera.position);
      this.starsParticles.rotation.y = elapsedTime * 0.003;
    }

    // Gentle rotation of solar indicator rings
    if (this.sunriseCoronaMesh && this.sunsetCoronaMesh) {
      this.sunriseCoronaMesh.rotation.z += delta * 0.6;
      this.sunsetCoronaMesh.rotation.z -= delta * 0.6;
    }

    // Interactive astronomical sunrise/sunset indicators (clickable on mobile/touch & hoverable on desktop)
    if (this.sunriseHitMesh && this.sunsetHitMesh) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects([this.sunriseHitMesh, this.sunsetHitMesh], false);
      let isHovering = false;
      let hoveredObj: THREE.Object3D | null = null;
      if (intersects.length > 0) {
        hoveredObj = intersects[0].object;
        isHovering = true;
      }

      this.sunriseSprite.visible = (this.activeSolarMarker === 'sunrise') || (hoveredObj === this.sunriseHitMesh);
      this.sunsetSprite.visible = (this.activeSolarMarker === 'sunset') || (hoveredObj === this.sunsetHitMesh);

      if (isHovering || this.activeSolarMarker) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else if (!this.isUserInteracting) {
        this.renderer.domElement.style.cursor = 'grab';
      }
    }

    // 3. Position Active Spark Node along the nested path (including micro-spiral of seconds!)
    getPositionAtTimeFraction(this.currentDayFraction, true, this.activeNodeWorldPos);
    getPositionAtTimeFraction(this.currentDayFraction, false, this.activeHourCenterPos);

    this.activeNodeGroup.position.copy(this.activeNodeWorldPos);

    // Glowing pulse for active spark
    const pulse = 1.0 + Math.sin(elapsedTime * 6.0) * 0.15;
    this.sparkLight.intensity = 1.8 * pulse;

    // 4. Update the Micro-Spiral path around the active hour
    this.updateMicroSpiral(this.currentDayFraction);

    // 5. Update Faint Glowing Tail
    const trailPosAttr = this.trailGeometry.attributes.position as THREE.BufferAttribute;
    const trailPositions = trailPosAttr.array as Float32Array;

    // Tail follows the fine micro-spiral backwards
    const dt = 0.000003; // Tiny time step backwards
    for (let i = 0; i < this.trailLength; i++) {
      const trailT = this.currentDayFraction - i * dt;
      const p = getNestedClockPoint(trailT, true);
      trailPositions[i * 3] = p.x;
      trailPositions[i * 3 + 1] = p.y;
      trailPositions[i * 3 + 2] = p.z;
    }
    trailPosAttr.needsUpdate = true;

    // 6. Update Spark Dust Flecks
    const dustPosAttr = this.sparkDustParticles.geometry.attributes.position as THREE.BufferAttribute;
    const dustPositions = dustPosAttr.array as Float32Array;
    const tangent = getTangentAtTimeFraction(this.currentDayFraction);

    for (let i = 0; i < this.sparkDustCount; i++) {
      this.sparkDustAges[i] += delta;

      if (this.sparkDustAges[i] >= this.sparkDustLifetimes[i]) {
        this.sparkDustAges[i] = 0;
        this.sparkDustLifetimes[i] = 0.35 + Math.random() * 0.45;

        dustPositions[i * 3] = this.activeNodeWorldPos.x + (Math.random() - 0.5) * 0.08;
        dustPositions[i * 3 + 1] = this.activeNodeWorldPos.y + (Math.random() - 0.5) * 0.08;
        dustPositions[i * 3 + 2] = this.activeNodeWorldPos.z + (Math.random() - 0.5) * 0.08;

        this.sparkDustVelocities[i * 3] = -tangent.x * 0.8 + (Math.random() - 0.5) * 0.6;
        this.sparkDustVelocities[i * 3 + 1] = -tangent.y * 0.8 + (Math.random() - 0.5) * 0.6;
        this.sparkDustVelocities[i * 3 + 2] = -tangent.z * 0.8 + (Math.random() - 0.5) * 0.6;
      } else {
        dustPositions[i * 3] += this.sparkDustVelocities[i * 3] * delta;
        dustPositions[i * 3 + 1] += this.sparkDustVelocities[i * 3 + 1] * delta;
        dustPositions[i * 3 + 2] += this.sparkDustVelocities[i * 3 + 2] * delta;
      }
    }
    dustPosAttr.needsUpdate = true;

    // 7. Dynamic Camera Focus: Seconds View vs Torus View
    if (this.focusMode === 'node') {
      // Seconds View: zoom in close to the active spark node to inspect micro spiral of seconds
      this.targetLookAt.copy(this.activeNodeWorldPos);
      this.controls.target.lerp(this.targetLookAt, 0.08);

      if (!this.isUserInteracting) {
        // Position camera angled in front of the active node with comfortable viewing distance (~3.6)
        const camDir = this.camera.position.clone().sub(this.controls.target);
        if (camDir.length() < 0.1) {
          camDir.set(0.4, 0.4, 3.6);
        } else {
          camDir.normalize().multiplyScalar(3.6);
        }
        const desiredPos = this.activeNodeWorldPos.clone().add(camDir);
        this.camera.position.lerp(desiredPos, 0.08);
      }
    } else if (this.focusMode === 'ring') {
      // Torus View: smoothly reset both camera and target to frame the full torus!
      this.targetLookAt.copy(this.defaultTarget);
      this.controls.target.lerp(this.targetLookAt, 0.08);

      if (!this.isUserInteracting) {
        this.camera.position.lerp(this.defaultCameraPos, 0.08);

        if (this.camera.position.distanceTo(this.defaultCameraPos) < 0.02) {
          this.camera.position.copy(this.defaultCameraPos);
        }
        if (this.controls.target.distanceTo(this.defaultTarget) < 0.02) {
          this.controls.target.copy(this.defaultTarget);
        }
      }
    } else {
      // Free orbit mode
      const camDist = this.camera.position.distanceTo(this.controls.target);
      if (camDist < 8.0 && !this.isUserInteracting) {
        const factor = Math.min(1.0, (8.0 - camDist) / 5.0);
        this.controls.target.lerp(this.activeNodeWorldPos, 0.03 * factor);
      }
    }

    this.controls.update();

    // 8. Render
    this.composer.render();
  };

  public dispose(): void {
    if (this.solarMarkerHideTimeout) {
      window.clearTimeout(this.solarMarkerHideTimeout);
      this.solarMarkerHideTimeout = null;
    }
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.renderer.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.onResize);
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
