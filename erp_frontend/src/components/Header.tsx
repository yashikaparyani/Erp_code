export default function Header({ title }: { title: string }) {
  return (
    <header className="mb-8">
      <h2 className="text-3xl font-bold text-blue-900">{title}</h2>
      <div className="h-1 w-12 bg-blue-200 rounded mt-2 mb-2" />
    </header>
  );
}