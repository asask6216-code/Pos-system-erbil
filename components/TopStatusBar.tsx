
import React, { useState, useEffect } from 'react';
import { Bluetooth, Battery, Clock, Wifi } from 'lucide-react';

const TopStatusBar: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [batteryLevel, setBatteryLevel] = useState<number>(100);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // الحصول على نسبة الشحن الحقيقية
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.floor(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.floor(battery.level * 100));
        });
      });
    }

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gray-900 text-white px-4 py-1.5 flex justify-between items-center text-[10px] font-bold border-b border-gray-800">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Bluetooth size={12} className="text-blue-400" />
          <span>جاهز للربط</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi size={12} className="text-green-400" />
          <span>متصل بالسحابة</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{time.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Battery size={12} className={batteryLevel < 20 ? 'text-red-500' : 'text-green-400'} />
          <span>%{batteryLevel}</span>
        </div>
      </div>
    </div>
  );
};

export default TopStatusBar;
