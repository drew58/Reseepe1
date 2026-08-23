import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ImagePlus, Loader2, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const StoryCreateSheet = ({ open, onClose, onCreated }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const pick = (selected?: File) => {
    if (!selected) return;
    if (selected.size > 80 * 1024 * 1024) return toast.error("Story must be under 80MB");
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
  };

  const publish = async () => {
    if (!user) return navigate("/auth");
    if (!file) return toast.error("Add a photo or video first");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (file.type.startsWith("video/") ? "mp4" : "jpg");
      const path = `${user.id}/stories/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("videos").upload(path, file, { cacheControl: "3600" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("videos").getPublicUrl(path);
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: data.publicUrl,
        media_type: file.type.startsWith("video/") ? "video" : "image",
        caption: caption.trim() || null,
      });
      if (error) throw error;
      toast.success("Story added");
      reset();
      onCreated?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Could not add story");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] bg-foreground/50 flex items-end justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div className="w-full max-w-lg bg-card rounded-t-3xl" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 320 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h3 className="font-bold text-foreground">Add story</h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 pb-safe space-y-4">
              <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              <input ref={cameraRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              {preview ? (
                <div className="relative aspect-[9/14] max-h-[48vh] rounded-2xl overflow-hidden bg-secondary mx-auto">
                  {file?.type.startsWith("video/") ? <video src={preview} className="w-full h-full object-cover" controls /> : <img src={preview} alt="Story preview" className="w-full h-full object-cover" />}
                  <button onClick={reset} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/50 flex items-center justify-center"><X className="w-4 h-4 text-background" /></button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => cameraRef.current?.click()} className="aspect-square rounded-2xl bg-light-orange border border-primary/20 flex flex-col items-center justify-center gap-2">
                    <Camera className="w-7 h-7 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Camera</span>
                  </button>
                  <button onClick={() => fileRef.current?.click()} className="aspect-square rounded-2xl bg-secondary border border-border flex flex-col items-center justify-center gap-2">
                    <ImagePlus className="w-7 h-7 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Upload</span>
                  </button>
                </div>
              )}
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="w-full bg-secondary rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={publish} disabled={uploading || !file} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {uploading ? "Adding..." : "Add Story"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StoryCreateSheet;