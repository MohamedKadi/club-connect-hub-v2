import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Search, 
  Users, 
  Building,
  Shield,
  Plus,
  MoreVertical,
  LogOut,
  Settings,
  UserPlus,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Check,
  X,
  Clock
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface President {
  id: string;
  name: string;
  email: string;
}

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  president: President | null;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  isPresident: boolean;
  isAdmin: boolean;
}

interface PendingRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  club_id: string;
  club_name: string;
  requested_at: string;
  has_president: boolean;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, adminData, signOut } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [selectedPresidentId, setSelectedPresidentId] = useState("");
  const [newClubName, setNewClubName] = useState("");
  const [newClubDescription, setNewClubDescription] = useState("");
  const [newClubCategory, setNewClubCategory] = useState("General");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Fetch clubs, users, and pending requests
  useEffect(() => {
    if (user && isAdmin && adminData) {
      fetchData();
      fetchPendingRequests();
    }
  }, [user, isAdmin, adminData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch clubs created by this admin with president info
      const { data: clubsData, error: clubsError } = await supabase
        .from("clubs")
        .select(`
          id,
          name,
          description,
          category,
          president_id,
          profiles!clubs_president_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq("created_by", user!.id);

      if (clubsError) throw clubsError;

      // Fetch member counts for each club
      const clubIds = clubsData?.map(c => c.id) || [];
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select("club_id")
        .in("club_id", clubIds)
        .eq("status", "accepted");

      if (membershipsError) throw membershipsError;

      // Count members per club
      const memberCounts: Record<string, number> = {};
      membershipsData?.forEach(m => {
        memberCounts[m.club_id] = (memberCounts[m.club_id] || 0) + 1;
      });

      // Map clubs with member counts and president info
      const mappedClubs: Club[] = (clubsData || []).map(club => ({
        id: club.id,
        name: club.name,
        description: club.description,
        category: club.category,
        memberCount: memberCounts[club.id] || 0,
        president: club.profiles ? {
          id: club.profiles.id,
          name: club.profiles.full_name,
          email: club.profiles.email
        } : null,
        status: club.president_id ? "active" : "needs_president"
      }));

      setClubs(mappedClubs);

      // Fetch all profiles (users)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (profilesError) throw profilesError;

      // Fetch all admins to identify admin users
      const { data: adminsData } = await supabase
        .from("admins")
        .select("user_id");

      const adminUserIds = new Set((adminsData || []).map(a => a.user_id));

      // Map users with president and admin status
      const presidentIds = new Set((clubsData || []).filter(c => c.president_id).map(c => c.president_id));
      const mappedUsers: User[] = (profilesData || []).map(profile => ({
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        isPresident: presidentIds.has(profile.id),
        isAdmin: adminUserIds.has(profile.id)
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!adminData) return;

    try {
      // Get clubs created by this admin
      const { data: adminClubs } = await supabase
        .from("clubs")
        .select("id, name, president_id")
        .eq("created_by", user.id);

      if (!adminClubs || adminClubs.length === 0) {
        setPendingRequests([]);
        return;
      }

      const clubIds = adminClubs.map(c => c.id);
      const clubMap = new Map(adminClubs.map(c => [c.id, c]));

      // Fetch pending memberships for these clubs
      const { data: pendingData } = await supabase
        .from("club_memberships")
        .select(`
          id,
          user_id,
          club_id,
          requested_at,
          profiles (full_name, email)
        `)
        .in("club_id", clubIds)
        .eq("status", "pending");

      const requests: PendingRequest[] = (pendingData || []).map(p => {
        const club = clubMap.get(p.club_id);
        return {
          id: p.id,
          user_id: p.user_id,
          user_name: (p.profiles as any)?.full_name || "Unknown",
          user_email: (p.profiles as any)?.email || "",
          club_id: p.club_id,
          club_name: club?.name || "Unknown Club",
          requested_at: new Date(p.requested_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }),
          has_president: !!club?.president_id
        };
      });

      // Admin can only accept requests for clubs without presidents
      const adminRequests = requests.filter(r => !r.has_president);
      setPendingRequests(adminRequests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
    }
  };

  const handleAcceptRequest = async (request: PendingRequest) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("club_memberships")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      setPendingRequests(pendingRequests.filter(r => r.id !== request.id));
      
      // Update member count in clubs
      setClubs(clubs.map(c => 
        c.id === request.club_id 
          ? { ...c, memberCount: c.memberCount + 1 }
          : c
      ));

      toast({
        title: "Member Accepted",
        description: `${request.user_name} has been accepted into ${request.club_name}.`,
      });
    } catch (error) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error",
        description: "Failed to accept membership request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectRequest = async (request: PendingRequest) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("club_memberships")
        .update({ status: "rejected", responded_at: new Date().toISOString() })
        .eq("id", request.id);

      if (error) throw error;

      setPendingRequests(pendingRequests.filter(r => r.id !== request.id));

      toast({
        title: "Request Rejected",
        description: `${request.user_name}'s request has been rejected.`,
      });
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject membership request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableUsers = users.filter(u => !u.isPresident);

  const handleCreateClub = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!adminData) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("clubs")
        .insert({
          name: newClubName,
          description: newClubDescription,
          category: newClubCategory,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      const newClub: Club = {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        memberCount: 0,
        president: null,
        status: "needs_president"
      };
      console.log("Created Club:", clubs);
      setClubs([...clubs, newClub]);
      setIsCreateDialogOpen(false);
      setNewClubName("");
      setNewClubDescription("");
      setNewClubCategory("General");
      toast({
        title: "Club Created",
        description: `${data.name} has been created successfully.`,
      });
    } catch (error) {
      console.error("Error creating club:", error);
      toast({
        title: "Error",
        description: "Failed to create club.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (club: Club) => {
    setSelectedClub(club);
    setEditName(club.name);
    setEditDescription(club.description);
    setEditCategory(club.category);
    setIsEditDialogOpen(true);
  };

  const handleEditClub = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClub) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("clubs")
        .update({
          name: editName,
          description: editDescription,
          category: editCategory
        })
        .eq("id", selectedClub.id);

      if (error) throw error;

      setClubs(clubs.map(club => 
        club.id === selectedClub.id 
          ? { ...club, name: editName, description: editDescription, category: editCategory }
          : club
      ));
      setIsEditDialogOpen(false);
      setSelectedClub(null);
      toast({
        title: "Club Updated",
        description: `${editName} has been updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating club:", error);
      toast({
        title: "Error",
        description: "Failed to update club.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAssignDialog = (club: Club) => {
    setSelectedClub(club);
    setSelectedPresidentId("");
    setIsAssignDialogOpen(true);
  };

  const handleAssignPresident = async () => {
    if (!selectedClub || !selectedPresidentId) return;
    
    const selectedUser = users.find(u => u.id === selectedPresidentId);
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      // Update club with new president
      const { error: clubError } = await supabase
        .from("clubs")
        .update({ president_id: selectedPresidentId })
        .eq("id", selectedClub.id);

      if (clubError) throw clubError;

      // Check if the user already has a membership for this club
      const { data: existingMembership } = await supabase
        .from("club_memberships")
        .select("id, status")
        .eq("club_id", selectedClub.id)
        .eq("user_id", selectedPresidentId)
        .maybeSingle();

      if (existingMembership) {
        // Update existing membership to accepted
        if (existingMembership.status !== "accepted") {
          await supabase
            .from("club_memberships")
            .update({ status: "accepted", responded_at: new Date().toISOString() })
            .eq("id", existingMembership.id);
        }
      } else {
        // Create new accepted membership for the president
        await supabase
          .from("club_memberships")
          .insert({
            club_id: selectedClub.id,
            user_id: selectedPresidentId,
            status: "accepted",
            responded_at: new Date().toISOString()
          });
      }

      setClubs(clubs.map(club => 
        club.id === selectedClub.id 
          ? { 
              ...club, 
              president: { id: selectedUser.id, name: selectedUser.name, email: selectedUser.email },
              status: "active",
              memberCount: existingMembership?.status === "accepted" ? club.memberCount : club.memberCount + 1
            }
          : club
      ));

      // Update users list to reflect new president status
      setUsers(users.map(u => 
        u.id === selectedPresidentId ? { ...u, isPresident: true } : u
      ));

      setIsAssignDialogOpen(false);
      setSelectedClub(null);
      setSelectedPresidentId("");
      toast({
        title: "President Assigned",
        description: `${selectedUser.name} is now the president of ${selectedClub.name}.`,
      });
    } catch (error) {
      console.error("Error assigning president:", error);
      toast({
        title: "Error",
        description: "Failed to assign president.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (club: Club) => {
    setSelectedClub(club);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClub = async () => {
    if (!selectedClub) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("clubs")
        .delete()
        .eq("id", selectedClub.id);

      if (error) throw error;

      setClubs(clubs.filter(club => club.id !== selectedClub.id));
      setIsDeleteDialogOpen(false);
      toast({
        title: "Club Deleted",
        description: `${selectedClub.name} has been permanently deleted.`,
        variant: "destructive",
      });
      setSelectedClub(null);
    } catch (error) {
      console.error("Error deleting club:", error);
      toast({
        title: "Error",
        description: "Failed to delete club.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-admin flex items-center justify-center">
              <Shield className="w-5 h-5 text-admin-foreground" />
            </div>
            <div>
              <span className="font-display font-bold text-xl">ClubHub</span>
              <Badge variant="admin" className="ml-2">Admin</Badge>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-admin text-admin-foreground">
                  {adminData?.full_name?.split(' ').map(n => n[0]).join('') || 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{adminData?.full_name || 'Admin'}</p>
                  <Badge variant="admin">Administrator</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{adminData?.school_name || 'School'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clubs</CardTitle>
              <Building className="w-4 h-4 text-admin" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clubs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-admin" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Presidents</CardTitle>
              <Sparkles className="w-4 h-4 text-admin" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clubs.filter(c => c.president).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Attention</CardTitle>
              <Shield className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {clubs.filter(c => c.status === "needs_president").length}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Membership Requests (for clubs without presidents) */}
        {pendingRequests.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Pending Membership Requests</h2>
                <p className="text-muted-foreground text-sm">
                  Accept the first member for clubs without presidents
                </p>
              </div>
              <Badge variant="warning">{pendingRequests.length} pending</Badge>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pendingRequests.map(request => (
                    <div 
                      key={request.id} 
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className="bg-secondary">
                            {request.user_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{request.user_name}</p>
                          <p className="text-sm text-muted-foreground">{request.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant="secondary">{request.club_name}</Badge>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {request.requested_at}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success/10"
                            onClick={() => handleAcceptRequest(request)}
                            disabled={isSubmitting}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectRequest(request)}
                            disabled={isSubmitting}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Club Management Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Manage Clubs</h2>
              <p className="text-muted-foreground text-sm">Create, edit, and assign presidents to clubs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search clubs..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <Button variant="admin" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Club
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Club</DialogTitle>
                    <DialogDescription>
                      Add a new club to the platform. You can assign a president after creation.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateClub}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="club-name">Club Name</Label>
                        <Input 
                          id="club-name" 
                          value={newClubName}
                          onChange={(e) => setNewClubName(e.target.value)}
                          placeholder="e.g., Photography Club" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="club-category">Category</Label>
                        <Select value={newClubCategory} onValueChange={setNewClubCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Academic">Academic</SelectItem>
                            <SelectItem value="Sports">Sports</SelectItem>
                            <SelectItem value="Arts">Arts</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                            <SelectItem value="Community">Community</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="club-description">Description</Label>
                        <Textarea 
                          id="club-description" 
                          value={newClubDescription}
                          onChange={(e) => setNewClubDescription(e.target.value)}
                          placeholder="Describe the club's purpose and activities..."
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="admin" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Club
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid gap-4">
            {filteredClubs.map(club => (
              <Card key={club.id} variant="default">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{club.name}</CardTitle>
                      <Badge variant="secondary">{club.category}</Badge>
                      {club.status === "needs_president" && (
                        <Badge variant="warning">Needs President</Badge>
                      )}
                    </div>
                    <CardDescription>{club.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(club)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Club
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openAssignDialog(club)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign President
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => openDeleteDialog(club)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Club
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{club.memberCount} members</span>
                    </div>
                    {club.president ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs bg-president text-president-foreground">
                            {club.president.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>President: {club.president.name}</span>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning">
                        No president assigned
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredClubs.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{clubs.length === 0 ? "No clubs yet. Create your first club!" : "No clubs found matching your search."}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Users Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">All Users</h2>
              <p className="text-muted-foreground text-sm">View platform users</p>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className={user.isPresident ? "bg-president text-president-foreground" : "bg-secondary"}>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={user.isAdmin ? "default" : user.isPresident ? "president" : "secondary"}>
                      {user.isAdmin ? "Administrator" : user.isPresident ? "President" : "Student"}
                    </Badge>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No users registered yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Edit Club Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Club</DialogTitle>
            <DialogDescription>
              Update the club's details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditClub}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Club Name</Label>
                <Input 
                  id="edit-name" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Academic">Academic</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea 
                  id="edit-description" 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign President Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign President</DialogTitle>
            <DialogDescription>
              Select a user to be the president of {selectedClub?.name}.
              {selectedClub?.president && (
                <span className="block mt-2 text-warning">
                  Current president: {selectedClub.president.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="president-select">Select User</Label>
            <Select value={selectedPresidentId} onValueChange={setSelectedPresidentId}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.name}</span>
                      <span className="text-muted-foreground text-xs">({user.email})</span>
                    </div>
                  </SelectItem>
                ))}
                {availableUsers.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No available users
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssignPresident}
              disabled={!selectedPresidentId || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign President
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Club
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedClub?.name}</strong>? 
              This action cannot be undone. All members will be removed and all club data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteClub}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
