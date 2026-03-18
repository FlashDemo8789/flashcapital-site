/**
 * Globe.js - Three.js globe for the Flash Capital homepage hero.
 * Refactored for lifecycle safety, calmer visual design, and mobile-aware performance.
 */

import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/controls/OrbitControls.js';

const BASE_CONFIG = {
    textures: {
        map: 'images/textures/earth_atmos_2048.jpg',
        lights: 'images/textures/earth_lights_2048.png',
        clouds: 'images/textures/earth_clouds_1024.png',
        specular: 'images/textures/earth_specular_2048.jpg'
    },
    offices: [
        { name: 'New York', lat: 40.7001, lon: -73.9685, url: 'https://www.google.com/maps/search/?api=1&query=1+Dock+72+Way+Brooklyn+NY+11249' },
        { name: 'Tokyo', lat: 35.6664, lon: 139.7052, url: 'https://www.google.com/maps/search/?api=1&query=6-12-18+Jingumae+Shibuya+Tokyo+Japan' },
        { name: 'Dubai', lat: 25.0754, lon: 55.1387, url: 'https://www.google.com/maps/search/?api=1&query=Jumeirah+Village+Circle+Dubai' },
        { name: 'Bangalore', lat: 12.9716, lon: 77.5946, url: 'https://www.google.com/maps/search/?api=1&query=The+Pavilion+Church+Street+Bangalore' }
    ],
    rotationSpeed: 0.03,
    cloudSpeed: 0.04,
    markerPulseSpeed: 0.9,
    markerPulseScale: 1.4,
    markerRingOpacity: 0.28,
    markerHeadOpacity: 0.92,
    markerHaloOpacity: 0.2,
    sunUpdateIntervalMs: 60000,
    desktopCameraDistance: 3.2,
    mobileCameraDistance: 2.95
};

const QUALITY_PRESETS = {
    desktop: {
        pixelRatioCap: 1.75,
        sphereSegments: 64,
        cloudSegments: 56,
        atmosphereSegments: 56,
        cloudOpacity: 0.22,
        cloudShadowOpacity: 0.08,
        enableCloudShadows: true,
        autoRotateSpeed: 0.16
    },
    mobile: {
        pixelRatioCap: 1.2,
        sphereSegments: 36,
        cloudSegments: 28,
        atmosphereSegments: 32,
        cloudOpacity: 0.14,
        cloudShadowOpacity: 0.0,
        enableCloudShadows: false,
        autoRotateSpeed: 0.1
    }
};

