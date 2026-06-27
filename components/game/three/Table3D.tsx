"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { Database } from "@/lib/supabase/types";
import { CARD_DEFINITIONS, type CardValue } from "@/lib/games/love-letter/data/cards";
import { avatarForSeat } from "@/lib/games/love-letter/avatars";

type RoomPlayerRow = Database["public"]["Tables"]["room_players"]["Row"];

const SEAT_RADIUS = 2.55;
const DISCARD_POS: [number, number, number] = [0.8, 0.12, 0];

export interface Table3DProps {
  players: RoomPlayerRow[];
  currentTurnSeat: number | null;
  protectedSeats: number[];
  playing: boolean;
  myUserId: string | null;
  lastActorSeat: number | null;
  deckCount: number;
  discardPile: CardValue[];
  myHand: CardValue[];
  isMyTurn: boolean;
  playable: CardValue[];
  selectedCard: CardValue | null;
  onSelectCard: (v: CardValue) => void;
}

// ---- Texturas procedurais (geradas em canvas, sem arquivos) ---------------
function makeWoodTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 512, 512);
  g.addColorStop(0, "#5a3a22");
  g.addColorStop(0.5, "#43291a");
  g.addColorStop(1, "#32200f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 200; i++) {
    ctx.strokeStyle = `rgba(${20 + Math.random() * 50},${12 + Math.random() * 30},6,0.18)`;
    ctx.lineWidth = 0.5 + Math.random() * 2.5;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + (Math.random() * 24 - 12), 340, y + (Math.random() * 24 - 12), 512, y + (Math.random() * 30 - 15));
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function makeFeltTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1f5a40";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const shade = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},0.04)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---- Cartas ---------------------------------------------------------------
function CardLabel({ value }: { value: CardValue }) {
  const def = CARD_DEFINITIONS[value];
  return (
    <Html position={[0, 0, 0.03]} center distanceFactor={6} zIndexRange={[5, 0]}>
      <div style={{ pointerEvents: "none" }} className="flex select-none flex-col items-center text-gray-900">
        <span className="text-xl leading-none">{def.icon}</span>
        <span className="text-[11px] font-bold leading-tight">
          {value} · {def.name}
        </span>
      </div>
    </Html>
  );
}

function FaceCard({
  value,
  position,
  rotation,
  clickable = false,
  selected = false,
  onClick,
}: {
  value: CardValue;
  position?: [number, number, number];
  rotation?: [number, number, number];
  clickable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <group position={position} rotation={rotation}>
      <group position={[0, selected ? 0.16 : 0, 0]}>
        <mesh
          castShadow
          onClick={
            clickable && onClick
              ? (e) => {
                  e.stopPropagation();
                  onClick();
                }
              : undefined
          }
          onPointerOver={
            clickable
              ? () => {
                  setHover(true);
                  document.body.style.cursor = "pointer";
                }
              : undefined
          }
          onPointerOut={
            clickable
              ? () => {
                  setHover(false);
                  document.body.style.cursor = "auto";
                }
              : undefined
          }
        >
          <boxGeometry args={[0.52, 0.74, 0.02]} />
          <meshStandardMaterial
            color={selected ? "#fff4c2" : "#f8f5ec"}
            emissive={selected || hover ? "#f59e0b" : "#000000"}
            emissiveIntensity={selected ? 0.55 : hover ? 0.3 : 0}
            roughness={0.6}
          />
        </mesh>
        <CardLabel value={value} />
      </group>
    </group>
  );
}

function CardBackFan({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const off = i - (count - 1) / 2;
        return (
          <mesh key={i} position={[off * 0.16, 0.32, off * 0.02]} rotation={[0, 0, off * 0.12]} castShadow>
            <boxGeometry args={[0.42, 0.6, 0.02]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
        );
      })}
    </>
  );
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

