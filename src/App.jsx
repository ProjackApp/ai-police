import React, { useEffect, useRef, useState } from 'react';
import { useMicVAD } from '@ricky0123/vad-react';

// --- IMPORT ASSETS VIDEO ---
import idleVideo from './assets/move.mp4';
import talkingVideo from './assets/talk.mp4';

// Komponen Animasi Wave saat mendengarkan
const VoiceWave = () => (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-64 h-64 pointer-events-none z-40">
        <div className="absolute w-24 h-24 rounded-full border-2 border-white/50 animate-ping opacity-75"></div>
        <div className="absolute w-40 h-40 rounded-full border-2 border-white/40 animate-ping" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute w-56 h-56 rounded-full border-2 border-white/30 animate-ping" style={{ animationDelay: '1s' }}></div>
    </div>
);

// --- MODIFIED COMPONENT: FULL HISTORY DISPLAY (Hanya Menggunakan Bagian Tengah Layar) ---
const FullHistoryDisplay = ({ history }) => {
    const historyEndRef = useRef(null);

    // Otomatis scroll ke pesan terakhir
    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history]);

    return (
        // Di sini kita mengatur posisi vertikal agar tidak full layar.
        // top-32 (sekitar 8rem) memberikan ruang di atas header.
        // bottom-48 memberikan ruang di atas input area.
        <div className="absolute top-96 bottom-48 left-0 w-full px-4 z-40 pointer-events-none">
            <div className="h-full overflow-y-auto space-y-4 pr-2 pointer-events-auto">
                {history.length === 0 && (
                    <div className="text-white/30 text-center mt-10 italic">Mulai percakapan...</div>
                )}
                {history.map((chat, i) => (
                    <div key={i} className={`flex flex-col ${chat.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] backdrop-blur-sm ${
                            chat.sender === 'user' 
                            ? 'bg-blue-600/80 text-white rounded-tr-sm' 
                            : 'bg-black/50 text-gray-100 rounded-tl-sm'
                        }`}>
                            <span className="text-xs font-semibold mb-1 block opacity-70">
                                {chat.sender === 'user' ? 'Anda' : 'AI Police'}
                            </span>
                            {chat.message}
                        </div>
                    </div>
                ))}
                <div ref={historyEndRef} /> 
            </div>
        </div>
    );
};
// --- END MODIFIED COMPONENT ---


