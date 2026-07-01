"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, Html, OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

export type OfficeMember = { name: string; img: string; tags: string[] };
export type OfficeProposal = {
  title: string;
  amount: number | null;
  applicant: string;
};

const GOLD = "#f4b728";
const ROOM_W = 34; // x: -17..17
const ROOM_D = 30; // z: -16..14
const ROOM_H = 10;

/* --------------------------------- room ----------------------------------- */
function NeonEdge({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  ];
  const len = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const dir = new THREE.Vector3(
    to[0] - from[0],
    to[1] - from[1],
    to[2] - from[2],
  ).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir,
  );
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <mesh position={mid} rotation={[e.x, e.y, e.z]}>
      <cylinderGeometry args={[0.04, 0.04, len, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Room() {
  const tex = useTexture("/zcash-emblem.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  const hx = ROOM_W / 2;
  const backZ = -ROOM_D / 2;
  const wall = (
    <meshStandardMaterial color="#0a0b14" roughness={0.95} metalness={0.05} />
  );
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#07070e" roughness={0.8} metalness={0.2} />
      </mesh>
      <Grid
        args={[ROOM_W, ROOM_D]}
        cellSize={1.4}
        cellThickness={0.5}
        cellColor="#15315c"
        sectionSize={5.6}
        sectionThickness={1}
        sectionColor="#6d28d9"
        fadeDistance={38}
        fadeStrength={1.4}
        position={[0, 0.01, 0]}
      />
      {/* Zcash emblem on the floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      {/* back wall */}
      <mesh position={[0, ROOM_H / 2, backZ]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        {wall}
      </mesh>
      {/* side walls */}
      <mesh position={[-hx, ROOM_H / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        {wall}
      </mesh>
      <mesh position={[hx, ROOM_H / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        {wall}
      </mesh>
      {/* ceiling */}
      <mesh position={[0, ROOM_H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#06060c" roughness={1} />
      </mesh>
      {/* ceiling light strips */}
      {[-6, 0, 6].map((x) => (
        <mesh key={x} position={[x, ROOM_H - 0.05, 0]}>
          <boxGeometry args={[0.3, 0.05, ROOM_D - 4]} />
          <meshBasicMaterial color="#6ea8ff" toneMapped={false} />
        </mesh>
      ))}
      {/* neon trim on the back-wall edges */}
      <NeonEdge
        from={[-hx, 0.05, backZ]}
        to={[hx, 0.05, backZ]}
        color="#22d3ee"
      />
      <NeonEdge
        from={[-hx, ROOM_H, backZ]}
        to={[hx, ROOM_H, backZ]}
        color="#8b5cf6"
      />
      <NeonEdge
        from={[-hx, 0, backZ]}
        to={[-hx, ROOM_H, backZ]}
        color="#8b5cf6"
      />
      <NeonEdge
        from={[hx, 0, backZ]}
        to={[hx, ROOM_H, backZ]}
        color="#8b5cf6"
      />
    </group>
  );
}

/* -------------------------- proposals review board ------------------------ */
function ReviewBoard({ proposals }: { proposals: OfficeProposal[] }) {
  const backZ = -ROOM_D / 2 + 0.15;
  const cols = 4;
  const cardW = 3.5;
  const cardH = 2.3;
  const gapX = 0.5;
  const gapY = 0.5;
  const rows = Math.ceil(proposals.length / cols);
  const gridW = cols * cardW + (cols - 1) * gapX;
  const startX = -gridW / 2 + cardW / 2;
  const topY = 7.4;
  return (
    <group>
      {/* board title */}
      <Html position={[0, 8.6, backZ]} center distanceFactor={16}>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            color: "#e7eefc",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: 3,
            textShadow: "0 0 18px rgba(56,189,248,0.7)",
            whiteSpace: "nowrap",
          }}
        >
          ▲ PROPOSALS UNDER REVIEW
        </div>
      </Html>
      {proposals.map((p, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = startX + c * (cardW + gapX);
        const y = topY - r * (cardH + gapY);
        const amount =
          p.amount != null ? `$${p.amount.toLocaleString("en-US")}` : "—";
        return (
          <group key={p.title + i} position={[x, y, backZ]}>
            {/* card backing panel (in-world, on the wall) */}
            <mesh>
              <planeGeometry args={[cardW, cardH]} />
              <meshBasicMaterial
                color="#071427"
                transparent
                opacity={0.9}
                toneMapped={false}
              />
            </mesh>
            <Html
              position={[0, 0, 0.05]}
              center
              transform
              distanceFactor={7}
              pointerEvents="none"
            >
              <div
                style={{
                  width: 176,
                  pointerEvents: "none",
                  fontFamily: "Inter, system-ui, sans-serif",
                  border: "1px solid rgba(14,165,233,0.65)",
                  borderRadius: 10,
                  padding: "9px 11px",
                  boxShadow: "0 0 18px rgba(14,165,233,0.45)",
                  background: "rgba(4,12,26,0.7)",
                }}
              >
                <div
                  style={{
                    fontSize: 8,
                    letterSpacing: 1,
                    color: "#38bdf8",
                    fontWeight: 700,
                  }}
                >
                  UNDER REVIEW
                </div>
                <div
                  style={{
                    marginTop: 3,
                    color: "#eaf1ff",
                    fontWeight: 600,
                    fontSize: 12,
                    lineHeight: 1.2,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    minHeight: 29,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 9, color: "#7891b5" }}>
                    {p.applicant ? `@${p.applicant}` : ""}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                    {amount}
                  </span>
                </div>
              </div>
            </Html>
          </group>
        );
      })}
      {/* faint frame around the board */}
      <mesh
        position={[0, topY - ((rows - 1) * (cardH + gapY)) / 2, backZ - 0.05]}
      >
        <planeGeometry args={[gridW + 1, rows * (cardH + gapY) + 0.6]} />
        <meshBasicMaterial color="#0a1830" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* ----------------------------- committee table ---------------------------- */
function CommitteeTable({ members }: { members: OfficeMember[] }) {
  const tz = 4.5; // table sits toward the front, members face the board
  return (
    <group position={[0, 0, tz]}>
      {/* round table */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.4, 3.5, 0.2, 64]} />
        <meshStandardMaterial
          color="#12121e"
          metalness={0.8}
          roughness={0.2}
          emissive={GOLD}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.6, 1, 24]} />
        <meshStandardMaterial color="#0b0b13" metalness={0.6} roughness={0.4} />
      </mesh>
      {members.map((m, i) => {
        // seats on a rear arc so avatars face the camera and the board
        const spread = Math.PI * 0.9;
        const a =
          -Math.PI / 2 -
          spread / 2 +
          (members.length === 1
            ? spread / 2
            : (i / (members.length - 1)) * spread);
        const sr = 4.3;
        const x = Math.cos(a) * sr;
        const z = Math.sin(a) * sr;
        return (
          <group key={m.name} position={[x, 0, z]}>
            {/* chair back */}
            <mesh position={[0, 0.9, 0.25]} castShadow>
              <boxGeometry args={[0.9, 1.2, 0.12]} />
              <meshStandardMaterial
                color="#14141f"
                metalness={0.4}
                roughness={0.5}
              />
            </mesh>
            {/* seat */}
            <mesh position={[0, 0.5, -0.05]}>
              <boxGeometry args={[0.9, 0.12, 0.8]} />
              <meshStandardMaterial color="#191925" />
            </mesh>
            {/* holographic name/avatar (billboard: always readable) */}
            <Html position={[0, 2.15, 0]} center distanceFactor={9}>
              <div
                style={{
                  width: 150,
                  pointerEvents: "none",
                  textAlign: "center",
                  fontFamily: "Inter, system-ui, sans-serif",
                  background: "rgba(10,12,22,0.82)",
                  border: "1px solid rgba(16,185,129,0.5)",
                  borderRadius: 14,
                  padding: "9px 10px",
                  boxShadow: "0 0 20px rgba(16,185,129,0.28)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.img}
                  alt={m.name}
                  width={44}
                  height={44}
                  style={{
                    width: 44,
                    height: 44,
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
                    marginTop: 4,
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
      })}
    </group>
  );
}

/* --------------------------------- zebra ---------------------------------- */
function Zebra({
  radius,
  speed,
  phase,
}: {
  radius: number;
  speed: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = 3 + Math.sin(t) * (radius * 0.5);
      ref.current.rotation.y = -t + Math.PI / 2;
    }
  });
  const white = "#f2f2f2";
  const black = "#141414";
  return (
    <group ref={ref} scale={0.85}>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[1.5, 0.62, 0.55]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      {[-0.55, -0.25, 0.05, 0.35].map((sx, i) => (
        <mesh key={i} position={[sx, 0.95, 0]}>
          <boxGeometry args={[0.09, 0.64, 0.57]} />
          <meshStandardMaterial color={black} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0.82, 1.32, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[0.32, 0.72, 0.34]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      <mesh position={[1.08, 1.68, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.3]} />
        <meshStandardMaterial color={black} roughness={0.7} />
      </mesh>
      {[
        [-0.5, 0.32],
        [0.5, 0.32],
        [-0.5, -0.32],
        [0.5, -0.32],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.38, lz]} castShadow>
          <boxGeometry args={[0.16, 0.75, 0.16]} />
          <meshStandardMaterial color={i % 2 ? black : white} roughness={0.7} />
        </mesh>
      ))}
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
  const shown = proposals.slice(0, 12);
  return (
    <>
      <color attach="background" args={["#04050c"]} />
      <fog attach="fog" args={["#04050c", 24, 60]} />

      <ambientLight intensity={0.35} />
      <hemisphereLight intensity={0.3} groundColor="#000008" color="#25324a" />
      <spotLight
        position={[0, 9, 6]}
        angle={0.9}
        penumbra={0.8}
        intensity={4}
        color="#a78bfa"
        castShadow
        shadow-mapSize={[1024, 1024]}
        target-position={[0, 1, -4]}
      />
      <pointLight position={[10, 6, 8]} intensity={70} color="#0ea5e9" />
      <pointLight position={[-10, 6, 8]} intensity={70} color={GOLD} />
      <pointLight position={[0, 7, -8]} intensity={45} color="#22d3ee" />

      <Suspense fallback={null}>
        <Room />
      </Suspense>

      <ReviewBoard proposals={shown} />
      <CommitteeTable members={members} />

      <Zebra radius={9} speed={0.16} phase={0} />
      <Zebra radius={12} speed={-0.11} phase={2.2} />

      <OrbitControls
        enablePan={false}
        target={[0, 3.4, -3]}
        minDistance={10}
        maxDistance={30}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.1}
        minAzimuthAngle={-Math.PI / 2.6}
        maxAzimuthAngle={Math.PI / 2.6}
        enableDamping
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
      camera={{ position: [0, 6.5, 21], fov: 46 }}
      gl={{ antialias: true }}
    >
      <Scene members={members} proposals={proposals} />
    </Canvas>
  );
}
