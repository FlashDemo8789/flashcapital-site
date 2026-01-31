/**
 * Globe.js - Vanilla Three.js implementation of the Flash Capital Globe
 * Ported from ServerNode.tsx
 */

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

// Configuration
const CONFIG = {
    textures: {
        map: 'images/textures/earth_atmos_2048.jpg',
        lights: 'images/textures/earth_lights_2048.png',
        clouds: 'images/textures/earth_clouds_1024.png',
        specular: 'images/textures/earth_specular_2048.jpg'
    },
    offices: [
        { name: "New York", lat: 40.7001, lon: -73.9685, url: "https://www.google.com/maps/search/?api=1&query=1+Dock+72+Way+Brooklyn+NY+11249" },
        { name: "Tokyo", lat: 35.6664, lon: 139.7052, url: "https://www.google.com/maps/search/?api=1&query=6-12-18+Jingumae+Shibuya+Tokyo+Japan" },
        { name: "Dubai", lat: 25.0754, lon: 55.1387, url: "https://www.google.com/maps/search/?api=1&query=Jumeirah+Village+Circle+Dubai" },
        { name: "Bangalore", lat: 12.9716, lon: 77.5946, url: "https://www.google.com/maps/search/?api=1&query=The+Pavilion+Church+Street+Bangalore" }
    ],
    rotationSpeed: 0.05,
    cloudSpeed: 0.07,
    positionOffset: new THREE.Vector3(0, 0, 0)
};

// Shaders
const ATMOSPHERE_VERTEX = `
varying vec3 vNormal;
void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ATMOSPHERE_FRAGMENT = `
uniform vec3 glowColor;
uniform float c;
uniform float p;
uniform vec3 sunDirection;
varying vec3 vNormal;
void main() {
    float intensity = pow(c - dot(vNormal, vec3(0, 0, 1.0)), p);
    intensity = clamp(intensity, 0.0, 0.4); 
    gl_FragColor = vec4(glowColor, intensity);
}
`;

const EARTH_VERTEX = `
varying vec2 vUv;
varying vec3 vNormalModel;
varying vec3 vViewPosition;
void main() {
    vUv = uv;
    vNormalModel = normalize(normal); 
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
}
`;

const EARTH_FRAGMENT = `
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D specularMap;
uniform vec3 sunDirection;

varying vec2 vUv;
varying vec3 vNormalModel;
varying vec3 vViewPosition;

void main() {
    vec3 normal = normalize(vNormalModel);
    vec3 sunDir = normalize(sunDirection);

    float sunOrientation = dot(normal, sunDir);
    float dayFactor = smoothstep(-0.15, 0.15, sunOrientation);

    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    float specularMask = texture2D(specularMap, vUv).r;

    vec3 halfVector = normalize(sunDir + vec3(0,0,1));
    float NdotH = max(0.0, dot(normal, halfVector));
    float specularIntensity = pow(NdotH, 80.0) * specularMask * 0.5;

    vec3 daySide = (dayColor * 0.9) + vec3(specularIntensity);
    vec3 nightSide = nightColor * vec3(2.5, 2.0, 1.2); 

    vec3 finalColor = mix(nightSide, daySide, dayFactor);
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Helper Functions
function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

function getSolarPosition(date) {
    const pi = Math.PI;
    const rad = pi / 180;
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * rad);
    const B = (360 / 365) * (dayOfYear - 81) * rad;
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const solarLon = 15 * (12 - (utcHours + eot / 60));
    let finalLon = solarLon % 360;
    if (finalLon > 180) finalLon -= 360;
    if (finalLon < -180) finalLon += 360;
    return { lat: declination, lon: finalLon };
}

export class FlashGlobe {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return; // Silent fail if container missing

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.toneMapping = THREE.ReinhardToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Group to hold Earth + Markers + Atmos
        this.mainGroup = new THREE.Group();
        this.mainGroup.position.set(0, 0, 0); // Kept at center for correct rotation
        this.scene.add(this.mainGroup);

        // Sub-groups for rotation
        this.earthGroup = new THREE.Group();
        this.cloudsGroup = new THREE.Group();
        this.mainGroup.add(this.earthGroup);
        this.mainGroup.add(this.cloudsGroup);

        this.sunDir = new THREE.Vector3(1, 0, 0);
        this.clock = new THREE.Clock();

        this.loadAssets().then(() => {
            this.initEarth();
            this.initAtmosphere();
            this.initMarkers();
            this.initLights();
            this.initControls();
            this.initInteraction();

            // Start Update Loops
            this.updateSunPosition();
            setInterval(() => this.updateSunPosition(), 60000);
            this.animate();
        });

