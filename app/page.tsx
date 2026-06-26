import { CreateRoomForm } from "@/components/lobby/CreateRoomForm";
import { JoinRoomForm } from "@/components/lobby/JoinRoomForm";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16">
      <h1 className="text-2xl font-bold">Love Letter</h1>
      <CreateRoomForm />
      <JoinRoomForm />
    </main>
  );
}
