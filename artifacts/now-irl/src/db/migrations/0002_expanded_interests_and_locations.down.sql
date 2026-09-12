-- Rollback expanded interests to original 7 items
DELETE FROM "interests" 
WHERE "id" IN (
  'music', 'cinema', 'books', 'gaming', 'photography', 
  'languages', 'creativity', 'business', 'coding', 
  'chess', 'running', 'cycling', 'hiking'
);
