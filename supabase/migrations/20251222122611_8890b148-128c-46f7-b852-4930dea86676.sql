-- Create profiles table for students/presidents
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create admins table (separate from regular users)
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clubs table
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  president_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.admins(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create club_roles table (defines roles available in a club)
CREATE TABLE public.club_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create club_memberships table
CREATE TYPE public.membership_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE public.club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.membership_status NOT NULL DEFAULT 'pending',
  role_id UUID REFERENCES public.club_roles(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(club_id, user_id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TYPE public.notification_type AS ENUM ('accepted', 'rejected', 'event', 'info');

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins policies
CREATE POLICY "Admins can view their own record"
  ON public.admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own admin record"
  ON public.admins FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update own record"
  ON public.admins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Clubs policies
CREATE POLICY "Anyone can view clubs"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create clubs"
  ON public.clubs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = created_by)
  );

CREATE POLICY "Admins can update clubs they created"
  ON public.clubs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = created_by)
  );

CREATE POLICY "Admins can delete clubs they created"
  ON public.clubs FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND id = created_by)
  );

-- Club roles policies
CREATE POLICY "Anyone can view club roles"
  ON public.club_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Presidents can manage club roles"
  ON public.club_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND president_id = auth.uid())
  );

-- Club memberships policies
CREATE POLICY "Users can view memberships of clubs they belong to or their own"
  ON public.club_memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND president_id = auth.uid())
  );

CREATE POLICY "Users can request to join clubs"
  ON public.club_memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Presidents can update memberships in their clubs"
  ON public.club_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND president_id = auth.uid())
  );

CREATE POLICY "Users can delete their own pending memberships"
  ON public.club_memberships FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

-- Events policies
CREATE POLICY "Members can view events of clubs they belong to"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_memberships 
      WHERE club_id = events.club_id 
      AND user_id = auth.uid() 
      AND status = 'accepted'
    )
  );

CREATE POLICY "Presidents can manage events in their clubs"
  ON public.events FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clubs WHERE id = club_id AND president_id = auth.uid())
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration (creates profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to send notification when membership is accepted
CREATE OR REPLACE FUNCTION public.notify_membership_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message, club_id)
    SELECT 
      NEW.user_id,
      'accepted',
      'Membership Approved!',
      'Your request to join ' || clubs.name || ' has been approved. Welcome aboard!',
      NEW.club_id
    FROM public.clubs WHERE id = NEW.club_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_membership_accepted
  AFTER UPDATE ON public.club_memberships
  FOR EACH ROW EXECUTE FUNCTION public.notify_membership_accepted();