// Lampião balançando: ponto de luz quente + esfera emissiva que oscila.
function SwingingLamp() {
  const light = useRef<THREE.PointLight>(null);
  const ball = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const x = Math.sin(clock.elapsedTime * 0.7) * 0.5;
    const z = Math.cos(clock.elapsedTime * 0.5) * 0.3;
    if (light.current) light.current.position.set(x, 3.8, z);
    if (ball.current) ball.current.position.set(x, 3.8, z);
  });
  return (
    <group>
      <pointLight ref={light} position={[0, 3.8, 0]} intensity={55} color="#ffce8a" distance={14} decay={1.4} />
      <mesh ref={ball} position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#ffce8a" emissive="#ffce8a" emissiveIntensity={2.5} />
      </mesh>
    </group>
  );
}

// Carta voando do assento até o descarte: começa de COSTAS (verso vermelho) e
// vira para a FACE no meio do voo, num arco.
function FlyingCard({
  from,
  value,
  onDone,
}: {
  from: [number, number, number];
  value: CardValue;
  onDone: () => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const [flipped, setFlipped] = useState(false);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / 0.65);
    const e = 1 - Math.pow(1 - t, 3);
    if (ref.current) {
      ref.current.position.set(
        from[0] + (DISCARD_POS[0] - from[0]) * e,
        from[1] + (DISCARD_POS[1] - from[1]) * e + Math.sin(e * Math.PI) * 0.9,
        from[2] + (DISCARD_POS[2] - from[2]) * e
      );
      // 1 volta e meia: termina deitada (face para cima) no descarte
      ref.current.rotation.set(-Math.PI / 2 + (Math.PI / 2) * (1 - e), e * Math.PI * 3, 0);
    }
    if (t > 0.5 && !flipped) setFlipped(true);
    if (t >= 1 && !done.current) {
      done.current = true;
      onDone();
    }
  });
  return (
    <group ref={ref}>
      {flipped ? (
        <FaceCard value={value} />
      ) : (
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.74, 0.02]} />
          <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

function Scene(props: Table3DProps) {
  const {
    players,
    currentTurnSeat,
    protectedSeats,
    playing,
    myUserId,
    lastActorSeat,
    deckCount,
    discardPile,
    myHand,
    isMyTurn,
    playable,
    selectedCard,
    onSelectCard,
  } = props;

  const wood = useMemo(() => makeWoodTexture(), []);
  const woodSide = useMemo(() => {
    const t = makeWoodTexture();
    t.repeat.set(8, 1);
    return t;
  }, []);
  const felt = useMemo(() => {
    const t = makeFeltTexture();
    t.repeat.set(3, 3);
    return t;
  }, []);

  const myIndex = Math.max(0, players.findIndex((p) => p.user_id === myUserId));
  const n = players.length;
  const top = discardPile[discardPile.length - 1];

  const layout = players.map((p, idx) => {
    const k = (idx - myIndex + n) % n;
    const theta = Math.PI / 2 + (k * 2 * Math.PI) / n;
    return { p, x: SEAT_RADIUS * Math.cos(theta), z: SEAT_RADIUS * Math.sin(theta) };
  });

  const [fly, setFly] = useState<{ id: number; from: [number, number, number]; value: CardValue } | null>(null);
  const prevLen = useRef(discardPile.length);
  const flyId = useRef(0);
  useEffect(() => {
    if (discardPile.length > prevLen.current && lastActorSeat != null) {
      const seat = layout.find((l) => l.p.seat === lastActorSeat);
      const value = discardPile[discardPile.length - 1];
      if (seat) setFly({ id: ++flyId.current, from: [seat.x, 0.5, seat.z], value });
    }
    prevLen.current = discardPile.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discardPile.length, lastActorSeat]);

  return (
    <>
      <ambientLight intensity={0.5} color="#ffd9a8" />
      <spotLight
        position={[0, 6, 2.5]}
        angle={0.7}
        penumbra={0.6}
        intensity={70}
        color="#ffdca8"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <SwingingLamp />

      {/* Mesa: madeira (lado/base) + feltro (topo) */}
      <mesh position={[0, -0.22, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.1, 3.2, 0.3, 64]} />
        <meshStandardMaterial map={woodSide} color="#6b4427" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <cylinderGeometry args={[2.85, 2.85, 0.06, 64]} />
        <meshStandardMaterial map={wood} color="#8a5a33" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.025, 0]} receiveShadow>
        <cylinderGeometry args={[2.55, 2.55, 0.02, 64]} />
        <meshStandardMaterial map={felt} color="#2a7d5b" roughness={1} />
      </mesh>

      {/* Centro: baralho + topo do descarte */}
      <group position={[-0.8, 0, 0]}>
        {Array.from({ length: Math.min(6, Math.max(1, Math.ceil(deckCount / 3))) }).map((_, i) => (
          <mesh key={i} position={[0, 0.04 + i * 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <boxGeometry args={[0.7, 1, 0.02]} />
            <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
          </mesh>
        ))}
        <Html position={[0, 0.32, 0]} center distanceFactor={9} zIndexRange={[5, 0]}>
          <div style={{ pointerEvents: "none" }} className="select-none text-xs text-amber-100/80">
            🂠 {deckCount}
          </div>
        </Html>
      </group>
      {top !== undefined && <FaceCard value={top} position={DISCARD_POS} rotation={[-Math.PI / 2, 0, 0]} />}
      {fly && <FlyingCard key={fly.id} from={fly.from} value={fly.value} onDone={() => setFly(null)} />}

      {/* Adversários ao redor (avatar + cartas viradas). Não desenho a mim
          mesmo — minha mão aparece em primeira pessoa logo abaixo. */}
      {layout.map(({ p, x, z }) => {
        const isMe = p.user_id === myUserId;
        if (isMe) return null;
        const isTurn = p.seat === currentTurnSeat && playing;
        const faceAngle = Math.atan2(x, z);
        return (
          <group key={p.id}>
            {isTurn && <TurnRing position={[x, -0.01, z]} />}
            <group position={[x, 0, z]} rotation={[0, faceAngle, 0]}>
              <CardBackFan count={p.eliminated_this_round ? 0 : isTurn ? 2 : 1} />
              <Html position={[0, 1.05, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
                <div
                  style={{ pointerEvents: "none" }}
                  className={`flex select-none flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-center ${
                    isTurn ? "bg-amber-400/20 ring-1 ring-amber-300/60" : ""
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-2xl ${
                      isTurn ? "border-amber-300" : p.seat === lastActorSeat ? "border-sky-300/70" : "border-black/40"
                    } ${p.eliminated_this_round ? "opacity-40 grayscale" : ""}`}
                  >
                    {p.eliminated_this_round ? "💀" : avatarForSeat(p.seat)}
                  </div>
                  <span
                    className={`whitespace-nowrap text-xs font-semibold ${
                      p.eliminated_this_round ? "text-gray-400 line-through" : "text-amber-50"
                    }`}
                  >
                    {p.nickname}
                  </span>
                  {protectedSeats.includes(p.seat) && (
                    <span className="rounded bg-blue-500/50 px-1 text-[9px] text-blue-50">Aia</span>
                  )}
                </div>
              </Html>
            </group>
          </group>
        );
      })}

      {/* Minha mão em leque (face para cima), clicável quando é minha vez. */}
      <group position={[0, 0.18, 2.5]} rotation={[-0.6, 0, 0]}>
        {myHand.map((v, i) => {
          const off = i - (myHand.length - 1) / 2;
          const canPlay = isMyTurn && playable.includes(v);
          return (
            <FaceCard
              key={`${v}-${i}`}
              value={v}
              position={[off * 0.62, 0, -Math.abs(off) * 0.05]}
              rotation={[0, 0, -off * 0.12]}
              clickable={canPlay}
              selected={selectedCard === v}
              onClick={() => onSelectCard(v)}
            />
          );
        })}
      </group>

      <ContactShadows position={[0, -0.04, 0]} opacity={0.5} scale={8} blur={2.5} far={4} />
    </>
  );
}

export default function Table3D(props: Table3DProps) {
  return (
    <div className="h-[340px] w-full overflow-hidden rounded-2xl border-8 border-[#3a2414] sm:h-[440px]">
      <Canvas
        shadows
        camera={{ position: [0, 2.7, 3.9], fov: 50 }}
        dpr={[1, 2]}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <color attach="background" args={["#160e0b"]} />
        <fog attach="fog" args={["#160e0b", 8, 14]} />
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
