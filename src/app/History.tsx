import React, { useEffect, useRef } from 'react';

type Chat = { sender: 'user' | 'ai'; message: string };

export const FullHistoryDisplay: React.FC<{ history: Chat[] }> = ({ history }) => {
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const latestChat = history.filter(chat => chat.sender === 'user').slice(-1);

  return (
    <div className="absolute bottom-24 left-0 w-full px-4 z-40 pointer-events-none">
      <div className="flex flex-col justify-end pr-2 pointer-events-auto">
        {latestChat.map((chat, i) => (
          <div key={i} className="flex flex-col items-end">
            <div className="px-4 py-2 rounded-2xl text-sm max-w-[85%] backdrop-blur-sm bg-blue-600/80 text-white rounded-tr-sm shadow-lg">
              <span className="text-xs font-semibold mb-1 block opacity-70">Anda</span>
              {chat.message}
            </div>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>
    </div>
  );
};
