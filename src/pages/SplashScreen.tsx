import { motion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background flex items-center justify-center"
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {}}
    >
      <motion.div
        className="absolute text-5xl font-bold font-display"
        initial={{ opacity: 0, y: 30, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 200, damping: 15 }}
        onAnimationComplete={() => setTimeout(onComplete, 800)}
      >
        <BrandLogo />
      </motion.div>

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
