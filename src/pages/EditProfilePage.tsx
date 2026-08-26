import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CUISINES, REGIONS } from "@/lib/taxonomy";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EditProfilePage = () => {
  const navigate = useNavigate();
  const { user, isCreator } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [country, setCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Prefill existing profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, username, bio, avatar_url, specialty, country")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || user.user_metadata?.display_name || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setSpecialty((data as any).specialty || "");
          setCountry((data as any).country || "");
          setAvatarUrl(data.avatar_url || null);
        } else {
          setDisplayName(user.user_metadata?.display_name || "");
        }
        setLoading(false);
      });
  }, [user]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be under 5MB");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let newAvatarUrl: string | undefined;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true, cacheControl: "3600" });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        newAvatarUrl = urlData.publicUrl;
      }

      const updates: Record<string, any> = {
        display_name: displayName || null,
        username: username || null,
        bio: bio || null,
        specialty: specialty || null,
        country: country || null,
      } as any;
      if (newAvatarUrl) updates.avatar_url = newAvatarUrl;

      const { error } = await supabase
  .from("profiles")
  .upsert(
    { user_id: user.id, ...updates },
    { onConflict: "user_id" }
  );

      if (error) throw error;
      toast.success("Profile updated!");
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName ? displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "U";
  const shownAvatar = avatarPreview || avatarUrl;

  return (
    <div className="min-h-screen bg-background pb-24 pt-12 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-xl font-bold font-display text-foreground">Edit Profile</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="flex justify-center mb-6">
            <div className="relative">
              {shownAvatar ? (
                <img src={shownAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <Camera className="w-4 h-4 text-primary-foreground" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell us about yourself..."
                className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            {isCreator && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Signature Cuisine</label>
                  <div className="flex flex-wrap gap-2">
                    {CUISINES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSpecialty(c)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                          specialty === c ? "bg-fresh text-white border-fresh" : "bg-card text-foreground border-border"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">Region</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REGIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCountry(r)}
                        className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                          country === r ? "border-fresh bg-fresh/10 text-fresh" : "border-border bg-card text-foreground"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </>
      )}
    </div>
  );
};

export default EditProfilePage;
