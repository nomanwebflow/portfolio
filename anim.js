import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import anime from 'animejs/lib/anime.es.js';
import { createNoise3D, createNoise4D } from 'simplex-noise';

let scene, camera, renderer, controls, clock;
let composer, bloomPass;

let particlesGeometry, particlesMaterial, particleSystem;
let basePositions, currentPositions, clickTargets;
let particleSizes, particleOpacities, particleEffectStrengths;
let noise3D, noise4D;

let isInitialized = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const CONFIG = {
    particleCount: 150000,
    cloudSize: 400,                 // general spread of background dots
    bloomStrength: 1.2,
    bloomRadius: 0.5,
    bloomThreshold: 0.05,
    idleFlowStrength: 0.25,
    idleFlowSpeed: 0.06,
    particleSizeRange: [0.06, 0.22],
    clickInfluenceCount: 400,     // how many nearest particles react to a click
    clickPushMin: 2.0,            // min displacement on click
    clickPushMax: 6.5,            // max displacement on click
    clickDuration: 900,
    clickReturnDelay: 250,
    clickReturnDuration: 900
};

const tempVec = new THREE.Vector3();
const clickVec = new THREE.Vector3();
const workVec = new THREE.Vector3();
const centerVec = new THREE.Vector3(0, 0, 0);

function init() {
    clock = new THREE.Clock();
    noise3D = createNoise3D(() => Math.random());
    noise4D = createNoise4D(() => Math.random());

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000308, 0.03);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-15, -5, 20);
    camera.lookAt(scene.position);

    const canvas = document.getElementById('webglCanvas');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5; controls.maxDistance = 80;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.3;

    scene.add(new THREE.AmbientLight(0x404060));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(15, 20, 10); scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x88aaff, 0.9);
    dirLight2.position.set(-15, -10, -15); scene.add(dirLight2);

    setupPostProcessing();
    createStarfield();
    setupParticleSystem();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', onCanvasClick);

    isInitialized = true;
    animate();
    console.log("Dots-only scene initialized.");
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), CONFIG.bloomStrength, CONFIG.bloomRadius, CONFIG.bloomThreshold);
    composer.addPass(bloomPass);
}

function createStarfield() {
    // Keep your starfield as-is (large distant stars)
    const starVertices = []; const starSizes = []; const starColors = [];
    const starGeometry = new THREE.BufferGeometry();
    for (let i = 0; i < 18000; i++) {
        tempVec.set( THREE.MathUtils.randFloatSpread(400), THREE.MathUtils.randFloatSpread(400), THREE.MathUtils.randFloatSpread(400) );
        if (tempVec.length() < 100) tempVec.setLength(100 + Math.random() * 300);
        starVertices.push(tempVec.x, tempVec.y, tempVec.z);
        starSizes.push(Math.random() * 0.15 + 0.05);
        const color = new THREE.Color();
        if (Math.random() < 0.1) { color.setHSL(Math.random(), 0.7, 0.65); } else { color.setHSL(0.6, Math.random() * 0.1, 0.8 + Math.random() * 0.2); }
        starColors.push(color.r, color.g, color.b);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    const starMaterial = new THREE.ShaderMaterial({
         uniforms: { pointTexture: { value: createStarTexture() } },
         vertexShader: `
              attribute float size; varying vec3 vColor; varying float vSize;
              void main() {
                   vColor = color; vSize = size; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                   gl_PointSize = size * (400.0 / -mvPosition.z); gl_Position = projectionMatrix * mvPosition;
              }`,
         fragmentShader: `
              uniform sampler2D pointTexture; varying vec3 vColor; varying float vSize;
              void main() {
                   float alpha = texture2D(pointTexture, gl_PointCoord).a; if (alpha < 0.1) discard;
                   gl_FragColor = vec4(vColor, alpha * 0.9);
              }`,
         blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
     });
    scene.add(new THREE.Points(starGeometry, starMaterial));
}

function createStarTexture() {
    const size = 64; const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size; const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.3)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
}

