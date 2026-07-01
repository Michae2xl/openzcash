"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Grid,
  Html,
  OrbitControls,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

export type OfficeMember = { name: string; img: string; tags: string[] };
export type OfficeProposal = {
  title: string;
  amount: number | null;
  applicant: string;
};

const GOLD = "#f4b728";
const M = "/office-assets/models/furniture";
const WALK_COLORS = [
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#22d3ee",
  "#f87171",
  "#818cf8",
  "#4ade80",
  "#e879f9",
];

/* --------------------------- GLB model instance --------------------------- */
function Model({
  url,
  position,
  rotationY = 0,
  scale = 1,
}: {
  url: string;
  position: [number, number, number];
  rotationY?: number;
  scale?: number | [number, number, number];
}) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  const s = typeof scale === "number" ? [scale, scale, scale] : scale;
  return (
    <primitive
      object={obj}
      position={position}
      rotation={[0, rotationY, 0]}
      scale={s}
    />
  );
}

/** Loads a GLB and normalises it to a target height with feet on the floor —
 * robust against a model's unknown native scale (used for the throne). */
function FitModel({
  url,
  targetH,
  position,
  rotationY = 0,
}: {
  url: string;
  targetH: number;
  position: [number, number, number];
  rotationY?: number;
}) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);
  const { norm, footY } = useMemo(() => {
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const n = targetH / (size.y || 1);
    return { norm: n, footY: -box.min.y * n };
  }, [obj, targetH]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group scale={norm} position={[0, footY, 0]}>
        <primitive object={obj} />
      </group>
    </group>
  );
}

