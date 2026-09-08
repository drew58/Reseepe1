import { motion } from "framer-motion";

const letters = [
  { char: "R", color: "text-brand-green" },
  { char: "E", color: "text-brand-green" },
  { char: "S", color: "text-brand-orange" },
  { char: "E", color: "text-brand-orange" },
  { char: "E", color: "text-brand-orange" },
  { char: "P", color: "text-brand-green" },
  { char: "E", color: "text-brand-green" },
];

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {}}
    >
      <div className="absolute flex items-center text-5xl font-bold font-display">
        {letters.map((letter, index) => (
          <motion.span
            key={`${letter.char}-${index}`}
            className={letter.color}
            initial={{ opacity: 0, y: 30, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.3 + index * 0.12,
              duration: 0.4,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            onAnimationComplete={index === letters.length - 1 ? () => setTimeout(onComplete, 800) : undefined}
          >
            {letter.char}
          </motion.span>
        ))}
      </div>

      {/* Subtle tagline */}
      <motion.p
        className="absolute bottom-[35%] text-sm text-muted-foreground font-medium tracking-wider"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
      >
        Discover what to cook
      </motion.p>
    </motion.div>
  );
};

export default SplashScreen;
