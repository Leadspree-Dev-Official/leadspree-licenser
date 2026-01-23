import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "reseller";
  status: "pending" | "active" | "paused" | "terminated";
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // MOCK DATA FOR TESTING
  const [user, setUser] = useState<User | null>({
    id: 'mock-admin-id',
    email: 'admin@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as any);
  const [session, setSession] = useState<Session | null>({
    access_token: 'mock',
    token_type: 'bearer',
    user: { id: 'mock-admin-id' }
  } as any);
  const [profile, setProfile] = useState<Profile | null>({
    id: 'mock-admin-id',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    full_name: 'Test Admin'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Mock effect - do nothing or just navigate if needed
    // const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
    // return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);

      // Auto-redirect after profile is loaded
      const currentPath = window.location.pathname;
      if (currentPath === "/auth" && data) {
        if (data.role === "admin") {
          navigate("/admin");
        } else if (data.role === "reseller" && data.status === "active") {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
