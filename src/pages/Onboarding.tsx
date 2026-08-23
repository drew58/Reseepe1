import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import food1 from "@/assets/food-1.jpg";
import food2 from "@/assets/food-2.jpg";
import food3 from "@/assets/food-3.jpg";
import food4 from "@/assets/food-4.jpg";

const cuisines = [
  "Italian",
  "Asian",
  "African",
  "Mexican",
  "Indian",
  "Mediterranean",
  "Middle Eastern",
  "American",
  "Caribbean",
  "European",
];

const continents = [
  "Africa",
  "Asia",
  "Europe",
  "North America",
  "South America",
  "Oceania",
];

const welcomeSlides = [
  {
    id: 1,
    image: food1,
    title: "Discover what to cook",
    description: "Scroll through delicious recipes",
  },
  {
    id: 2,
    image: food2,
    title: "Find your next meal",
    description: "In seconds, not hours",
  },
  {
    id: 3,
    image: food3,
    title: "Learn from creators",
    description: "Real chefs, real recipes",
  },
  {
    id: 4,
    image: food4,
    title: "Cook with what you have",
    description: "Search by ingredients",
  },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = welcome carousel, 1 = cuisines, 2 = continent
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedContinent, setSelectedContinent] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((c) => c !== cuisine)
        : [...prev, cuisine]
    );
  };

  const handleNextSlide = () => {
    if (currentSlide === welcomeSlides.length - 1) {
      // Last slide - go to cuisines
      setStep(1);
    } else {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleContinueStep1 = () => {
    if (selectedCuisines.length === 0) {
      toast.error("Select at least one cuisine");
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (!selectedContinent) {
      toast.error("Select your continent");
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem("reseepe_onboarded", "true");

      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            favorite_cuisines: selectedCuisines,
            continent: selectedContinent,
            onboarded: true,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      }

      toast.success("Let's get cooking!");
      navigate(user ? "/home" : "/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Step 0 - Full Screen Welcome Carousel */}
      {step === 0 && (
        <div className="relative w-full h-screen overflow-hidden">
          {/* Background Image */}
          <motion.img
            key={currentSlide}
            src={welcomeSlides[currentSlide].image}
            alt={welcomeSlides[currentSlide].title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradient Fade at Bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Skip Button - Top Right */}
          <button
            onClick={() => setStep(1)}
            className="absolute top-8 right-6 text-white text-sm font-semibold bg-black/40 hover:bg-black/60 px-4 py-2 rounded-full transition-colors z-10"
          >
            Skip
          </button>

          {/* Content at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-20 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-3"
            >
              <h2 className="text-3xl font-bold font-display">
                {welcomeSlides[currentSlide].title}
              </h2>
              <p className="text-sm text-white/80">
                {welcomeSlides[currentSlide].description}
              </p>
            </motion.div>

            {/* Dots Indicator */}
            <div className="flex gap-2 mt-6 mb-6">
              {welcomeSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Next/Get Started Button - Bottom Right */}
          <button
            onClick={handleNextSlide}
            className="absolute bottom-8 right-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 transition-colors z-10 flex items-center justify-center"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Step 1 - Cuisines */}
      {step === 1 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-20">
          <div className="max-w-md w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-3xl font-bold font-display text-foreground mb-2">
                  Welcome to{" "}
                  <span className="text-primary">R</span>
                  <span className="text-primary">E</span>
                  <span className="text-green-500">S</span>
                  <span className="text-green-500">E</span>
                  <span className="text-green-500">E</span>
                  <span className="text-primary">P</span>
                  <span className="text-primary">E</span>
                </h1>
                <p className="text-sm text-muted-foreground">
                  Help us personalize your feed
                </p>
              </div>

              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">
                  What cuisines do you love?
                </h2>
                <div className="space-y-2">
                  {cuisines.map((cuisine) => (
                    <motion.button
                      key={cuisine}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleCuisine(cuisine)}
                      className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                        selectedCuisines.includes(cuisine)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {cuisine}
                    </motion.button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleContinueStep1}
                className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      )}

      {/* Step 2 - Continent */}
      {step === 2 && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 pb-20">
          <div className="max-w-md w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Where are you from?
                </h1>
                <p className="text-sm text-muted-foreground">
                  So we can recommend local creators
                </p>
              </div>

              <div className="space-y-2">
                {continents.map((continent) => (
                  <motion.button
                    key={continent}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedContinent(continent)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                      selectedContinent === continent
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {continent}
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-2xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Get Started"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
