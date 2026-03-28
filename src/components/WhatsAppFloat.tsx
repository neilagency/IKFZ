'use client';

import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WhatsAppFloat() {
  return (
    <motion.a
      href="https://wa.me/4915224999190"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 2, type: 'spring', stiffness: 200 }}
      className="whatsapp-float"
      aria-label="WhatsApp Support"
    >
      <MessageCircle className="w-7 h-7" />
    </motion.a>
  );
}
