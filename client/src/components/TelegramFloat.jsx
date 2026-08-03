import React from 'react'
import { Send } from 'lucide-react'

export default function TelegramFloat() {
  return (
    <a
      href="https://t.me/HELEN_MARISOL"
      target="_blank"
      rel="noopener noreferrer"
      className="telegram-float"
      aria-label="Contact us on Telegram"
    >
      <Send size={22} strokeWidth={2.5} />
    </a>
  )
}
