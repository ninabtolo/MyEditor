import { useState } from 'react';
import 'animate.css'; 
import { CodeEditor } from './components/CodeEditor';

function App() {
  const [showEditor, setShowEditor] = useState(false);

  const handleStart = () => {
    setShowEditor(true); 
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-gray-200 w-full">
      {!showEditor ? (
        <div className="flex flex-col items-center animate__animated animate__fadeIn">
          <h1 className="text-4xl font-bold mb-4 text-blue-100">Welcome to the Editor</h1>
          <p className="text-lg mb-6 text-blue-200">Open/create a file to start!</p>
          <button
            onClick={handleStart}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-md transition-colors shadow-lg"
          >
            Ok
          </button>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 w-full p-4">
          <div className="w-full max-w-[1300px]">
            <h1 className="text-3xl font-bold text-blue-100 mb-6">Code Editor</h1>
            <div className="flex justify-center">
              <div className="w-full h-[calc(100vh-150px)] rounded-lg overflow-hidden shadow-2xl border border-blue-900">
                <CodeEditor />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
