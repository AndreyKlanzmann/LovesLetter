"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Database } from "@/lib/supabase/types";
import { CARD_DEFINITIONS, type CardValue } from "@/lib/games/love-letter/data/cards";
import { avatarForSeat } from "@/lib/games/love-letter/avatars";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

const SEAT_RADIUS = 2.55;

export interface Table3DProps {
  players: RoomPlayerRow[];
  currentTurnSeat: number | null;
  protectedSeats: number[];
  playing: boolean;
  myUserId: string | null;
  lastActorSeat: number | null;
  deckCount: number;
  discardPile: CardValue[];
}

// Anel dourado pulsante sob o jogador da vez.
function TurnRing({ position }: { position: [number, number, number] }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.6 + Math.sin(clock.elapsedTime * 4) * 0.4;
  });
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.62, 0.05, 16, 48]} />
      <meshStandardMaterial ref={mat} color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
    </mesh>
  );
}

function CardBackFan({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const off = i - (count - 1) / 2;
        return (
          <mesh key={i} position={[off * 0.16, 0.32, off * 0.02]} rotation={[0, 0, off * 0.12]} castShadow>
            <boxGeometry args={[0.42, 0.6, 0.02]} />
            <meshStandardMaterial color="#7f1d1d" />
          </mesh>
        );
      })}
    </>
  );
}

function Seat({
  player,
  isTurn,
  isProtected,
  justPlayed,
  isMe,
}: {
  player: RoomPlayerRow;
  isTurn: boolean;
  isProtected: boolean;
  justPlayed: boolean;
  isMe: boolean;
}) {
  return (
    <group>
      <CardBackFan count={player.eliminated_this_round ? 0 : 1 + (isTurn ? 1 : 0)} />
      <Html position={[0, 1.05, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div
          style={{ pointerEvents: "none" }}
          className={`flex select-none flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-center ${
            isTurn ? "bg-amber-400/20 ring-1 ring-amber-300/60" : ""
          }`}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-2xl ${
              isTurn ? "border-amber-300" : justPlayed ? "border-sky-300/70" : "border-black/40"
            } ${player.eliminated_this_round ? "opacity-40 grayscale" : ""}`}
          >
            {player.eliminated_this_round ? "💀" : avatarForSeat(player.seat)}
          </div>
          <span
            className={`whitespace-nowrap text-xs font-semibold ${
              player.eliminated_this_round ? "text-gray-400 line-through" : "text-amber-50"
            }`}
          >
            {player.nickname}
            {isMe ? " (você)" : ""}
          </span>
          {isProtected && (
            <span className="rounded bg-blue-500/50 px-1 text-[9px] text-blue-50">Aia</span>
          )}
        </div>
      </Html>
    </group>
  );
}

function TopCard({ value }: { value: CardValue }) {
  const def = CARD_DEFINITIONS[value];
  return (
    <group position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.7, 1, 0.03]} />
        <meshStandardMaterial color="#f8f5ec" />
      </mesh>
      <Html position={[0, 0, 0.05]} center distanceFactor={7} zIndexRange={[5, 0]}>
        <div
          style={{ pointerEvents: "none" }}
          className="flex select-none flex-col items-center text-gray-900"
        >
          <span className="text-2xl leading-none">{def.icon}</span>
          <span className="text-xs font-bold">
            {value} · {def.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

function Scene({
  players,
  currentTurnSeat,
  protectedSeats,
  playing,
  myUserId,
  lastActorSeat,
  deckCount,
  discardPile,
}: Table3DProps) {
  // "Eu" fico na frente (perto da câmera); os outros distribuídos ao redor.
  const myIndex = Math.max(
    0,
    players.findIndex((p) => p.user_id === myUserId)
  );
  const n = players.length;
  const top = discardPile[discardPile.length - 1];

  return (
    <>
      <ambientLight intensity={0.6} color="#ffd9a8" />
      <spotLight
        position={[0, 6, 2.5]}
        angle={0.7}
        penumbra={0.6}
        intensity={120}
        color="#ffdca8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-3, 3, -2]} intensity={20} color="#ffba7a" />

      {/* Mesa: madeira + feltro */}
      <mesh position={[0, -0.22, 0]} receiveShadow>
        <cylinderGeometry args={[3.1, 3.1, 0.3, 64]} />
        <meshStandardMaterial color="#4a2e1b" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[2.85, 2.85, 0.06, 64]} />
        <meshStandardMaterial color="#1f5a40" roughness={0.95} />
      </mesh>

      {/* Baralho + descarte no centro */}
      <group position={[-0.8, 0, 0]}>
        {Array.from({ length: Math.min(6, Math.max(1, Math.ceil(deckCount / 3))) }).map((_, i) => (
          <mesh key={i} position={[0, 0.04 + i * 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <boxGeometry args={[0.7, 1, 0.02]} />
            <meshStandardMaterial color="#7f1d1d" />
          </mesh>
        ))}
        <Html position={[0, 0.3, 0]} center distanceFactor={9} zIndexRange={[5, 0]}>
          <div style={{ pointerEvents: "none" }} className="select-none text-xs text-amber-100/80">
            🂠 {deckCount}
          </div>
        </Html>
      </group>
      <group position={[0.8, 0, 0]}>{top !== undefined && <TopCard value={top} />}</group>

      {/* Jogadores ao redor da mesa */}
      {players.map((p, idx) => {
        const k = (idx - myIndex + n) % n;
        const theta = Math.PI / 2 + (k * 2 * Math.PI) / n; // eu em +z (frente)
        const x = SEAT_RADIUS * Math.cos(theta);
        const z = SEAT_RADIUS * Math.sin(theta);
        const faceAngle = Math.atan2(x, z);
        const isTurn = p.seat === currentTurnSeat && playing;
        return (
          <group key={p.id}>
            {isTurn && <TurnRing position={[x, -0.01, z]} />}
            <group position={[x, 0, z]} rotation={[0, faceAngle, 0]}>
              <Seat
                player={p}
                isTurn={isTurn}
                isProtected={protectedSeats.includes(p.seat)}
                justPlayed={p.seat === lastActorSeat}
                isMe={p.user_id === myUserId}
              />
            </group>
          </group>
        );
      })}

      <ContactShadows position={[0, -0.04, 0]} opacity={0.5} scale={8} blur={2.5} far={4} />

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.5}
        maxPolarAngle={1.25}
        minDistance={4}
        maxDistance={7}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function Table3D(props: Table3DProps) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-2xl border-8 border-[#3a2414] sm:h-[400px]">
      <Canvas shadows camera={{ position: [0, 3.4, 4.6], fov: 50 }} dpr={[1, 2]}>
        <color attach="background" args={["#160e0b"]} />
        <fog attach="fog" args={["#160e0b", 7, 13]} />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
