import { useNavigate } from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
      <p className="text-4xl mb-3">😕</p>
      <p className="font-semibold text-gray-700 mb-1">Page not found</p>
      <button onClick={() => navigate('/')} className="text-indigo-600 text-sm font-medium mt-2">
        Go home →
      </button>
    </div>
  );
}
