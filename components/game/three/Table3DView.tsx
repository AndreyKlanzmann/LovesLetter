"use client";

import dynamic from "next/dynamic";
import type { Table3DProps } from "./Table3D";

// three.js acessa APIs do browser, então carregamos a cena só no client
// (ssr: false) e com um placeholder enquanto o bundle 3D chega.
const Table3D = dynamic(() => import("./Table3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border-8 border-[#3a2414] bg-[#160e0b] text-sm text-amber-100/60 sm:h-[400px]">
      Preparando a mesa 3D...
    </div>
  ),
});

export function Table3DView(props: Table3DProps) {
  return <Table3D {...props} />;
}
