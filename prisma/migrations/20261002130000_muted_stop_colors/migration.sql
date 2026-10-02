-- Map the previous saturated stop colors onto the muted palette.
UPDATE "Trip" SET "color" = CASE "color"
  WHEN 'violet' THEN 'lavender'
  WHEN 'pink'   THEN 'lavender'
  WHEN 'blue'   THEN 'stone'
  WHEN 'teal'   THEN 'sage'
  WHEN 'green'  THEN 'sage'
  WHEN 'amber'  THEN 'khaki'
  WHEN 'orange' THEN 'clay'
  WHEN 'rose'   THEN 'clay'
  ELSE "color"
END
WHERE "color" IN ('violet', 'pink', 'blue', 'teal', 'green', 'amber', 'orange', 'rose');
