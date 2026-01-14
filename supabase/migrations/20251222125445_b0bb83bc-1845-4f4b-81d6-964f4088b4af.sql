-- Allow admins to insert accepted memberships when assigning presidents
CREATE POLICY "Admins can insert memberships for assigned presidents"
ON public.club_memberships
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clubs
    JOIN admins ON admins.id = clubs.created_by
    WHERE clubs.id = club_memberships.club_id
    AND admins.user_id = auth.uid()
    AND status = 'accepted'
  )
);