import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminData: { id: string; full_name: string; school_name: string } | null;
  profileData: { id: string; full_name: string; email: string } | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminData, setAdminData] = useState<{ id: string; full_name: string; school_name: string } | null>(null);
  const [profileData, setProfileData] = useState<{ id: string; full_name: string; email: string } | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching user data
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setAdminData(null);
          setProfileData(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    // Check if user is an admin
    const { data: admin } = await supabase
      .from("admins")
      .select("id, full_name, school_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (admin) {
      setIsAdmin(true);
      setAdminData(admin);
      setProfileData(null);
    } else {
      setIsAdmin(false);
      setAdminData(null);
      
      // Fetch profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .maybeSingle();
      
      setProfileData(profile);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setAdminData(null);
    setProfileData(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAdmin, 
      adminData, 
      profileData,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