function setupParticleSystem() {
    // Create a cloud of particles (the dots you want in the background)
    particlesGeometry = new THREE.BufferGeometry();
    basePositions = new Float32Array(CONFIG.particleCount * 3);
    currentPositions = new Float32Array(CONFIG.particleCount * 3);
    clickTargets = new Float32Array(CONFIG.particleCount * 3);

    for (let i = 0; i < CONFIG.particleCount; i++) {
        const i3 = i * 3;
        // Fill a spherical-ish cloud around origin with bias to center
        const r = Math.pow(Math.random(), 1.0) * CONFIG.cloudSize * (0.55 + Math.random() * 0.9);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(THREE.MathUtils.randFloat(-1, 1));
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        basePositions[i3] = x; basePositions[i3 + 1] = y; basePositions[i3 + 2] = z;
        currentPositions[i3] = x; currentPositions[i3 + 1] = y; currentPositions[i3 + 2] = z;
        clickTargets[i3] = x; clickTargets[i3 + 1] = y; clickTargets[i3 + 2] = z;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

    particleSizes = new Float32Array(CONFIG.particleCount);
    particleOpacities = new Float32Array(CONFIG.particleCount);
    particleEffectStrengths = new Float32Array(CONFIG.particleCount);

    for (let i = 0; i < CONFIG.particleCount; i++) {
        particleSizes[i] = THREE.MathUtils.randFloat(CONFIG.particleSizeRange[0], CONFIG.particleSizeRange[1]);
        particleOpacities[i] = 1.0;
        particleEffectStrengths[i] = 0.0;
    }
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
    particlesGeometry.setAttribute('opacity', new THREE.BufferAttribute(particleOpacities, 1));
    particlesGeometry.setAttribute('aEffectStrength', new THREE.BufferAttribute(particleEffectStrengths, 1));

    // color: subtle bluish-white for background dots
    const colors = new Float32Array(CONFIG.particleCount * 3);
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const c = new THREE.Color();
        c.setHSL(0.6 + Math.random() * 0.05, 0.05 + Math.random() * 0.12, 0.75 + Math.random() * 0.15);
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // shader keeps effect attributes so click increases brightness/size
    particlesMaterial = new THREE.ShaderMaterial({
         uniforms: {
              pointTexture: { value: createStarTexture() }
         },
         vertexShader: `
              attribute float size;
              attribute float opacity;
              attribute float aEffectStrength;
              varying vec3 vColor;
              varying float vOpacity;
              varying float vEffectStrength;

              void main() {
                   vColor = color;
                   vOpacity = opacity;
                   vEffectStrength = aEffectStrength;

                   vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

                   float sizeScale = 1.0 + vEffectStrength * 1.6; // get bigger on click
                   gl_PointSize = size * sizeScale * (400.0 / -mvPosition.z);

                   gl_Position = projectionMatrix * mvPosition;
              }
         `,
         fragmentShader: `
              uniform sampler2D pointTexture;
              varying vec3 vColor;
              varying float vOpacity;
              varying float vEffectStrength;

              void main() {
                   float alpha = texture2D(pointTexture, gl_PointCoord).a;
                   if (alpha < 0.05) discard;

                   vec3 finalColor = vColor * (1.0 + vEffectStrength * 0.9);

                   gl_FragColor = vec4(finalColor, alpha * vOpacity);
              }
         `,
         blending: THREE.AdditiveBlending,
         depthTest: true,
         depthWrite: false,
         transparent: true,
         vertexColors: true
    });

    particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);
}

function animate() {
    requestAnimationFrame(animate);
    if (!isInitialized) return;

    const elapsedTime = clock.getElapsedTime();
    const deltaTime = clock.getDelta();
    controls.update();

    // idle flow: small organic movement around base positions
    const positions = particlesGeometry.attributes.position.array;
    const effectStrengths = particlesGeometry.attributes.aEffectStrength.array;

    const breathScale = 1.0 + Math.sin(elapsedTime * 0.4) * 0.008;
    const timeScaled = elapsedTime * CONFIG.idleFlowSpeed;
    const freq = 0.07;

    for (let i = 0; i < CONFIG.particleCount; i++) {
        const i3 = i * 3;
        // base + gentle noise flow
        tempVec.fromArray(basePositions, i3);
        tempVec.multiplyScalar(breathScale);

        const flow = new THREE.Vector3(
            noise4D(tempVec.x * freq, tempVec.y * freq, tempVec.z * freq, timeScaled),
            noise4D(tempVec.x * freq + 10, tempVec.y * freq + 10, tempVec.z * freq + 10, timeScaled),
            noise4D(tempVec.x * freq + 20, tempVec.y * freq + 20, tempVec.z * freq + 20, timeScaled)
        );
        tempVec.addScaledVector(flow, CONFIG.idleFlowStrength);

        // lerp current position toward tempVec or towards clickTarget if active (clickTargets used when animating)
        workVec.fromArray(clickTargets, i3);
        // if clickTargets equals base (no active click) this lerp does nothing special
        const lerpTarget = workVec; // clickTargets contains desired temporary positions during animations
        // blend between idle tempVec and click target using effectStrength as weight
        const eff = effectStrengths[i];
        tempVec.lerp(lerpTarget, eff * 0.9);

        // smooth toward final
        currentPositions[i3] = THREE.MathUtils.lerp(positions[i3], tempVec.x, 0.06);
        currentPositions[i3 + 1] = THREE.MathUtils.lerp(positions[i3 + 1], tempVec.y, 0.06);
        currentPositions[i3 + 2] = THREE.MathUtils.lerp(positions[i3 + 2], tempVec.z, 0.06);

        positions[i3] = currentPositions[i3];
        positions[i3 + 1] = currentPositions[i3 + 1];
        positions[i3 + 2] = currentPositions[i3 + 2];

        // gradual decay of effectStrength (so visual effect fades if not explicitly animated)
        if (effectStrengths[i] > 0 && effectStrengths[i] < 0.001) effectStrengths[i] = 0;
    }

    particlesGeometry.attributes.position.needsUpdate = true;
    particlesGeometry.attributes.aEffectStrength.needsUpdate = true;

    composer.render(deltaTime);
}

