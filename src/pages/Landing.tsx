import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Shield, 
  ArrowRight, 
  Sparkles,
  GraduationCap,
  Crown,
  Building
} from "lucide-react";
import heroPattern from "@/assets/hero-pattern.png";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const features = [
  {
    icon: Building,
    title: "Club Management",
    description: "Create and manage school clubs with ease. Assign presidents and track memberships."
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description: "Define custom roles for each club. Control who can do what with fine-grained permissions."
  },
  {
    icon: Calendar,
    title: "Event Planning",
    description: "Schedule and manage club events. Keep members informed and engaged."
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Enterprise-grade security. Your data is protected with industry best practices."
  }
];

const roles = [
  {
    icon: Shield,
    title: "Administrator",
    description: "Full control over clubs and assignments",
    badge: "admin" as const,
    color: "bg-admin/10"
  },
  {
    icon: Crown,
    title: "Club President",
    description: "Manage your club, members, and events",
    badge: "president" as const,
    color: "bg-president/10"
  },
  {
    icon: GraduationCap,
    title: "Student",
    description: "Join clubs and participate in events",
    badge: "student" as const,
    color: "bg-student/10"
  }
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl">ClubHub</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="#roles" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Roles
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="hidden sm:flex">
              <Link to="/admin/login">Admin Portal</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="absolute inset-0 gradient-hero opacity-95" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="mb-6 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                <Sparkles className="w-3 h-3 mr-1" />
                School Club Management Platform
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={fadeInUp}
              className="text-4xl md:text-6xl font-bold text-primary-foreground mb-6 leading-tight"
            >
              Empower Your School's{" "}
              <span className="text-accent">Club Community</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeInUp}
              className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto"
            >
              A centralized platform where administrators manage clubs, presidents lead their teams, 
              and students discover new opportunities.
            </motion.p>
            
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button variant="hero" size="xl" asChild>
                <Link to="/login">
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link to="/admin/login">
                  Admin Access
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="text-primary">Manage Clubs</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools designed for modern school club management.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="interactive" className="h-full">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="py-24 gradient-subtle">
        <div className="container mx-auto px-6">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">User Roles</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Designed for{" "}
              <span className="text-primary">Every Role</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each user type has a tailored experience with the right permissions.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="elevated" className={`h-full text-center ${role.color}`}>
                  <CardHeader className="items-center">
                    <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4 shadow-md">
                      <role.icon className="w-8 h-8 text-primary" />
                    </div>
                    <Badge variant={role.badge} className="mb-2">{role.title}</Badge>
                    <CardTitle>{role.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{role.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url(${heroPattern})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="text-center max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your School's Club Experience?
            </h2>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Join thousands of schools using ClubHub to manage their extracurricular activities.
            </p>
            <Button variant="hero" size="xl" asChild>
              <Link to="/login">
                Start Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-semibold">ClubHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ClubHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