const THEME_PRESETS = {
    calm: {
        markerStemColor: '#7e9cc2',
        markerHeadColor: '#b9cee6',
        markerHeadHoverColor: '#d9e6f6',
        markerHaloColor: '#9fbad8',
        markerRingColor: '#86a9cf',
        atmosphereColor: '#8ba8c7'
    }
};

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
    vec3 normal = normalize(vNormal);
    float rim = pow(max(c - dot(normal, vec3(0.0, 0.0, 1.0)), 0.0), p);
    float sunBoost = max(dot(normal, normalize(sunDirection)), 0.0);
    float intensity = rim * mix(0.65, 1.0, sunBoost);
    intensity = clamp(intensity, 0.0, 0.22);
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
    float dayFactor = smoothstep(-0.16, 0.16, sunOrientation);

    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    float specularMask = texture2D(specularMap, vUv).r;

    vec3 halfVector = normalize(sunDir + vec3(0.0, 0.0, 1.0));
    float NdotH = max(0.0, dot(normal, halfVector));
    float specularIntensity = pow(NdotH, 60.0) * specularMask * 0.35;

    vec3 daySide = (dayColor * 0.9) + vec3(specularIntensity);
    vec3 nightSide = nightColor * vec3(1.8, 1.55, 1.0);

    vec3 finalColor = mix(nightSide, daySide, dayFactor);
    gl_FragColor = vec4(finalColor, 1.0);
}
`;

function latLonToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
}

function getSolarPosition(date) {
    const rad = Math.PI / 180;
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * rad);
    const b = (360 / 365) * (dayOfYear - 81) * rad;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
    const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    const solarLon = 15 * (12 - (utcHours + eot / 60));
    let finalLon = solarLon % 360;
    if (finalLon > 180) finalLon -= 360;
    if (finalLon < -180) finalLon += 360;
    return { lat: declination, lon: finalLon };
}

function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) {
        material.forEach((item) => disposeMaterial(item));
        return;
    }

    if (material.uniforms) {
        Object.values(material.uniforms).forEach((uniform) => {
            if (uniform && uniform.value && uniform.value.isTexture) {
                uniform.value.dispose();
            }
        });
    }

    Object.keys(material).forEach((key) => {
        const value = material[key];
        if (value && value.isTexture) {
            value.dispose();
        }
    });

    material.dispose();
}

function resolveQualityMode(optionValue) {
    if (optionValue === 'desktop' || optionValue === 'mobile') {
        return optionValue;
    }
    return window.innerWidth <= 1024 ? 'mobile' : 'desktop';
}

function resolveOptions(userOptions = {}) {
    const qualityMode = resolveQualityMode(userOptions.quality);
    const quality = QUALITY_PRESETS[qualityMode];
    const theme = THEME_PRESETS[userOptions.theme] || THEME_PRESETS.calm;

    return {
        ...BASE_CONFIG,
        ...quality,
        ...theme,
        ...userOptions,
        qualityMode
    };
}

export class FlashGlobe {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.options = resolveOptions(options);

        this.isDisposed = false;
        this.isDragging = false;
        this.dragResetTimeoutId = null;
        this.animationFrameId = null;
        this.sunTimerId = null;
        this.hoveredMarker = null;
        this.markers = [];
        this.sunDir = new THREE.Vector3(1, 0, 0);
        this.textures = {};
        this.clock = new THREE.Clock();

        this.handlers = {
            onResize: this.onResize.bind(this),
            onClick: this.onClick.bind(this),
            onMouseMove: this.onMouseMove.bind(this),
            onMouseLeave: this.onMouseLeave.bind(this),
            onControlStart: this.onControlStart.bind(this),
            onControlEnd: this.onControlEnd.bind(this)
        };

        this.frame = this.frame.bind(this);

        this.init().catch((error) => {
            console.error('FlashGlobe init failed:', error);
            this.dispose();
        });
    }

    async init() {
        this.setupScene();
        await this.loadAssets();

        if (this.isDisposed) return;

        this.buildScene();
        this.bindEvents();
        this.start();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.options.pixelRatioCap));

        this.container.appendChild(this.renderer.domElement);
        this.container.setAttribute('role', 'img');
        this.container.setAttribute('aria-label', 'Interactive globe showing Flash Capital office locations');

        this.mainGroup = new THREE.Group();
        this.earthGroup = new THREE.Group();
        this.cloudsGroup = new THREE.Group();
        this.mainGroup.add(this.earthGroup);
        this.mainGroup.add(this.cloudsGroup);
        this.scene.add(this.mainGroup);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    async loadAssets() {
        const loader = new THREE.TextureLoader();
        const loadTexture = (url) => new Promise((resolve) => {
            loader.load(url, resolve, undefined, () => resolve(null));
        });

        const loaded = await Promise.all([
            loadTexture(this.options.textures.map),
            loadTexture(this.options.textures.lights),
            loadTexture(this.options.textures.clouds),
            loadTexture(this.options.textures.specular)
        ]);

        this.textures = {
            map: loaded[0],
            lights: loaded[1],
            clouds: loaded[2],
            specular: loaded[3]
        };
    }

    buildScene() {
        this.initEarth();
        this.initAtmosphere();
        this.initMarkers();
        this.initLights();
        this.initControls();
        this.onResize();
        this.updateSunPosition();
    }

    initEarth() {
        const earthGeometry = new THREE.SphereGeometry(1, this.options.sphereSegments, this.options.sphereSegments);
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

        this.earthMesh = new THREE.Mesh(earthGeometry, this.earthMaterial);
        this.earthGroup.add(this.earthMesh);

        if (this.textures.clouds) {
            if (this.options.enableCloudShadows && this.options.cloudShadowOpacity > 0) {
                const cloudShadowGeometry = new THREE.SphereGeometry(1, this.options.cloudSegments, this.options.cloudSegments);
                const cloudShadowMaterial = new THREE.MeshBasicMaterial({
                    map: this.textures.clouds,
                    transparent: true,
                    opacity: this.options.cloudShadowOpacity,
                    color: 0x000000,
                    blending: THREE.NormalBlending,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });

                this.cloudShadowMesh = new THREE.Mesh(cloudShadowGeometry, cloudShadowMaterial);
                this.cloudShadowMesh.scale.set(1.004, 1.004, 1.004);
                this.cloudsGroup.add(this.cloudShadowMesh);
            }

            const cloudGeometry = new THREE.SphereGeometry(1, this.options.cloudSegments, this.options.cloudSegments);
            const cloudMaterial = new THREE.MeshPhongMaterial({
                map: this.textures.clouds,
                transparent: true,
                opacity: this.options.cloudOpacity,
                blending: THREE.NormalBlending,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            this.cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
            this.cloudMesh.scale.set(1.013, 1.013, 1.013);
            this.cloudsGroup.add(this.cloudMesh);
        }
    }

    initAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(1, this.options.atmosphereSegments, this.options.atmosphereSegments);
        this.atmosMaterial = new THREE.ShaderMaterial({
            blending: THREE.NormalBlending,
            side: THREE.BackSide,
            transparent: true,
            uniforms: {
                glowColor: { value: new THREE.Color(this.options.atmosphereColor) },
                c: { value: 0.13 },
                p: { value: 5.0 },
                sunDirection: { value: this.sunDir }
            },
            vertexShader: ATMOSPHERE_VERTEX,
            fragmentShader: ATMOSPHERE_FRAGMENT
        });

        this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, this.atmosMaterial);
        this.atmosphereMesh.scale.set(1.019, 1.019, 1.019);
        this.mainGroup.add(this.atmosphereMesh);
    }

    initMarkers() {
        this.markersGroup = new THREE.Group();
        this.earthGroup.add(this.markersGroup);
        this.markers = [];

        this.options.offices.forEach((office, index) => {
            const markerGroup = new THREE.Group();
            const markerPosition = latLonToVector3(office.lat, office.lon, 1);
            markerGroup.position.copy(markerPosition);
            markerGroup.lookAt(new THREE.Vector3(0, 0, 0));
            markerGroup.userData = { url: office.url, isMarker: true, name: office.name };

            const stemGeometry = new THREE.CylinderGeometry(0.0032, 0.0032, 0.1, 8);
            const stemMaterial = new THREE.MeshBasicMaterial({
                color: this.options.markerStemColor,
                transparent: true,
                opacity: 0.58,
                toneMapped: false
            });
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.position.set(0, 0, 0.05);
            stem.rotation.set(Math.PI / 2, 0, 0);
            markerGroup.add(stem);

            const headGeometry = new THREE.SphereGeometry(0.013, 12, 12);
            const headMaterial = new THREE.MeshBasicMaterial({
                color: this.options.markerHeadColor,
                transparent: true,
                opacity: this.options.markerHeadOpacity,
                toneMapped: false
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.position.set(0, 0, 0.1);
            markerGroup.add(head);

            const haloGeometry = new THREE.SphereGeometry(0.021, 12, 12);
            const haloMaterial = new THREE.MeshBasicMaterial({
                color: this.options.markerHaloColor,
                transparent: true,
                opacity: this.options.markerHaloOpacity,
                toneMapped: false
            });
            const halo = new THREE.Mesh(haloGeometry, haloMaterial);
            halo.position.set(0, 0, 0.1);
            markerGroup.add(halo);

            const ringGeometry = new THREE.RingGeometry(0.018, 0.022, 24);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: this.options.markerRingColor,
                transparent: true,
                opacity: this.options.markerRingOpacity,
                side: THREE.DoubleSide,
                toneMapped: false
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.set(0, 0, 0.1);
            markerGroup.add(ring);

            const hitGeometry = new THREE.SphereGeometry(0.055, 8, 8);
            const hitMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                depthWrite: false,
                toneMapped: false
            });
            const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
            hitMesh.position.set(0, 0, 0.1);
            markerGroup.add(hitMesh);

            const markerRecord = {
                office,
                group: markerGroup,
                head,
                halo,
                ring,
                headMaterial,
                haloMaterial,
                ringMaterial,
                baseHeadColor: new THREE.Color(this.options.markerHeadColor),
                hoverHeadColor: new THREE.Color(this.options.markerHeadHoverColor),
                hoverProgress: 0,
                phaseOffset: index * 0.8
            };

            hitMesh.userData.parentMarker = markerRecord;
            head.userData.parentMarker = markerRecord;
            halo.userData.parentMarker = markerRecord;
            ring.userData.parentMarker = markerRecord;

            this.markers.push(markerRecord);
            this.markersGroup.add(markerGroup);
        });
    }

    initLights() {
        this.sunLight = new THREE.DirectionalLight(0xffffff, 2.4);
        this.sunLight.position.set(5, 0, 2);
        this.scene.add(this.sunLight);

        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
        this.scene.add(this.ambientLight);
    }

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.rotateSpeed = 0.45;
        this.controls.enableRotate = true;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = this.options.autoRotateSpeed;
        this.controls.target.set(0, 0, 0);

        this.controls.addEventListener('start', this.handlers.onControlStart);
        this.controls.addEventListener('end', this.handlers.onControlEnd);
    }

    bindEvents() {
        window.addEventListener('resize', this.handlers.onResize);
        this.container.addEventListener('click', this.handlers.onClick);
        this.container.addEventListener('mousemove', this.handlers.onMouseMove);
        this.container.addEventListener('mouseleave', this.handlers.onMouseLeave);
    }

    start() {
        this.updateSunPosition();
        this.sunTimerId = window.setInterval(() => {
            this.updateSunPosition();
        }, this.options.sunUpdateIntervalMs);
        this.animationFrameId = requestAnimationFrame(this.frame);
    }

    onControlStart() {
        this.isDragging = true;
        if (this.dragResetTimeoutId) {
            clearTimeout(this.dragResetTimeoutId);
            this.dragResetTimeoutId = null;
        }
    }

    onControlEnd() {
        if (this.dragResetTimeoutId) clearTimeout(this.dragResetTimeoutId);
        this.dragResetTimeoutId = window.setTimeout(() => {
            this.isDragging = false;
            this.dragResetTimeoutId = null;
        }, 90);
    }

    updateSunPosition() {
        const solarPos = getSolarPosition(new Date());
        this.sunDir = latLonToVector3(solarPos.lat, solarPos.lon, 5).normalize();
        if (this.earthMaterial) this.earthMaterial.uniforms.sunDirection.value.copy(this.sunDir);
        if (this.atmosMaterial) this.atmosMaterial.uniforms.sunDirection.value.copy(this.sunDir);
    }

    getIntersects(event) {
        if (!this.markersGroup) return [];

        const rect = this.container.getBoundingClientRect();
        if (!rect.width || !rect.height) return [];

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);

        return this.raycaster.intersectObjects(this.markersGroup.children, true);
    }

    onClick(event) {
        if (this.isDragging) return;

        const hit = this.getIntersects(event).find((intersection) => intersection.object.userData.parentMarker);
        if (!hit) return;

        const marker = hit.object.userData.parentMarker;
        if (marker && marker.office && marker.office.url) {
            window.open(marker.office.url, '_blank', 'noopener,noreferrer');
        }
    }

    onMouseMove(event) {
        const hit = this.getIntersects(event).find((intersection) => intersection.object.userData.parentMarker);
        if (hit) {
            this.hoveredMarker = hit.object.userData.parentMarker;
            this.container.style.cursor = 'pointer';
            return;
        }

        this.hoveredMarker = null;
        this.container.style.cursor = 'default';
    }

    onMouseLeave() {
        this.hoveredMarker = null;
        if (this.container) this.container.style.cursor = 'default';
    }

    onResize() {
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return;

        const mobileCap = Math.min(this.options.pixelRatioCap, 1.2);
        const adaptiveCap = window.innerWidth <= 1024 ? mobileCap : this.options.pixelRatioCap;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, adaptiveCap));
        this.renderer.setSize(width, height);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        if (window.innerWidth <= 1024) {
            this.camera.position.set(0, 0, this.options.mobileCameraDistance);
        } else {
            this.camera.position.set(0, 0, this.options.desktopCameraDistance);
        }

        this.updateCameraOffset();
    }

    updateCameraOffset() {
        if (!this.camera || !this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (!width || !height) return;

        if (window.innerWidth <= 1024) {
            this.camera.clearViewOffset();
            return;
        }

        const offset = width * 0.22;
        this.camera.setViewOffset(width, height, -offset, 0, width, height);
    }

    animateMarkers(time) {
        this.markers.forEach((marker) => {
            const pulse = (Math.sin((time * this.options.markerPulseSpeed) + marker.phaseOffset) + 1) * 0.5;
            const isHovered = marker === this.hoveredMarker;
            marker.hoverProgress += ((isHovered ? 1 : 0) - marker.hoverProgress) * 0.1;

            const ringScale = 1 + (pulse * this.options.markerPulseScale) + (marker.hoverProgress * 0.18);
            marker.ring.scale.set(ringScale, ringScale, 1);
            marker.ringMaterial.opacity = (this.options.markerRingOpacity * (1 - (pulse * 0.55))) + (marker.hoverProgress * 0.06);
            marker.haloMaterial.opacity = this.options.markerHaloOpacity + (pulse * 0.05) + (marker.hoverProgress * 0.06);
            marker.headMaterial.opacity = this.options.markerHeadOpacity + (marker.hoverProgress * 0.08);

            marker.headMaterial.color.copy(marker.baseHeadColor).lerp(marker.hoverHeadColor, marker.hoverProgress);
            const scale = 1 + (marker.hoverProgress * 0.06);
            marker.group.scale.set(scale, scale, scale);
        });
    }

    frame() {
        if (this.isDisposed) return;

        const time = this.clock.getElapsedTime();
        if (this.earthGroup) this.earthGroup.rotation.y = time * this.options.rotationSpeed;
        if (this.cloudsGroup) this.cloudsGroup.rotation.y = time * this.options.cloudSpeed;

        this.animateMarkers(time);

        if (this.controls) this.controls.update();
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        this.animationFrameId = requestAnimationFrame(this.frame);
    }

    dispose() {
        if (this.isDisposed) return;
        this.isDisposed = true;
        const handlers = this.handlers || {};

        if (this.sunTimerId) {
            clearInterval(this.sunTimerId);
            this.sunTimerId = null;
        }

        if (this.dragResetTimeoutId) {
            clearTimeout(this.dragResetTimeoutId);
            this.dragResetTimeoutId = null;
        }

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (handlers.onResize) {
            window.removeEventListener('resize', handlers.onResize);
        }
        if (this.container) {
            if (handlers.onClick) this.container.removeEventListener('click', handlers.onClick);
            if (handlers.onMouseMove) this.container.removeEventListener('mousemove', handlers.onMouseMove);
            if (handlers.onMouseLeave) this.container.removeEventListener('mouseleave', handlers.onMouseLeave);
            this.container.style.cursor = 'default';
        }

        if (this.controls) {
            if (handlers.onControlStart) this.controls.removeEventListener('start', handlers.onControlStart);
            if (handlers.onControlEnd) this.controls.removeEventListener('end', handlers.onControlEnd);
            this.controls.dispose();
            this.controls = null;
        }

        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    disposeMaterial(object.material);
                }
            });
        }

        if (this.textures) {
            Object.values(this.textures).forEach((texture) => {
                if (texture && texture.isTexture) texture.dispose();
            });
            this.textures = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (typeof this.renderer.forceContextLoss === 'function') {
                this.renderer.forceContextLoss();
            }

            const canvas = this.renderer.domElement;
            if (canvas && canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            this.renderer = null;
        }

        this.scene = null;
        this.camera = null;
        this.mainGroup = null;
        this.earthGroup = null;
        this.cloudsGroup = null;
        this.markersGroup = null;
        this.markers = [];
        this.hoveredMarker = null;
        this.handlers = null;
    }

    destroy() {
        this.dispose();
    }
}