function onCanvasClick(event) {
    // compute normalized device coordinates (-1 to +1) for mouse
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // raycast against a plane roughly centered in the scene
    raycaster.setFromCamera(mouse, camera);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // z=0 plane
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, intersectPoint);
    if (!intersectPoint) return;

    // find nearest CONFIG.clickInfluenceCount particles
    const positions = particlesGeometry.attributes.position.array;
    const distances = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const i3 = i * 3;
        const dx = positions[i3] - intersectPoint.x;
        const dy = positions[i3 + 1] - intersectPoint.y;
        const dz = positions[i3 + 2] - intersectPoint.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        distances.push({ i, d2 });
    }
    distances.sort((a, b) => a.d2 - b.d2);
    const affected = distances.slice(0, CONFIG.clickInfluenceCount);

    // create animation sets for affected particles
    const posArray = particlesGeometry.attributes.position.array;
    const effArray = particlesGeometry.attributes.aEffectStrength.array;

    // Prepare anime targets arrays (we will update arrays manually in update callbacks)
    const animeObjs = [];

    for (let idx = 0; idx < affected.length; idx++) {
        const i = affected[idx].i;
        const i3 = i * 3;
        // base position is the original basePositions
        const baseX = basePositions[i3], baseY = basePositions[i3 + 1], baseZ = basePositions[i3 + 2];
        // compute push direction away from click point using current position
        const px = posArray[i3], py = posArray[i3 + 1], pz = posArray[i3 + 2];
        const dir = new THREE.Vector3(px - intersectPoint.x, py - intersectPoint.y, pz - intersectPoint.z);
        if (dir.lengthSq() < 0.0001) {
            // random small jitter if directly at click point
            dir.set((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5));
        }
        dir.normalize();
        const pushDist = THREE.MathUtils.randFloat(CONFIG.clickPushMin, CONFIG.clickPushMax) * (1.0 - (idx / affected.length) * 0.85);
        const targetX = baseX + dir.x * pushDist;
        const targetY = baseY + dir.y * pushDist;
        const targetZ = baseZ + dir.z * pushDist;

        // set clickTargets to current positions so idle logic can lerp to them when effectStrength > 0
        clickTargets[i3] = px; clickTargets[i3 + 1] = py; clickTargets[i3 + 2] = pz;

        // prepare object for anime
        const obj = {
            i,
            x: px, y: py, z: pz,
            tx: targetX, ty: targetY, tz: targetZ,
            eff: effArray[i]
        };
        animeObjs.push(obj);
    }

    // animate out (push + brighten)
    anime({
        targets: animeObjs,
        x: function(a) { return a.tx; },
        y: function(a) { return a.ty; },
        z: function(a) { return a.tz; },
        eff: 1.0,
        duration: CONFIG.clickDuration,
        easing: 'cubicBezier(.2,.8,.25,1)',
        update: function() {
            for (let k = 0; k < animeObjs.length; k++) {
                const o = animeObjs[k];
                const i3 = o.i * 3;
                clickTargets[i3] = o.x; clickTargets[i3 + 1] = o.y; clickTargets[i3 + 2] = o.z;
                effArray[o.i] = o.eff;
            }
            particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
        },
        complete: function() {
            // return to base positions after a small delay
            setTimeout(() => {
                const returnObjs = animeObjs.map(o => {
                    return {
                        i: o.i,
                        x: o.x, y: o.y, z: o.z,
                        tx: basePositions[o.i * 3],
                        ty: basePositions[o.i * 3 + 1],
                        tz: basePositions[o.i * 3 + 2],
                        eff: 0.0
                    };
                });
                anime({
                    targets: returnObjs,
                    x: function(a) { return a.tx; },
                    y: function(a) { return a.ty; },
                    z: function(a) { return a.tz; },
                    eff: 0.0,
                    duration: CONFIG.clickReturnDuration,
                    easing: 'cubicBezier(.2,.8,.25,1)',
                    update: function() {
                        for (let k = 0; k < returnObjs.length; k++) {
                            const o = returnObjs[k];
                            const i3 = o.i * 3;
                            clickTargets[i3] = o.x; clickTargets[i3 + 1] = o.y; clickTargets[i3 + 2] = o.z;
                            effArray[o.i] = o.eff;
                        }
                        particlesGeometry.attributes.aEffectStrength.needsUpdate = true;
                    }
                });
            }, CONFIG.clickReturnDelay);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

init();
