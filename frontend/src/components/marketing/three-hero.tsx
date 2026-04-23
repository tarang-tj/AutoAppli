"use client";

/**
 * ThreeHero — Floating "application pipeline" scene for the marketing hero.
 *
 * Design choices (so future-you doesn't have to re-derive them):
 *  - Plain Three.js (not @react-three/fiber) to dodge React 19 × R3F compat churn.
 *  - No GLTF, no textures — just lit planes. Ships ~60 KB (three's share of bundle).
 *  - Respects prefers-reduced-motion: renders static, no animation, no mouse tracking.
 *  - Disposes geometry + materials + renderer on unmount to avoid GPU leaks on route change.
 *  - aria-hidden=true: this is decorative, screen readers should skip it.
 *
 * The scene: 5 stage columns (Saved → Applied → Interview → Offer → Closed)
 * with ~3 cards each, drifting vertically. Background has ambient particles and
 * the camera parallaxes toward the mouse. Looks like "your job search pipeline, alive."
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

const STAGE_COLORS = [
  0x3b82f6, // blue-500 — Saved
  0x8b5cf6, // violet-500 — Applied
  0xf59e0b, // amber-500 — Interview
  0x10b981, // emerald-500 — Offer
  0x64748b, // slate-500 — Closed
];

type CardUserData = {
  baseY: number;
  phase: number;
  speed: number;
  bob: number;
};

function createCard(color: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(1.8, 1.1);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.25,
    roughness: 0.55,
    transparent: true,
    opacity: 0.85,
    emissive: color,
    emissiveIntensity: 0.18,
    side: THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}

export default function ThreeHero() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Respect motion preferences
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || Math.max(500, window.innerHeight * 0.6);

    // ─── renderer ────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // ─── scene + camera ──────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 12);

    // ─── lighting ────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const keyLight = new THREE.DirectionalLight(0x60a5fa, 1.1); // blue-400
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.55); // violet-500
    rimLight.position.set(-5, 3, 4);
    scene.add(rimLight);

    // ─── cards (5 stages × 3 cards) ──────────────────────────────────────
    const cards: THREE.Mesh[] = [];
    STAGE_COLORS.forEach((color, colIdx) => {
      const x = (colIdx - 2) * 2.4; // 5 columns centered on 0
      for (let row = 0; row < 3; row++) {
        const card = createCard(color);
        const baseY = (row - 1) * 1.5 + (Math.random() - 0.5) * 0.2;
        card.position.set(x, baseY, (Math.random() - 0.5) * 0.6);
        card.rotation.z = (Math.random() - 0.5) * 0.06;
        card.userData = {
          baseY,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.35,
          bob: 0.12 + Math.random() * 0.08,
        } satisfies CardUserData;
        scene.add(card);
        cards.push(card);
      }
    });

    // ─── background particles ───────────────────────────────────────────
    const particleCount = 80;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.05,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── mouse parallax ──────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!prefersReducedMotion) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }

    // ─── responsive ──────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // ─── animate ─────────────────────────────────────────────────────────
    let rafId = 0;
    const start = performance.now();

    const renderOnce = () => renderer.render(scene, camera);

    const animate = () => {
      const t = (performance.now() - start) / 1000;

      cards.forEach((c) => {
        const u = c.userData as CardUserData;
        c.position.y = u.baseY + Math.sin(t * u.speed + u.phase) * u.bob;
        c.rotation.y = Math.sin(t * 0.3 + u.phase) * 0.08;
      });

      particles.rotation.y = t * 0.02;

      // Smoothed camera parallax
      target.x += (mouse.x * 0.3 - target.x) * 0.05;
      target.y += (mouse.y * 0.2 - target.y) * 0.05;
      camera.position.x = target.x;
      camera.position.y = -target.y;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    if (prefersReducedMotion) {
      renderOnce();
    } else {
      animate();
    }

    // ─── cleanup ─────────────────────────────────────────────────────────
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);

      cards.forEach((c) => {
        (c.geometry as THREE.BufferGeometry).dispose();
        (c.material as THREE.Material).dispose();
      });
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
