import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VideoFullScreenModalProps {
  src: string | null;
  title: string;
  onClose: () => void;
}

const VideoFullScreenModal = ({ src, title, onClose }: VideoFullScreenModalProps) => {
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-foreground/20 backdrop-blur-md flex items-center justify-center hover:bg-foreground/30 transition-colors"
          >
            <X className="w-5 h-5 text-primary-foreground" />
          </button>

          {/* Video */}
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full max-h-full object-contain"
              aria-label={title}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VideoFullScreenModal;