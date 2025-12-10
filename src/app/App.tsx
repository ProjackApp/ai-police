'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';

import { VoiceWave } from './Voice';
import standby from '../assets/police.mp4';

type Chat = { sender: 'user' | 'ai'; message: string };

declare global {
  interface Window {
    SrsRtcWhipWhepAsync: any;
    slotSessionId: number;
    dbSessionId: string;
    startConnection?: any; // function dari client.js
  }
}

export default function VoiceTextAI(): React.ReactElement {
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState<any>(false);
  const [history, setHistory] = useState<Chat[]>([]);
  const [connected, setConnected] = useState<any>(false);

  const [slotSessionId, setSlotSessionId] = useState<number | null>(null);
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const avatarVideoRef = useRef<HTMLVideoElement | null>(null);

  const srsRef = useRef<any>(null);
  const canRestartRecognition = useRef(true);
  const vadRef = useRef<any>(null);

  // ==========================
  // CEK SESSION DARI client.js
  // ==========================
  const checkSessionFromWindow = async () => {
    // 1) User + Slot
    const name = (
      (document.getElementById('username') as HTMLInputElement)?.value || 'Anonymous'
    ).trim();
    const slot = parseInt(
      (document.getElementById('whep-slot') as HTMLInputElement)?.value || '0',
      10
    );
    setSlotSessionId(slot);

    // 2) Create DB Session
    const s = await fetch('https://live.divtik.xyz/start_session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: name }),
    });

    if (!s.ok) {
      return;
    }

    const sj = await s.json();
    // update UI
    setDbSessionId(sj.session_id);
  };

  useEffect(() => {
    checkSessionFromWindow();
  }, []);

  // =======================
  // AI Speak
  // =======================
  const speakAI = (text: string) => {
    window.speechSynthesis.cancel();
    setHistory(prev => [...prev, { sender: 'ai', message: text }]);
  };

  // ============================================
  // SEND TO SERVER —— TYPE: CHAT (REAL AI)
  // ============================================
  const sendChatToServer = async (text: string) => {
    try {
      const res = await fetch('https://live.divtik.xyz/human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          type: 'chat',
          interrupt: true,

          // === PENTING ===
          sessionid: slotSessionId,
          db_session_id: dbSessionId,
        }),
      });

      const data = await res.json();
      const reply = data.msg || 'Tidak ada respons dari server';

      speakAI(reply);
    } catch (err) {
      speakAI('Maaf, aku mengalami gangguan.');
    }
  };

  // =======================
  // VAD
  // =======================
  const vad = useMicVAD({
    getStream: async () => {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    },
    onSpeechStart: () => {
      canRestartRecognition.current = false;
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    },
    onSpeechEnd: () => {
      setTimeout(() => {
        canRestartRecognition.current = true;
        if (!window.speechSynthesis.speaking) {
          recognitionRef.current?.start();
        }
      }, 150);
    },
  });

  useEffect(() => {
    vadRef.current = vad;
  }, [vad]);

  // =======================
  // Speech Recognition
  // =======================
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'id-ID';

    rec.onstart = () => setListening(true);

    rec.onend = () => {
      setListening(false);
      if (connected && !muted && canRestartRecognition.current) {
        setTimeout(() => rec.start(), 200);
      }
    };

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      if (!text) return;

      setHistory(prev => [...prev, { sender: 'user', message: text }]);
      sendChatToServer(text);
    };

    recognitionRef.current = rec;

    return () => {
      rec.onstart = null;
      rec.onend = null;
      rec.onresult = null;
    };
  }, [connected, muted]);

  // =======================
  // START WHEP
  // =======================
  const handleStart = async () => {
    setConnected(true);

    const WHEP = window.SrsRtcWhipWhepAsync;
    if (!WHEP) {
      setConnected(false);
      return;
    }

    try {
      const sdk = new WHEP();
      srsRef.current = sdk;

      const video = avatarVideoRef.current;
      video.srcObject = sdk.stream;
      video.muted = false;

      await sdk.play('https://live.divtik.xyz/whep/');
      await video.play().catch(() => {});
    } catch (err) {
      setConnected(false);
      return;
    }

    setTimeout(() => {
      try {
        recognitionRef.current?.start();
      } catch {}
    }, 400);
  };

  // =======================
  // STOP CONNECTION
  // =======================
  const handleStop = () => {
    setConnected(false);
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();

    try {
      srsRef.current?.close();
    } catch {}

    if (avatarVideoRef.current) {
      avatarVideoRef.current.pause();
      avatarVideoRef.current.srcObject = null;
    }
  };

  const toggleMute = () => {
    setMuted((prev: any) => {
      const next = !prev;
      if (next) {
        recognitionRef.current?.stop();
        window.speechSynthesis.cancel();
      } else {
        setTimeout(() => recognitionRef.current?.start(), 400);
      }
      return next;
    });
  };

  // =======================
  // UI
  // =======================
  return (
    <div className="w-full min-h-screen bg-gray-900 flex justify-center items-center p-4">
      <div className="w-full max-w-sm h-[90vh] relative bg-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {/* AVATAR VIDEO */}
        <video
          ref={avatarVideoRef}
          src={!connected ? standby : ''}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        {/* TOP BAR */}
        <div className="absolute top-0 left-0 w-full p-5 flex justify-between items-center z-40">
          <div className="bg-blue-600/80 text-white px-3 py-1 rounded-full text-xs">
            {connected ? (muted ? 'Online (Muted)' : 'Online (Listening)') : 'Offline'}
          </div>

          <button
            onClick={connected ? handleStop : handleStart}
            className={`px-4 py-1 rounded-full text-white text-xs ${
              connected ? 'bg-red-500' : 'bg-green-500'
            }`}
          >
            {connected ? 'Stop' : 'Start'}
          </button>
        </div>

        {!muted && listening && <VoiceWave />}
        {!muted && vad.userSpeaking && (
          <div className="absolute bottom-36 w-full text-center z-50">
            <span className="bg-black/60 text-white px-4 py-1 rounded-full text-xs">
              Mendengarkan...
            </span>
          </div>
        )}

        {/* <FullHistoryDisplay history={history} /> */}

        {/* MUTE BUTTON */}
        <div className="absolute bottom-0 w-full p-6 flex justify-center z-40">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full text-white flex items-center justify-center ${
              muted ? 'bg-gray-600' : 'bg-blue-600'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-5 h-5"
            >
              <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
              <path d="M6 13.5a7.5 7.5 0 0 0 15 0v-.75a.75.75 0 0 0-1.5 0v.75a6 6 0 0 1-12 0v-.75a.75.75 0 0 0-1.5 0v.75Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
