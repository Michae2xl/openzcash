"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Grid,
  Html,
  OrbitControls,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

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

/* ------------------------------ floor + room ------------------------------ */
function Floor() {
  const tex = useTexture("/zcash-emblem.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial
          color="#0b0c15"
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>
      <Grid
        args={[44, 44]}
        cellSize={1.4}
        cellThickness={0.5}
        cellColor="#1b3b66"
        sectionSize={5.6}
        sectionThickness={1}
        sectionColor="#6d28d9"
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
    <meshStandardMaterial color="#0c0d18" roughness={0.95} metalness={0.05} />
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
      {/* neon baseboard on the back wall */}
      <mesh position={[0, 0.06, -10.98]}>
        <boxGeometry args={[24, 0.08, 0.08]} />
        <meshBasicMaterial color="#22d3ee" toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------- furniture -------------------------------- */
function OfficeFurniture() {
  return (
    <group>
      {/* meeting table + chairs */}
      <Model url={`${M}/tableRound.glb`} position={[0, 0, 0]} scale={3.2} />
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <Model
            key={i}
            url={`${M}/chairModernCushion.glb`}
            position={[Math.cos(a) * 2.3, 0, Math.sin(a) * 2.3]}
            rotationY={-a + Math.PI / 2}
            scale={1.2}
          />
        );
      })}
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

/* --------------------------- members at desks ----------------------------- */
function MemberDesk({ m, x }: { m: OfficeMember; x: number }) {
  return (
    <group position={[x, 0, -8.5]}>
      <Model url={`${M}/desk.glb`} position={[0, 0, 0]} scale={1.5} />
      <Model
        url={`${M}/chairDesk.glb`}
        position={[0, 0, -1.2]}
        rotationY={Math.PI}
        scale={1.2}
      />
      <Model
        url={`${M}/computerScreen.glb`}
        position={[0, 1.12, 0.15]}
        scale={1.1}
      />
      <Html position={[0, 2.9, 0]} center distanceFactor={9}>
        <div
          style={{
            width: 150,
            pointerEvents: "none",
            textAlign: "center",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "rgba(10,12,22,0.85)",
            border: "1px solid rgba(16,185,129,0.5)",
            borderRadius: 14,
            padding: "9px 10px",
            boxShadow: "0 0 20px rgba(16,185,129,0.3)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.img}
            alt={m.name}
            width={42}
            height={42}
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 5px",
              display: "block",
              border: "2px solid rgba(16,185,129,0.85)",
            }}
          />
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
            {m.name}
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 8,
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

/* ------------------- proposals walking around the office ------------------ */
const LOOP: [number, number][] = [
  [-5.5, -3],
  [5.5, -3],
  [6.5, 3],
  [4.5, 7.5],
  [-4.5, 7.5],
  [-6.5, 3],
];
function loopPoint(u: number) {
  const n = LOOP.length;
  const f = (((u % 1) + 1) % 1) * n;
  const i = Math.floor(f);
  const t = f - i;
  const a = LOOP[i];
  const b = LOOP[(i + 1) % n];
  const x = a[0] + (b[0] - a[0]) * t;
  const z = a[1] + (b[1] - a[1]) * t;
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  return { x, z, yaw };
}

function ProposalWalker({
  p,
  offset,
  color,
}: {
  p: OfficeProposal;
  offset: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const bob = useRef<THREE.Group>(null);
  useFrame((s) => {
    const u = s.clock.elapsedTime * 0.018 + offset;
    const { x, z, yaw } = loopPoint(u);
    if (ref.current) {
      ref.current.position.set(x, 0, z);
      ref.current.rotation.y = yaw;
    }
    if (bob.current) {
      bob.current.position.y =
        0.55 + Math.sin(s.clock.elapsedTime * 3 + offset * 20) * 0.05;
    }
  });
  const amount =
    p.amount != null ? `$${p.amount.toLocaleString("en-US")}` : "—";
  return (
    <group ref={ref}>
      <group ref={bob}>
        {/* glowing token */}
        <mesh castShadow>
          <capsuleGeometry args={[0.28, 0.5, 6, 14]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.9}
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>
        {/* little "screen" face */}
        <mesh position={[0, 0.1, 0.26]}>
          <planeGeometry args={[0.32, 0.22]} />
          <meshBasicMaterial color="#02030a" />
        </mesh>
      </group>
      <pointLight
        position={[0, 1, 0]}
        intensity={5}
        distance={4.5}
        color={color}
      />
      {/* ground glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.18}
          toneMapped={false}
        />
      </mesh>
      {/* floating label */}
      <Html position={[0, 1.75, 0]} center distanceFactor={11}>
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

/* ------------------------------- zebra (GLB) ------------------------------ */
const ZEBRA_URL = "/office-assets/models/animals/zebra.glb";
function Zebra({
  radius,
  speed,
  phase,
}: {
  radius: number;
  speed: number;
  phase: number;
}) {
  const { scene } = useGLTF(ZEBRA_URL);
  const model = useMemo(() => {
    const c = scene.clone(true);
    // Normalise the unknown native scale to ~1.7 units tall, feet on the floor.
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(c).getSize(size);
    c.scale.setScalar(1.7 / (size.y || 1));
    const min = new THREE.Box3().setFromObject(c).min;
    c.position.y = -min.y;
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    return c;
  }, [scene]);
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    if (ref.current) {
      ref.current.position.set(
        Math.cos(t) * radius,
        0,
        2 + Math.sin(t) * radius * 0.6,
      );
      // Face the direction of travel (model assumed +Z forward).
      const vx = -Math.sin(t) * radius;
      const vz = Math.cos(t) * radius * 0.6;
      ref.current.rotation.y = Math.atan2(vx, vz) * Math.sign(speed);
    }
  });
  return (
    <group ref={ref}>
      <primitive object={model} />
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
  const deskXs = [-8, -4, 0, 4, 8];
  return (
    <>
      <color attach="background" args={["#05060e"]} />
      <fog attach="fog" args={["#05060e", 22, 52]} />

      <ambientLight intensity={0.45} />
      <hemisphereLight intensity={0.4} groundColor="#05050c" color="#2a3a56" />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.4}
        color="#dbeafe"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <pointLight position={[-9, 5, 6]} intensity={45} color={GOLD} />
      <pointLight position={[9, 5, -6]} intensity={45} color="#0ea5e9" />

      <Walls />

      <Suspense fallback={null}>
        <Floor />
        <OfficeFurniture />
        {members.slice(0, 5).map((m, i) => (
          <MemberDesk key={m.name} m={m} x={deskXs[i]} />
        ))}
      </Suspense>

      {shown.map((p, i) => (
        <ProposalWalker
          key={p.title + i}
          p={p}
          offset={i / shown.length}
          color={WALK_COLORS[i % WALK_COLORS.length]}
        />
      ))}

      <Suspense fallback={null}>
        <Zebra radius={8.5} speed={0.15} phase={0} />
        <Zebra radius={6.2} speed={-0.12} phase={2.6} />
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
      gl={{ antialias: true }}
    >
      <Scene members={members} proposals={proposals} />
    </Canvas>
  );
}

// Preload the furniture GLBs used above.
[
  "tableRound",
  "chairModernCushion",
  "loungeSofa",
  "lampRoundFloor",
  "tableCoffee",
  "bookcaseClosed",
  "kitchenFridgeSmall",
  "kitchenCoffeeMachine",
  "pottedPlant",
  "plantSmall1",
  "desk",
  "chairDesk",
  "computerScreen",
].forEach((n) => useGLTF.preload(`${M}/${n}.glb`));
useGLTF.preload(ZEBRA_URL);
