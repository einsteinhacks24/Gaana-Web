export function Tabs({ children }) {
  return <div>{children}</div>;
}

export function TabsList({ children }) {
  return <div className="flex gap-2 mb-4">{children}</div>;
}

export function TabsTrigger({ children, value, onClick, className = '' }) {
  return (
    <button
      onClick={() => onClick?.(value)}
      className={`px-3 py-1 rounded border text-sm ${className}`}
    >
      {children}
    </button>
  );
}
