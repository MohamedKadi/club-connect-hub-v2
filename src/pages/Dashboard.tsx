import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Search, 
  Users, 
  Calendar, 
  MapPin,
  Clock,
  ArrowRight,
  Bell,
  LogOut,
  Plus,
  Filter,
  CheckCircle,
  Crown,
  Loader2
} from "lucide-react";
import PresidentClubManagement from "@/components/PresidentClubManagement";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ClubMember {
  id: string;
  full_name: string;
  email: string;
  role_name: string | null;
  requested_at: string;
}

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  president_id: string | null;
  president_name: string | null;
  member_count: number;
  membership_status: string | null;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  club_name: string;
  club_id: string;
  event_date: string;
  event_time: string;
  location: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  club_name: string | null;
  read: boolean;
  created_at: string;
}

export default function Dashboard() {
  const { user, profileData, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [isClubDialogOpen, setIsClubDialogOpen] = useState(false);
  const [isEventsDialogOpen, setIsEventsDialogOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchClubs();
      fetchEvents();
      fetchNotifications();
    }
  }, [user]);

  const fetchClubs = async () => {
    setLoading(true);
    
    // Fetch all clubs with president info
    const { data: clubsData, error: clubsError } = await supabase
      .from("clubs")
      .select(`
        id,
        name,
        description,
        category,
        president_id,
        profiles:president_id (full_name)
      `);

    if (clubsError) {
      console.error("Error fetching clubs:", clubsError);
      setLoading(false);
      return;
    }

    // Fetch user's memberships
    const { data: membershipsData } = await supabase
      .from("club_memberships")
      .select("club_id, status")
      .eq("user_id", user?.id);

    // Fetch member counts
    const { data: memberCounts } = await supabase
      .from("club_memberships")
      .select("club_id")
      .eq("status", "accepted");
    console.log(memberCounts)
    const countMap: Record<string, number> = {};
    memberCounts?.forEach(m => {
      countMap[m.club_id] = (countMap[m.club_id] || 0) + 1;
    });

    const membershipMap: Record<string, string> = {};
    membershipsData?.forEach(m => {
      membershipMap[m.club_id] = m.status;
    });

    const formattedClubs: Club[] = (clubsData || []).map(club => ({
      id: club.id,
      name: club.name,
      description: club.description,
      category: club.category,
      president_id: club.president_id,
      president_name: (club.profiles as any)?.full_name || null,
      member_count: countMap[club.id] || 0,
      membership_status: membershipMap[club.id] || null,
    }));

    setClubs(formattedClubs);
    setLoading(false);
  };

  const fetchEvents = async () => {
    // Get user's accepted club memberships
    const { data: memberships } = await supabase
      .from("club_memberships")
      .select("club_id")
      .eq("user_id", user?.id)
      .eq("status", "accepted");

    const clubIds = memberships?.map(m => m.club_id) || [];

    if (clubIds.length === 0) {
      setEvents([]);
      return;
    }

    const { data: eventsData } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        event_date,
        event_time,
        location,
        club_id,
        clubs (name)
      `)
      .in("club_id", clubIds)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true });

    const formattedEvents: Event[] = (eventsData || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      club_name: (event.clubs as any)?.name || "",
      club_id: event.club_id,
      event_date: new Date(event.event_date).toLocaleDateString("en-US", { 
        month: "short", day: "numeric", year: "numeric" 
      }),
      event_time: event.event_time.substring(0, 5),
      location: event.location,
    }));

    setEvents(formattedEvents);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        title,
        message,
        read,
        created_at,
        clubs (name)
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const formatted: Notification[] = (data || []).map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      club_name: (n.clubs as any)?.name || null,
      read: n.read,
      created_at: getTimeAgo(new Date(n.created_at)),
    }));

    setNotifications(formatted);
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleJoinRequest = async (clubId: string, clubName: string) => {
    const { error } = await supabase
      .from("club_memberships")
      .insert({
        club_id: clubId,
        user_id: user?.id,
        status: "pending",
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request Sent",
      description: `Your request to join ${clubName} has been submitted.`,
    });

    fetchClubs();
  };

  const handleViewClub = async (club: Club) => {
    setSelectedClub(club);
    setIsClubDialogOpen(true);

    // Fetch club members
    const { data } = await supabase
      .from("club_memberships")
      .select(`
        id,
        requested_at,
        profiles (id, full_name, email),
        club_roles (name)
      `)
      .eq("club_id", club.id)
      .eq("status", "accepted");

    const members: ClubMember[] = (data || []).map(m => ({
      id: (m.profiles as any)?.id || "",
      full_name: (m.profiles as any)?.full_name || "",
      email: (m.profiles as any)?.email || "",
      role_name: (m.club_roles as any)?.name || "Member",
      requested_at: new Date(m.requested_at).toLocaleDateString("en-US", { 
        month: "short", year: "numeric" 
      }),
    }));

    // Add president to the list if not already there
    if (club.president_id) {
      const presidentExists = members.some(m => m.id === club.president_id);
      if (!presidentExists && club.president_name) {
        members.unshift({
          id: club.president_id,
          full_name: club.president_name,
          email: "",
          role_name: "President",
          requested_at: "",
        });
      } else {
        const presidentIdx = members.findIndex(m => m.id === club.president_id);
        if (presidentIdx > -1) {
          members[presidentIdx].role_name = "President";
        }
      }
    }

    setClubMembers(members);
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user?.id)
      .eq("read", false);

    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const filteredClubs = clubs.filter(club => 
    club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    club.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const joinedClubs = clubs.filter(club => club.membership_status === "accepted");
  const unreadCount = notifications.filter(n => !n.read).length;

  const getRoleBadgeVariant = (role: string) => {
    switch (role?.toLowerCase()) {
      case "president":
        return "president";
      case "vice president":
        return "info";
      case "organizer":
        return "warning";
      default:
        return "secondary";
    }
  };

  // Check if user is president of any club
  const isPresident = clubs.some(club => club.president_id === user?.id);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userName = profileData?.full_name || user?.email?.split("@")[0] || "User";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">ClubHub</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell with Sheet */}
            <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <div className="flex items-center justify-between">
                    <SheetTitle>Notifications</SheetTitle>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <SheetDescription>
                    Stay updated on your club activities
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No notifications yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            notification.read ? "bg-background" : "bg-accent/10 border-accent/20"
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              notification.type === "accepted" 
                                ? "bg-success/20 text-success" 
                                : "bg-info/20 text-info"
                            }`}>
                              {notification.type === "accepted" ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <Calendar className="w-5 h-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{notification.title}</p>
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full bg-accent" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {notification.club_name && (
                                  <Badge variant="outline" className="text-xs">
                                    {notification.club_name}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {notification.created_at}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">
                  {isPresident ? "Club President" : "Student"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Welcome back, {userName.split(" ")[0]}! 👋</h1>
          <p className="text-muted-foreground">Discover clubs, join events, and connect with your community.</p>
        </motion.div>

        {/* President Club Management Section */}
        {isPresident && user && (
          <PresidentClubManagement userId={user.id} onDataChange={fetchClubs} />
        )}

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">My Clubs</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{joinedClubs.length}</div>
              <p className="text-xs text-muted-foreground">Active memberships</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">From your clubs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {clubs.filter(c => c.membership_status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Events</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsEventsDialogOpen(true)}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {events.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Join clubs to see their events here</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {events.slice(0, 2).map(event => (
                <Card key={event.id} variant="interactive">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription>{event.club_name}</CardDescription>
                      </div>
                      <Badge variant="secondary">{event.event_date}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        </motion.div>

        {/* Browse Clubs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold">Browse Clubs</h2>
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
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {filteredClubs.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No clubs available yet. Check back later!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map(club => (
                <Card key={club.id} variant="interactive">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant="outline">{club.category}</Badge>
                      {club.membership_status === "accepted" && (
                        <Badge variant="accepted">Member</Badge>
                      )}
                      {club.membership_status === "pending" && (
                        <Badge variant="pending">Pending</Badge>
                      )}
                    </div>
                    <CardTitle className="mt-2">{club.name}</CardTitle>
                    <CardDescription>{club.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {club.member_count} members
                      {club.president_name && (
                        <>
                          <span className="mx-2">•</span>
                          <Crown className="w-4 h-4" />
                          {club.president_name}
                        </>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    {!club.membership_status ? (
                      <Button className="w-full" onClick={() => handleJoinRequest(club.id, club.name)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Request to Join
                      </Button>
                    ) : club.membership_status === "accepted" ? (
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => handleViewClub(club)}
                      >
                        View Club
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Request Pending
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>

      {/* View Club Dialog */}
      <Dialog open={isClubDialogOpen} onOpenChange={setIsClubDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedClub?.category}</Badge>
              <Badge variant="accepted">Member</Badge>
            </div>
            <DialogTitle className="text-2xl">{selectedClub?.name}</DialogTitle>
            <DialogDescription>{selectedClub?.description}</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-4 py-4 border-b">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{selectedClub?.member_count} members</span>
              </div>
              {selectedClub?.president_name && (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-accent" />
                  <span className="text-sm">President: {selectedClub.president_name}</span>
                </div>
              )}
            </div>

            <div className="py-4">
              <h3 className="font-semibold mb-4">Members & Roles</h3>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {clubMembers.map((member) => (
                    <div 
                      key={member.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className={
                            member.role_name === "President" 
                              ? "bg-president text-president-foreground" 
                              : "bg-secondary"
                          }>
                            {member.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{member.full_name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(member.role_name || "Member")}>
                          {member.role_name || "Member"}
                        </Badge>
                        {member.requested_at && (
                          <span className="text-xs text-muted-foreground">
                            Joined {member.requested_at}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* All Events Dialog */}
      <Dialog open={isEventsDialogOpen} onOpenChange={setIsEventsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              All Upcoming Events
            </DialogTitle>
            <DialogDescription>
              Events from your clubs
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">No Events Yet</p>
                <p className="text-muted-foreground">
                  Join clubs to see their upcoming events here
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{event.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{event.club_name}</Badge>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-sm">
                          {event.event_date}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {event.description && (
                        <p className="text-muted-foreground mb-4">{event.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {event.event_time}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
