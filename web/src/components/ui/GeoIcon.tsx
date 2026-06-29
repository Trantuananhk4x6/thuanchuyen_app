"use client";
/**
 * GeoIcon — Three.js animated 3D icons via WebGL.
 *
 * Shared-renderer pattern: ONE WebGLRenderer + ONE global RAF loop for all instances.
 * Each icon gets its own <canvas> (2D), the renderer draws off-screen and copies via
 * ctx.drawImage — so the browser sees only 1 WebGL context regardless of icon count.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type GeoIconType = "route" | "realtime" | "payment" | "notification" | "backhaul" | "cargo" | "ai";

const PALETTE = {
  route:        { primary: 0x6366f1, secondary: 0x22d3ee },
  realtime:     { primary: 0x22d3ee, secondary: 0x34d399 },
  payment:      { primary: 0x34d399, secondary: 0x6366f1 },
  notification: { primary: 0xf472b6, secondary: 0xa78bfa },
  backhaul:     { primary: 0xfbbf24, secondary: 0xf97316 },
  cargo:        { primary: 0xa78bfa, secondary: 0x22d3ee },
  ai:           { primary: 0x22d3ee, secondary: 0x6366f1 },
};

// ─── Scene builders ───────────────────────────────────────────────────────────

function buildScene(type: GeoIconType): {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  tick: (frame: number) => void;
  dispose: () => void;
} {
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4;

  const { primary, secondary } = PALETTE[type];
  const disposables: (THREE.Material | THREE.BufferGeometry)[] = [];

  const wireMat = (c: number, opacity = 0.9) => {
    const m = new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity });
    disposables.push(m);
    return m;
  };
  const lineMat = (c: number, opacity = 0.7) => {
    const m = new THREE.LineBasicMaterial({ color: c, transparent: true, opacity });
    disposables.push(m);
    return m;
  };
  const addGeo = <T extends THREE.BufferGeometry>(g: T) => { disposables.push(g); return g; };

  let tick: (frame: number) => void;

  switch (type) {
    case "ai":
    case "route": {
      const mesh      = new THREE.Mesh(addGeo(new THREE.IcosahedronGeometry(1.2, 0)), wireMat(primary));
      const innerMesh = new THREE.Mesh(addGeo(new THREE.IcosahedronGeometry(0.6, 0)), wireMat(secondary, 0.5));
      scene.add(mesh, innerMesh);
      tick = (f) => {
        mesh.rotation.y = f * 0.018; mesh.rotation.x = f * 0.009;
        innerMesh.rotation.y = -f * 0.025; innerMesh.rotation.z = f * 0.012;
      };
      break;
    }

    case "realtime": {
      const sphere = new THREE.Mesh(addGeo(new THREE.SphereGeometry(0.6, 12, 8)), wireMat(primary));
      const ring1  = new THREE.Mesh(addGeo(new THREE.TorusGeometry(1.2, 0.04, 4, 36)), wireMat(secondary, 0.7));
      const ring2  = new THREE.Mesh(addGeo(new THREE.TorusGeometry(1.6, 0.03, 4, 36)), wireMat(primary, 0.45));
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dot    = new THREE.Mesh(addGeo(new THREE.SphereGeometry(0.12, 6, 6)), dotMat);
      disposables.push(dotMat);
      ring1.rotation.x = Math.PI / 2;
      ring2.rotation.x = Math.PI / 4;
      scene.add(sphere, ring1, ring2, dot);
      tick = (f) => {
        ring1.rotation.z = f * 0.022; ring2.rotation.y = f * 0.015; sphere.rotation.y = f * 0.01;
        dot.position.set(Math.cos(f * 0.04) * 1.2, Math.sin(f * 0.04) * 1.2, 0);
      };
      break;
    }

    case "payment": {
      const box  = new THREE.LineSegments(addGeo(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 1.5, 1.5))), lineMat(primary));
      const dMesh = new THREE.Mesh(addGeo(new THREE.OctahedronGeometry(0.6)), wireMat(secondary, 0.8));
      scene.add(box, dMesh);
      tick = (f) => {
        box.rotation.x = f * 0.012; box.rotation.y = f * 0.018;
        dMesh.rotation.y = -f * 0.03; dMesh.rotation.z = f * 0.015;
      };
      break;
    }

    case "notification": {
      const positions: [number, number, number][] = [
        [0, 0, 0], [1.2, 0.8, 0.3], [-1, 0.9, -0.2], [0.4, -1, 0.5], [-0.8, -0.7, 0.4],
      ];
      const group = new THREE.Group();
      positions.forEach((pos, i) => {
        const mat  = new THREE.MeshBasicMaterial({ color: i === 0 ? primary : secondary });
        const mesh = new THREE.Mesh(addGeo(new THREE.SphereGeometry(i === 0 ? 0.25 : 0.15, 8, 8)), mat);
        disposables.push(mat);
        mesh.position.set(...pos);
        group.add(mesh);
      });
      for (let i = 1; i < positions.length; i++) {
        const pts = [new THREE.Vector3(...positions[0]), new THREE.Vector3(...positions[i])];
        group.add(new THREE.Line(addGeo(new THREE.BufferGeometry().setFromPoints(pts)), lineMat(secondary)));
      }
      scene.add(group);
      tick = (f) => { group.rotation.y = f * 0.015; group.rotation.x = Math.sin(f * 0.008) * 0.3; };
      break;
    }

    case "backhaul": {
      const c1pts = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-1.5, 0, 0), new THREE.Vector3(0, 1.8, 0), new THREE.Vector3(1.5, 0, 0),
      ).getPoints(40);
      const c2pts = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(1.5, -0.4, 0), new THREE.Vector3(0, -1.8, 0), new THREE.Vector3(-1.5, -0.4, 0),
      ).getPoints(40);
      const line1 = new THREE.Line(addGeo(new THREE.BufferGeometry().setFromPoints(c1pts)), lineMat(primary, 1));
      const line2 = new THREE.Line(addGeo(new THREE.BufferGeometry().setFromPoints(c2pts)), lineMat(secondary, 0.6));
      const arrowMat = new THREE.MeshBasicMaterial({ color: primary });
      const arrow    = new THREE.Mesh(addGeo(new THREE.ConeGeometry(0.2, 0.5, 6)), arrowMat);
      disposables.push(arrowMat);
      arrow.position.set(1.5, 0, 0); arrow.rotation.z = -Math.PI / 2;
      scene.add(line1, line2, arrow);
      tick = (f) => {
        const s = Math.sin(f * 0.03) * 0.15;
        line1.rotation.z = s; line2.rotation.z = s; arrow.rotation.z = -Math.PI / 2 + s;
      };
      break;
    }

    case "cargo": {
      const box = new THREE.LineSegments(addGeo(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 1.4, 1.4))), lineMat(primary));
      const h1  = new THREE.Line(addGeo(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.8, 0, 0.71), new THREE.Vector3(0.8, 0, 0.71),
      ])), lineMat(secondary));
      const v1  = new THREE.Line(addGeo(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.7, 0.71), new THREE.Vector3(0, 0.7, 0.71),
      ])), lineMat(secondary));
      scene.add(box, h1, v1);
      tick = (f) => { box.rotation.y = f * 0.02; box.rotation.x = 0.3 + Math.sin(f * 0.01) * 0.1; };
      break;
    }
  }

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return { scene, camera, tick: tick!, dispose };
}

// ─── Shared renderer + global RAF ─────────────────────────────────────────────

type InstanceEntry = {
  scene:  THREE.Scene;
  camera: THREE.PerspectiveCamera;
  tick:   (frame: number) => void;
  ctx:    CanvasRenderingContext2D;
  size:   number;
  frame:  number;
};

let _renderer:  THREE.WebGLRenderer | null = null;
let _rafId:     number | null = null;
const _registry = new Map<symbol, InstanceEntry>();

function ensureRenderer(): THREE.WebGLRenderer {
  if (!_renderer) {
    _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _renderer.setClearColor(0x000000, 0);
  }
  return _renderer;
}

function startLoop() {
  if (_rafId !== null) return;
  const loop = () => {
    _rafId = requestAnimationFrame(loop);
    if (!_renderer || _registry.size === 0) return;

    for (const [, inst] of _registry) {
      _renderer.setSize(inst.size, inst.size, false);
      _renderer.clear();
      inst.frame++;
      inst.tick(inst.frame);
      _renderer.render(inst.scene, inst.camera);
      inst.ctx.clearRect(0, 0, inst.size, inst.size);
      inst.ctx.drawImage(_renderer.domElement, 0, 0, inst.size, inst.size);
    }
  };
  loop();
}

function stopLoopIfIdle() {
  if (_registry.size > 0) return;
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (_renderer) { _renderer.dispose(); _renderer = null; }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GeoIconProps {
  type: GeoIconType;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function GeoIcon({ type, size = 56, className, style }: GeoIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const id = Symbol();
    ensureRenderer();

    const { scene, camera, tick, dispose } = buildScene(type);
    _registry.set(id, { scene, camera, tick, ctx, size, frame: 0 });
    startLoop();

    return () => {
      _registry.delete(id);
      dispose();
      stopLoopIfIdle();
    };
  }, [type, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", ...style }}
    />
  );
}
