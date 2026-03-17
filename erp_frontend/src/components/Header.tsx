export default function Header({ title }: { title: string }) {
  return (
    <header className="mb-8">
      <div className="shell-panel px-6 py-5">
        <div className="shell-section-title mb-2">Workspace</div>
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-[var(--brand-orange)] to-orange-200" />
      </div>
    </header>
  );
}
