
import React from 'react';
import { Delete, Check } from 'lucide-react';

interface NumpadProps {
  value: string;
  onChange: (val: string) => void;
  onConfirm: () => void;
}

const Numpad: React.FC<NumpadProps> = ({ value, onChange, onConfirm }) => {
  const addDigit = (d: string) => onChange(value + d);
  const clear = () => onChange('');
  const backspace = () => onChange(value.slice(0, -1));

  const buttons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'C'];

  return (
    <div className="grid grid-cols-3 gap-3 p-4 bg-gray-100 rounded-2xl shadow-inner">
      {buttons.map((btn) => (
        <button
          key={btn}
          onClick={() => btn === 'C' ? clear() : addDigit(btn)}
          className="h-20 bg-white shadow-md rounded-xl text-3xl font-bold active:bg-blue-500 active:text-white transition-colors"
        >
          {btn}
        </button>
      ))}
      <button 
        onClick={backspace}
        className="h-20 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center col-span-1 shadow-md"
      >
        <Delete size={32} />
      </button>
      <button 
        onClick={onConfirm}
        className="h-20 bg-green-500 text-white rounded-xl flex items-center justify-center col-span-2 shadow-md font-bold text-2xl"
      >
        <Check size={32} className="ml-2" /> إدخال
      </button>
    </div>
  );
};

export default Numpad;
