"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Float,
  Grid,
  Html,
  OrbitControls,
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

/* ----------------------------- floor + emblem ----------------------------- */
function ZcashFloor() {
  const tex = useTexture("/zcash-emblem.png");
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#08080f"
          roughness={0.85}
          metalness={0.15}
        />
      </mesh>
      <Grid
        position={[0, 0, 0]}
        args={[80, 80]}
        cellSize={1.5}
        cellThickness={0.6}
        cellColor="#173a6b"
        sectionSize={7.5}
        sectionThickness={1}
        sectionColor="#7c3aed"
        fadeDistance={48}
        fadeStrength={1.5}
        infiniteGrid
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[11, 11]} />
        <meshBasicMaterial
          map={tex}
          transparent
          opacity={0.92}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------ member desks ------------------------------ */
function MemberDesk({ m, angle }: { m: OfficeMember; angle: number }) {
  const R = 8.5;
  const x = Math.cos(angle) * R;
  const z = Math.sin(angle) * R;
  const facing = Math.atan2(-z, -x); // face the centre
  return (
    <group position={[x, 0, z]} rotation={[0, facing, 0]}>
      {/* desk */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.12, 0.9]} />
        <meshStandardMaterial
          color="#14141f"
          metalness={0.65}
          roughness={0.3}
        />
      </mesh>
      {[
        [-0.8, 0.35],
        [0.8, 0.35],
        [-0.8, -0.35],
        [0.8, -0.35],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.27, lz]}>
          <boxGeometry args={[0.08, 0.55, 0.08]} />
          <meshStandardMaterial color="#0c0c14" />
        </mesh>
      ))}
      {/* glowing monitor */}
      <mesh position={[0, 1.05, 0.25]}>
        <boxGeometry args={[0.95, 0.55, 0.05]} />
        <meshStandardMaterial
          color="#0b1220"
          emissive="#0ea5e9"
          emissiveIntensity={1.4}
        />
      </mesh>
      {/* holographic roster card */}
      <Html
        position={[0, 2.15, 0]}
        center
        transform
        distanceFactor={9}
        pointerEvents="none"
      >
        <div
          style={{
            width: 168,
            pointerEvents: "none",
            fontFamily: "Inter, system-ui, sans-serif",
            background: "rgba(10,12,22,0.86)",
            border: "1px solid rgba(139,92,246,0.55)",
            borderRadius: 14,
            padding: "10px 12px",
            boxShadow: "0 0 22px rgba(124,58,237,0.35)",
            backdropFilter: "blur(2px)",
            textAlign: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.img}
            alt={m.name}
            width={46}
            height={46}
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 6px",
              display: "block",
              border: "2px solid rgba(16,185,129,0.8)",
            }}
          />
          <div
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {m.name}
          </div>
          <div
            style={{
              marginTop: 6,
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              justifyContent: "center",
            }}
          >
            {m.tags.map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 8,
                  color: "#c4b5fd",
                  background: "rgba(124,58,237,0.18)",
                  border: "1px solid rgba(124,58,237,0.35)",
                  borderRadius: 999,
                  padding: "1px 6px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

/* ------------------------------ review table ------------------------------ */
function ReviewTable() {
  return (
    <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[3, 3.1, 0.18, 64]} />
      <meshStandardMaterial
        color="#10101c"
        metalness={0.8}
        roughness={0.22}
        emissive={GOLD}
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

/* --------------------------- proposal holo-cards --------------------------- */
function ProposalCard({
  p,
  angle,
  index,
}: {
  p: OfficeProposal;
  angle: number;
  index: number;
}) {
  const R = 3.6;
  const x = Math.cos(angle) * R;
  const z = Math.sin(angle) * R;
  const y = 2.4 + (index % 3) * 0.55;
  const amount =
    p.amount != null ? `$${p.amount.toLocaleString("en-US")}` : "—";
  return (
    <group position={[x, y, z]} rotation={[0, Math.atan2(-z, -x) + Math.PI, 0]}>
      <Float speed={2} floatIntensity={0.6} rotationIntensity={0.15}>
        <Html center transform distanceFactor={10} pointerEvents="none">
          <div
            style={{
              width: 190,
              pointerEvents: "none",
              fontFamily: "Inter, system-ui, sans-serif",
              background: "rgba(4,10,24,0.9)",
              border: "1px solid rgba(14,165,233,0.6)",
              borderRadius: 12,
              padding: "9px 11px",
              boxShadow: "0 0 20px rgba(14,165,233,0.4)",
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
              ▲ UNDER REVIEW
            </div>
            <div
              style={{
                marginTop: 3,
                color: "#e7eefc",
                fontWeight: 600,
                fontSize: 12,
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
              <span style={{ fontSize: 9, color: "#7891b5" }}>
                {p.applicant ? `@${p.applicant}` : ""}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
                {amount}
              </span>
            </div>
          </div>
        </Html>
      </Float>
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
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.rotation.y = -t + Math.PI / 2;
    }
  });
  const white = "#f2f2f2";
  const black = "#141414";
  return (
    <group ref={ref}>
      {/* body */}
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
      {/* neck + head */}
      <mesh position={[0.82, 1.32, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[0.32, 0.72, 0.34]} />
        <meshStandardMaterial color={white} roughness={0.7} />
      </mesh>
      <mesh position={[1.08, 1.68, 0]} castShadow>
        <boxGeometry args={[0.5, 0.3, 0.3]} />
        <meshStandardMaterial color={black} roughness={0.7} />
      </mesh>
      {/* legs */}
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
  const shown = proposals.slice(0, 14);
  return (
    <>
      <color attach="background" args={["#04050c"]} />
      <fog attach="fog" args={["#04050c", 20, 60]} />

      <ambientLight intensity={0.28} />
      <hemisphereLight intensity={0.25} groundColor="#000008" color="#20304a" />
      <spotLight
        position={[0, 20, 2]}
        angle={0.75}
        penumbra={0.7}
        intensity={3}
        color="#8b5cf6"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[14, 7, 14]} intensity={90} color="#0ea5e9" />
      <pointLight position={[-14, 7, -14]} intensity={90} color={GOLD} />
      <pointLight position={[0, 6, 0]} intensity={30} color="#22d3ee" />

      <Suspense fallback={null}>
        <ZcashFloor />
      </Suspense>

      <ReviewTable />

      {members.map((m, i) => (
        <MemberDesk
          key={m.name}
          m={m}
          angle={(i / members.length) * Math.PI * 2}
        />
      ))}

      {shown.map((p, i) => (
        <ProposalCard
          key={p.title + i}
          p={p}
          index={i}
          angle={(i / shown.length) * Math.PI * 2}
        />
      ))}

      <Zebra radius={13} speed={0.14} phase={0} />
      <Zebra radius={16} speed={-0.1} phase={2.1} />

      <OrbitControls
        enablePan={false}
        target={[0, 1.6, 0]}
        minDistance={7}
        maxDistance={34}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2.15}
        autoRotate
        autoRotateSpeed={0.35}
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
      camera={{ position: [0, 9, 18], fov: 50 }}
      gl={{ antialias: true }}
    >
      <Scene members={members} proposals={proposals} />
    </Canvas>
  );
}
