import { CreateRoomForm } from "@/components/lobby/CreateRoomForm";
import { JoinRoomForm } from "@/components/lobby/JoinRoomForm";
import { ALL_CARD_VALUES, CARD_DEFINITIONS } from "@/lib/games/love-letter/data/cards";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
      <header className="text-center">
        <h1 className="bg-gradient-to-b from-rose-200 to-rose-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          Love Letter
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Carta secreta, dedução e blefe — jogue com os amigos.
        </p>
        <div className="mt-4 flex justify-center gap-1">
          {ALL_CARD_VALUES.map((v) => (
            <span
              key={v}
              title={CARD_DEFINITIONS[v].name}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-sm"
            >
              {CARD_DEFINITIONS[v].icon}
            </span>
          ))}
        </div>
      </header>

      <CreateRoomForm />
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
      </div>
      <JoinRoomForm />
    </main>
  );
}
