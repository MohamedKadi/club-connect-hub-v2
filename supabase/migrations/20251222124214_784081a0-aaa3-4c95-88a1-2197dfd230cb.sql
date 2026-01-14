-- Allow admins to update memberships for clubs they created that don't have a president
CREATE POLICY "Admins can update memberships for clubs without president"
ON public.club_memberships
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clubs
    JOIN admins ON admins.id = clubs.created_by
    WHERE clubs.id = club_memberships.club_id
    AND clubs.president_id IS NULL
    AND admins.user_id = auth.uid()
  )
);