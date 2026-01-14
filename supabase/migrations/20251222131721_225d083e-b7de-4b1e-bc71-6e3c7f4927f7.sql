-- Allow presidents to delete memberships from their clubs
CREATE POLICY "Presidents can delete memberships in their clubs"
ON public.club_memberships
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM clubs
    WHERE clubs.id = club_memberships.club_id
    AND clubs.president_id = auth.uid()
  )
);