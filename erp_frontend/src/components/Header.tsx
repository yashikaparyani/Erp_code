export default function Header({ title }: { title: string }) {
  return (
    <header className="mb-6 sm:mb-8">
      <div className="shell-panel px-4 py-4 sm:px-6 sm:py-5">
        <div className="shell-section-title mb-2">Workspace</div>
        <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h2>
        <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-[var(--brand-orange)] to-orange-200" />
      </div>
    </header>
  );
}