export default function VoiceTextAI() {
    // --- STATE MANAGEMENT ---
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [history, setHistory] = useState([]);
    const [connected, setConnected] = useState(false); 
    const [isAiTalking, setIsAiTalking] = useState(false); 

    // --- REFS ---
    const recognitionRef = useRef(null);
    const avatarVideoRef = useRef(null);

    // ==========================
    // 🤖 LOGIC VIDEO & TTS (AI BICARA)
    // ==========================
    const speakAI = (text) => {
        if (!('speechSynthesis' in window)) return;

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID'; 
        utterance.rate = 1.0;

        utterance.onstart = () => {
            setIsAiTalking(true);
            if(avatarVideoRef.current) {
                avatarVideoRef.current.play().catch(e => console.log("Video play error:", e));
            }
        };

        utterance.onend = () => {
            setIsAiTalking(false);
        };

        window.speechSynthesis.speak(utterance);
        
        setHistory((prev) => [...prev, { sender: 'ai', message: text }]);
    };

    // Fungsi simulasi AI Response
    const simulateAIResponse = (userText) => {
        setTimeout(() => {
            const responses = [
                `Kamu berkata: "${userText}". Mode simulasi aktif.`,
                "Tampilan video sudah berfungsi! Mulut saya bergerak, kan?",
                "Ini adalah respon acak. Sekarang giliranmu bicara lagi.",
                "Aku tidak bisa memproses pertanyaan kompleks di mode ini."
            ];
            const randomRes = responses[Math.floor(Math.random() * responses.length)];
            speakAI(randomRes);
        }, 1000);
    };

    // ==========================
    // 🔊 VAD - Voice Activity Detection
    // ==========================
    const vad = useMicVAD({
        getStream: async () => {
             const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, autoGainControl: true, noiseSuppression: true, },
            });
            return stream;
        },
        onSpeechStart: () => {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                setIsAiTalking(false);
            }
        },
        onSpeechEnd: () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {}
                setTimeout(() => {
                    try { recognitionRef.current.start(); } catch (e) {}
                }, 120);
            }
        },
    });

    // ==========================
    // 🎤 Speech Recognition (Browser Native)
    // ==========================
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'id-ID';

            rec.onstart = () => setListening(true);
            rec.onend = () => setListening(false);

            rec.onresult = (ev) => {
                let text = '';
                for (let i = ev.resultIndex; i < ev.results.length; i++) {
                    text += ev.results[i][0].transcript;
                }
                setTranscript(text);
                setHistory((prev) => [...prev, { sender: 'user', message: text }]);
                simulateAIResponse(text);
            };

            rec.onerror = (e) => {
                console.error('Speech error:', e);
                setListening(false);
            };

            recognitionRef.current = rec;
        }
    }, []);

    // ==========================
    // 🔌 Logika Koneksi (Mode Simulasi)
    // ==========================
    const handleStart = () => {
        setConnected(true);
    };

    const handleStop = () => {
        setConnected(false);
    };

    // ==========================
    // 📩 Send Text Manual
    // ==========================
    const handleSendClick = () => {
        if (!transcript.trim()) return;

        setHistory((prev) => [...prev, { sender: 'user', message: transcript }]);
        simulateAIResponse(transcript);
        setTranscript('');
    };

    const handleMicToggle = () => {
        const rec = recognitionRef.current;
        if (!rec) return;

        if (isAiTalking) {
            window.speechSynthesis.cancel();
            setIsAiTalking(false);
            try { rec.start(); } catch (e) {}
            return;
        }

        if (listening) {
            try { rec.stop(); } catch (e) {}
        } else {
            try { rec.stop(); rec.start(); } catch (e) {}
        }
    };

    return (
        <div className="w-full min-h-screen bg-gray-900 flex justify-center items-center p-4">
            <div className="w-full max-w-sm h-[90vh] bg-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
                
                {/* --- LAYER 1: BACKGROUND AI VIDEO --- */}
                <div className="absolute inset-0 z-0 bg-black">
                     <video
                        ref={avatarVideoRef}
                        key={isAiTalking ? "talking" : "idle"}
                        src={isAiTalking ? talkingVideo : idleVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>
                </div>

                <audio id="audio" />

                {/* --- LAYER 3: HEADER --- */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-30">
                    <div className="bg-blue-500/80 text-white text-xs px-3 py-1 rounded-full flex items-center shadow-lg backdrop-blur-sm">
                        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                        <span className="ml-2">{connected ? 'Online (Simulasi)' : 'Offline'}</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={connected ? handleStop : handleStart}
                            className={`${connected ? 'bg-red-500' : 'bg-green-500'} px-4 py-1 rounded-full text-white text-xs font-medium shadow-lg hover:brightness-110 transition-all`}>
                            {connected ? 'Stop' : 'Start'}
                        </button>
                    </div>
                </div>

                {/* --- ANIMASI WAVE --- */}
                {listening && <VoiceWave />}

                {/* --- VAD Indicator --- */}
                {vad.userSpeaking && (
                    <div className="absolute bottom-36 w-full text-center z-50">
                         <span className="bg-black/60 text-white px-4 py-1 rounded-full text-xs backdrop-blur-md border border-white/10">
                            Mendengarkan...
                         </span>
                    </div>
                )}
                
                {/* --- FULL SCROLLABLE FLOATING HISTORY --- */}
                <FullHistoryDisplay history={history} />


                {/* --- INPUT AREA --- */}
                <div className="absolute bottom-0 left-0 w-full p-6 z-30 flex flex-col items-center">
                    {/* Quick Responses */}
                    {!listening && !isAiTalking && (
                        <div className="flex gap-2 mb-4 overflow-x-auto w-full justify-center pb-2">
                            {['Apa kabar?', 'Siapa kamu?', 'Nyanyi dong!'].map((s) => (
                                <button
                                    key={s}
                                    className="px-4 py-2 text-xs bg-white/10 hover:bg-white/20 text-white rounded-full border border-white/5 transition-all whitespace-nowrap backdrop-blur-sm"
                                    onClick={() => {
                                        setTranscript(s);
                                        simulateAIResponse(s);
                                    }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="w-full flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-[2rem] px-2 py-2 border border-white/10 shadow-xl">
                        <input
                            type="text"
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder={listening ? "Bicara sekarang..." : "Ketik pesan..."}
                            disabled={listening || isAiTalking}
                            className="flex-1 bg-transparent text-white outline-none text-sm px-4 placeholder:text-white/30"
                        />

                        <button
                            onClick={handleMicToggle}
                            disabled={isAiTalking && !listening}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-all ${
                                listening ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] scale-110' : 'bg-blue-600 hover:bg-blue-500'
                            }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5">
                                <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
                                <path d="M6 13.5a7.5 7.5 0 0 0 15 0v-.75a.75.75 0 0 0-1.5 0v.75a6 6 0 0 1-12 0v-.75a.75.75 0 0 0-1.5 0v.75Z" />
                            </svg>
                        </button>

                        <button
                            onClick={handleSendClick}
                            disabled={isAiTalking}
                            className="bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}