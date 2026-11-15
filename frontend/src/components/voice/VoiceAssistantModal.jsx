import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, Volume2, X, Send, Sparkles } from "lucide-react"
import { api } from "../../lib/api"
import { useAuth } from "../../context/AuthContext"

export function VoiceAssistantModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [chatLog, setChatLog] = useState([
    {
      sender: "ai",
      text: `Namaste ${user?.elder_name || "Ramesh ji"}! Main aapka DawaSaathi hoon. Aap mujhse apni dawaiyon, agle doctor appointment ya routine ke baare mein pooch sakte hain.`,
    },
  ])
  const [loading, setLoading] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = "hi-IN"

      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("")
        setTranscript(text)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      setTranscript("")
      setIsListening(true)
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.warn("Speech recognition error:", err)
      }
    } else {
      alert("Speech recognition is not supported in this browser. Please type your query below.")
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleSend = async (messageText) => {
    const textToSend = messageText || transcript
    if (!textToSend.trim()) return

    const newChat = [...chatLog, { sender: "user", text: textToSend }]
    setChatLog(newChat)
    setTranscript("")
    setLoading(true)

    try {
      const res = await api.companionChat(textToSend)
      setChatLog([...newChat, { sender: "ai", text: res.reply }])

      // Text to speech playback
      if ("speechSynthesis" in window && res.speech_text) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(res.speech_text)
        utterance.lang = "hi-IN"
        utterance.rate = 0.95
        window.speechSynthesis.speak(utterance)
      }
    } catch (err) {
      setChatLog([
        ...newChat,
        {
          sender: "ai",
          text: "Maaf kijiye, abhi connect hone mein dikkat aa rahi hai. Aapki scheduled dawai time par lete rahiye.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const speakText = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "hi-IN"
      utterance.rate = 0.95
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-white dark:bg-app-dark-surface rounded-3xl shadow-2xl border border-app-border dark:border-app-dark-border overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-app-border dark:border-app-dark-border flex items-center justify-between bg-teal-50/50 dark:bg-teal-950/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center shadow-soft-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-navy-900 dark:text-white text-base">
                    DawaSaathi AI Companion
                  </h3>
                  <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                    Hindi • Hinglish • English
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {chatLog.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center text-xs font-bold mt-1 shrink-0">
                      DS
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-teal-500 text-white rounded-br-none"
                        : "bg-slate-100 dark:bg-slate-800 text-navy-900 dark:text-white rounded-bl-none"
                    }`}
                  >
                    <div>{msg.text}</div>
                    {msg.sender === "ai" && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="mt-2 text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Listen
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold pl-10">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                  <span>DawaSaathi is thinking...</span>
                </div>
              )}
            </div>

            {/* Microphone & Input Footer */}
            <div className="p-4 border-t border-app-border dark:border-app-dark-border bg-slate-50/50 dark:bg-navy-900/40">
              <div className="flex flex-col items-center justify-center mb-3">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={isListening ? stopListening : startListening}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-soft-lg transition-all ${
                    isListening
                      ? "bg-red-500 text-white shadow-red-500/30 animate-pulse"
                      : "bg-teal-500 text-white shadow-teal-500/30 hover:bg-teal-600"
                  }`}
                >
                  {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </motion.button>
                <span className="text-xs font-semibold text-slate-500 mt-2">
                  {isListening ? "Listening... Speak now" : "Tap microphone to speak"}
                </span>
              </div>

              {/* Text Input Fallback */}
              <div className="flex items-center gap-2 bg-white dark:bg-app-dark-surface rounded-2xl border border-app-border dark:border-app-dark-border p-1.5 pl-3">
                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Or type here... e.g. Meri agli dawa kab hai?"
                  className="flex-1 bg-transparent text-sm text-navy-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!transcript.trim() || loading}
                  className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-teal-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