        window.addEventListener('resize', this.onResize.bind(this));
    }

    async loadAssets() {
        const loader = new THREE.TextureLoader();
        const loadTexture = (url) => new Promise(resolve => loader.load(url, resolve, undefined, () => resolve(null)));

        this.textures = {
            map: await loadTexture(CONFIG.textures.map),
            lights: await loadTexture(CONFIG.textures.lights),
            clouds: await loadTexture(CONFIG.textures.clouds),
            specular: await loadTexture(CONFIG.textures.specular)
        };
    }

    updateSunPosition() {
        const now = new Date();
        const solarPos = getSolarPosition(now);
        this.sunDir = latLonToVector3(solarPos.lat, solarPos.lon, 5).normalize();

        // Update shader uniforms if they exist
        if (this.earthMaterial) this.earthMaterial.uniforms.sunDirection.value.copy(this.sunDir);
        if (this.atmosMaterial) this.atmosMaterial.uniforms.sunDirection.value.copy(this.sunDir);
    }

    initEarth() {
        // Earth Base
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        this.earthMaterial = new THREE.ShaderMaterial({
            uniforms: {
                dayTexture: { value: this.textures.map },
                nightTexture: { value: this.textures.lights || this.textures.map },
                specularMap: { value: this.textures.specular || this.textures.map },
                sunDirection: { value: this.sunDir }
            },
            vertexShader: EARTH_VERTEX,
            fragmentShader: EARTH_FRAGMENT
        });

        const earthMesh = new THREE.Mesh(geometry, this.earthMaterial);
        this.earthGroup.add(earthMesh);

        // Clouds (Shadow)
        if (this.textures.clouds) {
            const cloudShadowGeo = new THREE.SphereGeometry(1, 64, 64);
            const cloudShadowMat = new THREE.MeshBasicMaterial({
                map: this.textures.clouds,
                transparent: true,
                opacity: 0.15,
                color: 0x000000,
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            this.cloudShadowMesh = new THREE.Mesh(cloudShadowGeo, cloudShadowMat);
            this.cloudShadowMesh.scale.set(1.005, 1.005, 1.005);
            this.cloudsGroup.add(this.cloudShadowMesh);

            // Clouds (Visible)
            const cloudGeo = new THREE.SphereGeometry(1, 64, 64);
            const cloudMat = new THREE.MeshPhongMaterial({
                map: this.textures.clouds,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
            this.cloudMesh.scale.set(1.015, 1.015, 1.015);
            this.cloudsGroup.add(this.cloudMesh);
        }
    }

    initAtmosphere() {
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        this.atmosMaterial = new THREE.ShaderMaterial({
            blending: THREE.NormalBlending,
            side: THREE.BackSide,
            transparent: true,
            uniforms: {
                glowColor: { value: new THREE.Color('#60a5fa') },
                c: { value: 0.1 },
                p: { value: 6.0 },
                sunDirection: { value: this.sunDir }
            },
            vertexShader: ATMOSPHERE_VERTEX,
            fragmentShader: ATMOSPHERE_FRAGMENT
        });
        const mesh = new THREE.Mesh(geometry, this.atmosMaterial);
        mesh.scale.set(1.02, 1.02, 1.02);
        this.mainGroup.add(mesh); // Add to main group, doesn't rotate with earth
    }

    initMarkers() {
        this.markersGroup = new THREE.Group();
        this.earthGroup.add(this.markersGroup); // Rotate with Earth
        this.pulsingMarkers = []; // Store refs for animation

        CONFIG.offices.forEach((office, index) => {
            const pos = latLonToVector3(office.lat, office.lon, 1);
            const markerGroup = new THREE.Group();
            markerGroup.position.copy(pos);
            markerGroup.lookAt(new THREE.Vector3(0, 0, 0));
            markerGroup.userData = { url: office.url, isMarker: true, name: office.name };

            // Glowing point light (cyan/electric blue)
            const light = new THREE.PointLight(0x00d4ff, 1.5, 0.5, 2);
            light.position.set(0, 0, 0.05);
            markerGroup.add(light);

            // Stick (gradient effect - brighter at top)
            const stickGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8);
            const stickMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.7,
                toneMapped: false
            });
            const stick = new THREE.Mesh(stickGeo, stickMat);
            stick.position.set(0, 0, 0.06);
            stick.rotation.set(Math.PI / 2, 0, 0);
            markerGroup.add(stick);

            // Core head (bright cyan)
            const headGeo = new THREE.SphereGeometry(0.018, 16, 16);
            const headMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                toneMapped: false
            });
            const head = new THREE.Mesh(headGeo, headMat);
            head.position.set(0, 0, 0.12);
            head.userData = { parentGroup: markerGroup };
            markerGroup.add(head);

            // Outer glow sphere (soft glow effect)
            const glowGeo = new THREE.SphereGeometry(0.025, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.3,
                toneMapped: false
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.set(0, 0, 0.12);
            markerGroup.add(glow);

            // Pulsing ring (animates outward)
            const pulseRingGeo = new THREE.RingGeometry(0.02, 0.025, 32);
            const pulseRingMat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                toneMapped: false
            });
            const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
            pulseRing.position.set(0, 0, 0.12);
            pulseRing.userData = { initialScale: 1, phaseOffset: index * 0.5 };
            markerGroup.add(pulseRing);

            // Second pulsing ring (offset timing)
            const pulseRing2Geo = new THREE.RingGeometry(0.02, 0.025, 32);
            const pulseRing2Mat = new THREE.MeshBasicMaterial({
                color: 0x00d4ff,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide,
                toneMapped: false
            });
            const pulseRing2 = new THREE.Mesh(pulseRing2Geo, pulseRing2Mat);
            pulseRing2.position.set(0, 0, 0.12);
            pulseRing2.userData = { initialScale: 1, phaseOffset: index * 0.5 + 1.0 };
            markerGroup.add(pulseRing2);

            // Store references for animation
            this.pulsingMarkers.push({
                head,
                glow,
                light,
                pulseRing,
                pulseRing2,
                headMat,
                glowMat,
                pulseRingMat,
                pulseRing2Mat,
                phaseOffset: index * 0.7 // Stagger animations
            });

            // Larger Hit Box (Invisible) for easier clicking
            const hitGeo = new THREE.SphereGeometry(0.06, 8, 8);
            const hitMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitMesh = new THREE.Mesh(hitGeo, hitMat);
            hitMesh.position.set(0, 0, 0.12);
            hitMesh.userData = { parentGroup: markerGroup };
            markerGroup.add(hitMesh);

            this.markersGroup.add(markerGroup);
        });
    }

    initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Bind events
        this.container.addEventListener('click', this.onClick.bind(this));
        this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    getIntersects(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Raycast against markersGroup children (recursive to hit parts)
        if (!this.markersGroup) return [];
        return this.raycaster.intersectObjects(this.markersGroup.children, true);
    }

    onClick(event) {
        if (this.isDragging) return; // Prevent click after drag

        const intersects = this.getIntersects(event);
        if (intersects.length > 0) {
            // Find the first hit that has a parentGroup (our marker)
            const hit = intersects.find(i => i.object.userData.parentGroup);
            if (hit) {
                const url = hit.object.userData.parentGroup.userData.url;
                if (url) window.open(url, '_blank');
            }
        }
    }

    onMouseMove(event) {
        const intersects = this.getIntersects(event);
        const hit = intersects.find(i => i.object.userData.parentGroup);
        if (hit) {
            this.container.style.cursor = 'pointer';
        } else {
            this.container.style.cursor = 'default';
        }
    }

    initLights() {
        const sunLight = new THREE.DirectionalLight(0xffffff, 4.0);
        sunLight.position.set(5, 0, 2);
        this.scene.add(sunLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
        this.scene.add(ambientLight);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.addEventListener('start', () => { this.isDragging = true; });
        this.controls.addEventListener('end', () => { setTimeout(() => this.isDragging = false, 100); }); // Small delay to prevent click firing
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.enableRotate = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.target.set(0, 0, 0);

        // Initial Camera Position
        this.camera.position.set(0, 0, 3.2);

        // Offset the camera view so (0,0,0) appears on the right
        this.updateCameraOffset();
    }

    onResize() {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.updateCameraOffset();
    }

    updateCameraOffset() {
        if (window.innerWidth <= 1024) {
            this.camera.clearViewOffset();
            return;
        }

        // Shift center to the left, making the object appear on the right
        const offset = this.container.clientWidth * 0.25;
        this.camera.setViewOffset(
            this.container.clientWidth,
            this.container.clientHeight,
            -offset, 0, // Negative x offset shifts window left, effectively moving scene right? Or vice versa.
            this.container.clientWidth,
            this.container.clientHeight
        );
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // Custom Rotations to match usage
        if (this.earthGroup) this.earthGroup.rotation.y = time * 0.05;
        if (this.cloudsGroup) this.cloudsGroup.rotation.y = time * 0.07;

        // Animate pulsing markers
        if (this.pulsingMarkers) {
            this.pulsingMarkers.forEach((marker, i) => {
                const t = time + marker.phaseOffset;

                // Head brightness pulse
                const brightness = 0.85 + 0.15 * Math.sin(t * 2);
                marker.headMat.color.setRGB(0, brightness * 0.83, brightness);

                // Glow opacity pulse
                marker.glowMat.opacity = 0.2 + 0.15 * Math.sin(t * 2 + 0.5);

                // Light intensity pulse
                marker.light.intensity = 1.2 + 0.5 * Math.sin(t * 2.5);

                // Pulsing ring 1 animation (expands outward and fades)
                const pulse1 = (t * 0.8) % 2; // 0 to 2 cycle
                const scale1 = 1 + pulse1 * 2.5;
                marker.pulseRing.scale.set(scale1, scale1, 1);
                marker.pulseRingMat.opacity = Math.max(0, 0.6 * (1 - pulse1 / 2));

                // Pulsing ring 2 animation (offset timing)
                const pulse2 = ((t + 1) * 0.8) % 2;
                const scale2 = 1 + pulse2 * 2.5;
                marker.pulseRing2.scale.set(scale2, scale2, 1);
                marker.pulseRing2Mat.opacity = Math.max(0, 0.4 * (1 - pulse2 / 2));
            });
        }

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
