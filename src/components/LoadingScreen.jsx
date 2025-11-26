export default function LoadingScreen({ message = 'Caricamento...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <p className="text-lg font-medium">{message}</p>
    </div>
  );
}