/* ------------------------------ floor + room ------------------------------ */
function Floor() {
  const tex = useTexture("/zcash-emblem.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial
          color="#e9ecf1"
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      <Grid
        args={[44, 44]}
        cellSize={1.4}
        cellThickness={0.5}
        cellColor="#c3ccd8"
        sectionSize={5.6}
        sectionThickness={1}
        sectionColor="#9aa7b8"
        fadeDistance={34}
        fadeStrength={1.4}
        position={[0, 0.01, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 1.5]}>
        <planeGeometry args={[8, 8]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Walls() {
  const H = 5.5;
  const wall = (
    <meshStandardMaterial color="#eef1f5" roughness={0.95} metalness={0.02} />
  );
  return (
    <group>
      <mesh position={[0, H / 2, -11]} receiveShadow>
        <planeGeometry args={[24, H]} />
        {wall}
      </mesh>
      <mesh
        position={[-12, H / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, H]} />
        {wall}
      </mesh>
      <mesh
        position={[12, H / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
      >
        <planeGeometry args={[24, H]} />
        {wall}
      </mesh>
    </group>
  );
}

/* ------------------------------- furniture -------------------------------- */
function OfficeFurniture() {
  return (
    <group>
      {/* lounge corner */}
      <Model
        url={`${M}/loungeSofa.glb`}
        position={[-8.5, 0, 5.5]}
        rotationY={1.3}
        scale={1.8}
      />
      <Model
        url={`${M}/lampRoundFloor.glb`}
        position={[-10, 0, 3.4]}
        scale={1.2}
      />
      <Model
        url={`${M}/tableCoffee.glb`}
        position={[-7, 0, 6.6]}
        rotationY={0.2}
        scale={1.1}
      />
      {/* library / kitchen */}
      <Model
        url={`${M}/bookcaseClosed.glb`}
        position={[9.2, 0, -8]}
        rotationY={-1.15}
        scale={[1.5, 2, 1.5]}
      />
      <Model
        url={`${M}/kitchenFridgeSmall.glb`}
        position={[10, 0, 6]}
        rotationY={-1.4}
        scale={[1, 1.4, 1]}
      />
      <Model
        url={`${M}/kitchenCoffeeMachine.glb`}
        position={[8.4, 0, 7.2]}
        rotationY={-1.2}
        scale={0.8}
      />
      {/* plants */}
      <Model
        url={`${M}/pottedPlant.glb`}
        position={[-10.4, 0, -9.4]}
        scale={[1.3, 1.9, 1.3]}
      />
      <Model
        url={`${M}/pottedPlant.glb`}
        position={[10.4, 0, -9.4]}
        scale={[1.3, 1.9, 1.3]}
      />
      <Model
        url={`${M}/plantSmall1.glb`}
        position={[8.6, 0, 8.6]}
        scale={1.2}
      />
    </group>
  );
}

/* ----------------------- members in big chairs (seated) ------------------- */
function MemberSeat({ m, x, z }: { m: OfficeMember; x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* throne, facing the proposals (+z, toward the room centre) */}
      <FitModel
        url={`${M}/throne_chair.glb`}
        targetH={2.2}
        position={[0, 0, 0]}
        rotationY={0}
      />
      {/* avatar seated on the throne, facing the proposals */}
      <Html position={[0, 2.35, 0.2]} center distanceFactor={8}>
        <div
          style={{
            width: 168,
            pointerEvents: "none",
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "rgba(10,12,22,0.85)",
            border: "1px solid rgba(16,185,129,0.5)",
            borderRadius: 16,
            padding: "11px 12px",
            boxShadow: "0 0 24px rgba(16,185,129,0.32)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.img}
            alt={m.name}
            width={56}
            height={56}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 6px",
              display: "block",
              border: "2px solid rgba(16,185,129,0.85)",
            }}
          />
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
            {m.name}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 9,
              color: "#a7f3d0",
              lineHeight: 1.3,
            }}
          >
            {m.tags[0]}
          </div>
        </div>
      </Html>
    </group>
  );
}

/* --------------- proposals: zebras wandering in front of members ---------- */
// Random-walk area in front of the members (who sit at z ≈ -5..-6.5).
const ZEBRA_AREA = { xMin: -8.5, xMax: 8.5, zMin: -3, zMax: 8 };
function randInArea(): THREE.Vector2 {
  return new THREE.Vector2(
    ZEBRA_AREA.xMin + Math.random() * (ZEBRA_AREA.xMax - ZEBRA_AREA.xMin),
    ZEBRA_AREA.zMin + Math.random() * (ZEBRA_AREA.zMax - ZEBRA_AREA.zMin),
  );
}

const ZEBRA_ANIM_URL = "/office-assets/models/animals/zebra-cartoon.glb";
const ZEBRA_TARGET_H = 1.3; // rendered height — small zebra
const ZEBRA_Y = 0; // vertical placement — 0 = pivot on the floor (tweak if it floats/sinks)
// Tweak if the zebras walk sideways/backwards (model forward-axis offset).
const ZEBRA_YAW = 0;
function pickWalkClip(
  clips: THREE.AnimationClip[],
): THREE.AnimationClip | null {
  return (
    clips.find((c) => /walk/i.test(c.name)) ??
    clips.find((c) => /move|loco/i.test(c.name)) ??
    clips[0] ??
    null
  );
}

// Each under-review proposal is an animated zebra walking the office loop.
function ProposalZebra({
  p,
  offset,
  color,
}: {
  p: OfficeProposal;
  offset: number;
  color: string;
}) {
  const { scene, animations } = useGLTF(ZEBRA_ANIM_URL);
  const model = useMemo(() => {
    const c = cloneSkeleton(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    return c;
  }, [scene]);
  const { norm, headY } = useMemo(() => {
    model.updateMatrixWorld(true); // include the model's own root scale
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(model).getSize(size);
    // NOTE: Box3.setFromObject mis-locates skinned meshes vertically, so we do
    // NOT derive the floor offset from it (that made the zebras float). We take
    // only the height for scale and place feet on the floor via ZEBRA_Y.
    const n = ZEBRA_TARGET_H / (size.y || 1);
    return { norm: n, headY: ZEBRA_TARGET_H + 0.15 };
  }, [model]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  useEffect(() => {
    const clip = pickWalkClip(animations);
    if (clip) {
      const a = mixer.clipAction(clip);
      a.timeScale = 0.9;
      a.reset().play();
      a.time = offset * (clip.duration || 1); // desync the walk cycles
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, animations, offset]);
  const ref = useRef<THREE.Group>(null);
  // Random wander: head toward a target point, pick a new one on arrival.
  const posRef = useRef<THREE.Vector2>(randInArea());
  const targetRef = useRef<THREE.Vector2>(randInArea());
  const yawRef = useRef(0);
  useFrame((_, dt) => {
    mixer.update(dt);
    const p2 = posRef.current;
    const t = targetRef.current;
    const dx = t.x - p2.x;
    const dz = t.y - p2.y;
    const d = Math.hypot(dx, dz);
    if (d < 0.4) {
      targetRef.current = randInArea();
    } else {
      const step = Math.min(1.1 * dt, d);
      p2.x += (dx / d) * step;
      p2.y += (dz / d) * step;
      yawRef.current = Math.atan2(dx, dz);
    }
    if (ref.current) {
      ref.current.position.set(p2.x, 0, p2.y);
      ref.current.rotation.y = yawRef.current + ZEBRA_YAW;
    }
  });
  const amount =
    p.amount != null ? `$${p.amount.toLocaleString("en-US")}` : "—";
  return (
    <group ref={ref}>
      {/* inner group isolates the model's scale + floor offset from any root motion */}
      <group scale={norm} position={[0, ZEBRA_Y, 0]}>
        <primitive object={model} />
      </group>
      {/* ground glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.75, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          toneMapped={false}
        />
      </mesh>
      {/* floating label */}
      <Html position={[0, headY, 0]} center distanceFactor={9}>
        <div
          style={{
            width: 172,
            pointerEvents: "none",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "rgba(4,10,24,0.9)",
            border: `1px solid ${color}`,
            borderRadius: 11,
            padding: "8px 10px",
            boxShadow: `0 0 18px ${color}66`,
          }}
        >
          <div
            style={{ fontSize: 8, letterSpacing: 1, color, fontWeight: 700 }}
          >
            ▲ UNDER REVIEW
          </div>
          <div
            style={{
              marginTop: 3,
              color: "#eaf1ff",
              fontWeight: 600,
              fontSize: 11.5,
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {p.title}
          </div>
          <div
            style={{
              marginTop: 5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 8.5, color: "#7891b5" }}>
              {p.applicant ? `@${p.applicant}` : ""}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
              {amount}
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------- the scene -------------------------------- */
function Scene({
  members,
  proposals,
}: {
  members: OfficeMember[];
  proposals: OfficeProposal[];
}) {
  const shown = proposals.slice(0, 10);
  // Big chairs in a shallow arc, close in, facing the proposals in the centre.
  const SEATS: [number, number][] = [
    [-7.5, -5],
    [-3.9, -6],
    [0, -6.4],
    [3.9, -6],
    [7.5, -5],
  ];
  return (
    <>
      <color attach="background" args={["#dce3ec"]} />
      <fog attach="fog" args={["#dce3ec", 34, 80]} />

      {/* bright neutral studio light so the models show their real colours */}
      <ambientLight intensity={0.9} />
      <hemisphereLight intensity={0.7} groundColor="#c6cbd4" color="#ffffff" />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.15}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />

      <Walls />

      <Suspense fallback={null}>
        <Floor />
        <OfficeFurniture />
        {members.slice(0, 5).map((m, i) => (
          <MemberSeat key={m.name} m={m} x={SEATS[i][0]} z={SEATS[i][1]} />
        ))}
      </Suspense>

      <Suspense fallback={null}>
        {shown.map((p, i) => (
          <ProposalZebra
            key={p.title + i}
            p={p}
            offset={i / shown.length}
            color={WALK_COLORS[i % WALK_COLORS.length]}
          />
        ))}
      </Suspense>

      <OrbitControls
        enablePan={false}
        target={[0, 1.4, 0]}
        minDistance={9}
        maxDistance={30}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        autoRotate
        autoRotateSpeed={0.25}
      />
    </>
  );
}

export default function OfficeScene({
  members,
  proposals,
}: {
  members: OfficeMember[];
  proposals: OfficeProposal[];
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 8, 17], fov: 48 }}
      gl={{ antialias: true, toneMappingExposure: 1 }}
    >
      <Scene members={members} proposals={proposals} />
    </Canvas>
  );
}

// Preload the furniture GLBs used above.
[
  "throne_chair",
  "loungeSofa",
  "lampRoundFloor",
  "tableCoffee",
  "bookcaseClosed",
  "kitchenFridgeSmall",
  "kitchenCoffeeMachine",
  "pottedPlant",
  "plantSmall1",
].forEach((n) => useGLTF.preload(`${M}/${n}.glb`));
useGLTF.preload(ZEBRA_ANIM_URL);
