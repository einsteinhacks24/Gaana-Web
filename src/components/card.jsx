export function Card({ children, ...props }) {
  return <div className="rounded-xl border bg-white shadow p-4" {...props}>{children}</div>;
}

export function CardContent({ children, ...props }) {
  return <div className="mt-2 text-sm text-gray-600" {...props}>{children}</div>;
}