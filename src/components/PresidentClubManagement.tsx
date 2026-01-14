import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Crown,
  Users, 
  Calendar,
  Plus,
  Check,
  X,
  MapPin,
  Clock,
  Edit,
  Trash2,
  UserPlus,
  Loader2,
  UserCog
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PresidentClub {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ClubMember {
  id: string;
  membership_id: string;
  full_name: string;
  email: string;
  role_name: string | null;
  role_id: string | null;
  joined_at: string;
}

interface MembershipRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  requested_at: string;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  location: string;
}

interface ClubRole {
  id: string;
  name: string;
  permissions: string[] | null;
}

interface Props {
  userId: string;
  onDataChange?: () => void;
}

export default function PresidentClubManagement({ userId, onDataChange }: Props) {
  const [presidentClubs, setPresidentClubs] = useState<PresidentClub[]>([]);
  const [selectedClub, setSelectedClub] = useState<PresidentClub | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [roles, setRoles] = useState<ClubRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ClubMember | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchPresidentClubs();
  }, [userId]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubData(selectedClub.id);
    }
  }, [selectedClub]);

  const fetchPresidentClubs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name, description, category")
      .eq("president_id", userId);

    if (error) {
      console.error("Error fetching president clubs:", error);
      setLoading(false);
      return;
    }

    setPresidentClubs(data || []);
    if (data && data.length > 0) {
      setSelectedClub(data[0]);
    }
    setLoading(false);
  };

  const fetchClubData = async (clubId: string) => {
    // Fetch members
    const { data: membersData } = await supabase
      .from("club_memberships")
      .select(`
        id,
        user_id,
        role_id,
        requested_at,
        profiles (id, full_name, email),
        club_roles (name)
      `)
      .eq("club_id", clubId)
      .eq("status", "accepted");

    const formattedMembers: ClubMember[] = (membersData || []).map(m => ({
      id: (m.profiles as any)?.id || m.user_id,
      membership_id: m.id,
      full_name: (m.profiles as any)?.full_name || "",
      email: (m.profiles as any)?.email || "",
      role_name: (m.club_roles as any)?.name || "Member",
      role_id: m.role_id,
      joined_at: new Date(m.requested_at).toLocaleDateString("en-US", { 
        month: "short", year: "numeric" 
      }),
    }));
    setMembers(formattedMembers);

    // Fetch pending requests
    const { data: requestsData } = await supabase
      .from("club_memberships")
      .select(`
        id,
        user_id,
        requested_at,
        profiles (full_name, email)
      `)
      .eq("club_id", clubId)
      .eq("status", "pending");

    const formattedRequests: MembershipRequest[] = (requestsData || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      full_name: (r.profiles as any)?.full_name || "",
      email: (r.profiles as any)?.email || "",
      requested_at: new Date(r.requested_at).toLocaleDateString("en-US", { 
        month: "short", day: "numeric", year: "numeric" 
      }),
    }));
    setRequests(formattedRequests);

    // Fetch events
    const { data: eventsData } = await supabase
      .from("events")
      .select("id, title, description, event_date, event_time, location")
      .eq("club_id", clubId)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true });

    const formattedEvents: ClubEvent[] = (eventsData || []).map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      event_date: new Date(e.event_date).toLocaleDateString("en-US", { 
        month: "short", day: "numeric", year: "numeric" 
      }),
      event_time: e.event_time.substring(0, 5),
      location: e.location,
    }));
    setEvents(formattedEvents);

    // Fetch roles
    const { data: rolesData } = await supabase
      .from("club_roles")
      .select("id, name, permissions")
      .eq("club_id", clubId);

    setRoles(rolesData || []);
  };

  const handleApprove = async (requestId: string, userName: string) => {
    const { error } = await supabase
      .from("club_memberships")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request Approved",
      description: `${userName} has been added to the club.`,
    });

    if (selectedClub) {
      fetchClubData(selectedClub.id);
    }
    onDataChange?.();
  };

  const handleReject = async (requestId: string, userName: string) => {
    const { error } = await supabase
      .from("club_memberships")
      .delete()
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request Rejected",
      description: `${userName}'s request has been declined.`,
    });

    if (selectedClub) {
      fetchClubData(selectedClub.id);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClub) return;

    const formData = new FormData(e.currentTarget);
    const title = formData.get("event-title") as string;
    const description = formData.get("event-description") as string;
    const eventDate = formData.get("event-date") as string;
    const eventTime = formData.get("event-time") as string;
    const location = formData.get("event-location") as string;

    const { error } = await supabase
      .from("events")
      .insert({
        club_id: selectedClub.id,
        title,
        description,
        event_date: eventDate,
        event_time: eventTime,
        location,
        created_by: userId,
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsEventDialogOpen(false);
    toast({
      title: "Event Created",
      description: "Your new event has been scheduled.",
    });

    fetchClubData(selectedClub.id);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Event Deleted",
      description: "The event has been removed.",
    });

    if (selectedClub) {
      fetchClubData(selectedClub.id);
    }
  };

  const handleCreateRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClub) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("role-name") as string;

    const { error } = await supabase
      .from("club_roles")
      .insert({
        club_id: selectedClub.id,
        name,
        permissions: [],
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsRoleDialogOpen(false);
    toast({
      title: "Role Created",
      description: "New role has been added.",
    });

    fetchClubData(selectedClub.id);
  };

  const handleOpenAssignRole = (member: ClubMember) => {
    setSelectedMember(member);
    setSelectedRoleId(member.role_id || "");
    setIsAssignRoleDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedMember || !selectedClub) return;

    const { error } = await supabase
      .from("club_memberships")
      .update({ role_id: selectedRoleId || null })
      .eq("id", selectedMember.membership_id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsAssignRoleDialogOpen(false);
    setSelectedMember(null);
    setSelectedRoleId("");
    
    toast({
      title: "Role Assigned",
      description: `${selectedMember.full_name}'s role has been updated.`,
    });

    fetchClubData(selectedClub.id);
  };

  const handleRemoveRole = async () => {
    if (!selectedMember || !selectedClub) return;

    const { error } = await supabase
      .from("club_memberships")
      .update({ role_id: null })
      .eq("id", selectedMember.membership_id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsAssignRoleDialogOpen(false);
    setSelectedMember(null);
    setSelectedRoleId("");
    
    toast({
      title: "Role Removed",
      description: `${selectedMember.full_name} is now a regular member.`,
    });

    fetchClubData(selectedClub.id);
  };

  const handleOpenRemoveMember = (member: ClubMember) => {
    setSelectedMember(member);
    setIsRemoveMemberDialogOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember || !selectedClub) return;

    const { error } = await supabase
      .from("club_memberships")
      .delete()
      .eq("id", selectedMember.membership_id);
    console.log(error)
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setIsRemoveMemberDialogOpen(false);
    const memberName = selectedMember.full_name;
    setSelectedMember(null);
    
    toast({
      title: "Member Removed",
      description: `${memberName} has been removed from the club.`,
    });

    fetchClubData(selectedClub.id);
    onDataChange?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (presidentClubs.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      {/* President Section Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-president/20 flex items-center justify-center">
          <Crown className="w-5 h-5 text-president" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Club Management</h2>
          <p className="text-sm text-muted-foreground">Manage your clubs as president</p>
        </div>
        <Badge variant="president" className="ml-auto">President</Badge>
      </div>

      {/* Club Selector (if multiple clubs) */}
      {presidentClubs.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {presidentClubs.map(club => (
            <Button
              key={club.id}
              variant={selectedClub?.id === club.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedClub(club)}
            >
              {club.name}
            </Button>
          ))}
        </div>
      )}

      {selectedClub && (
        <>
          {/* Club Header */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedClub.name}</CardTitle>
                  <CardDescription>{selectedClub.description}</CardDescription>
                </div>
                <Badge variant="outline">{selectedClub.category}</Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Members</CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <UserPlus className="w-4 h-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{requests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Events</CardTitle>
                <Calendar className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{events.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Roles</CardTitle>
                <Crown className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{roles.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="requests" className="space-y-4">
            <TabsList>
              <TabsTrigger value="requests">
                Requests
                {requests.length > 0 && (
                  <Badge variant="warning" className="ml-2">{requests.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
            </TabsList>

            {/* Requests Tab */}
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Membership Requests</CardTitle>
                  <CardDescription>Review and manage join requests</CardDescription>
                </CardHeader>
                <CardContent>
                  {requests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No pending requests</p>
                  ) : (
                    <div className="space-y-4">
                      {requests.map(request => (
                        <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{request.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{request.full_name}</p>
                              <p className="text-sm text-muted-foreground">{request.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground mr-4 hidden sm:inline">
                              {request.requested_at}
                            </span>
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => handleApprove(request.id, request.full_name)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleReject(request.id, request.full_name)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle>Club Members</CardTitle>
                  <CardDescription>Manage member roles and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No members yet</p>
                  ) : (
                    <div className="space-y-3">
                      {members.map(member => (
                        <div key={member.membership_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{member.full_name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{member.full_name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{member.role_name}</Badge>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              Joined {member.joined_at}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenAssignRole(member)}
                              title="Assign Role"
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleOpenRemoveMember(member)}
                              title="Remove Member"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Club Events</h3>
                  <p className="text-sm text-muted-foreground">Create and manage events</p>
                </div>
                <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                      <DialogDescription>
                        Schedule a new event for your club members
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateEvent}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="event-title">Event Title</Label>
                          <Input id="event-title" name="event-title" placeholder="e.g., Weekly Workshop" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-description">Description</Label>
                          <Textarea 
                            id="event-description" 
                            name="event-description"
                            placeholder="What will happen at this event?"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="event-date">Date</Label>
                            <Input id="event-date" name="event-date" type="date" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="event-time">Time</Label>
                            <Input id="event-time" name="event-time" type="time" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="event-location">Location</Label>
                          <Input id="event-location" name="event-location" placeholder="e.g., Room 101" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Event</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              {events.length === 0 ? (
                <Card className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No upcoming events</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {events.map(event => (
                    <Card key={event.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {event.description && (
                          <CardDescription>{event.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {event.event_date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.event_time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Roles Tab */}
            <TabsContent value="roles">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Club Roles</h3>
                  <p className="text-sm text-muted-foreground">Define roles for your club</p>
                </div>
                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      New Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                      <DialogDescription>
                        Define a new role for your club
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateRole}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="role-name">Role Name</Label>
                          <Input id="role-name" name="role-name" placeholder="e.g., Vice President" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Role</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              {roles.length === 0 ? (
                <Card className="p-8 text-center">
                  <Crown className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No roles defined yet</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {roles.map(role => (
                    <Card key={role.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{role.name}</CardTitle>
                          <Badge variant="secondary">
                            {role.permissions?.length || 0} permissions
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Assign Role Dialog */}
          <Dialog open={isAssignRoleDialogOpen} onOpenChange={setIsAssignRoleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Role</DialogTitle>
                <DialogDescription>
                  {selectedMember && `Assign a role to ${selectedMember.full_name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Role</Label>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {roles.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No roles created yet. Create a role first in the Roles tab.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedMember?.role_id && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleRemoveRole}
                    className="text-destructive"
                  >
                    Remove Role
                  </Button>
                )}
                <div className="flex gap-2 ml-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAssignRoleDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssignRole}
                    disabled={!selectedRoleId || roles.length === 0}
                  >
                    Assign Role
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Remove Member Confirmation Dialog */}
          <Dialog open={isRemoveMemberDialogOpen} onOpenChange={setIsRemoveMemberDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove Member</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove {selectedMember?.full_name} from the club? 
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsRemoveMemberDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleRemoveMember}
                >
                  Remove Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </motion.div>
  );
}
