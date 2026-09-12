-- 1. Insert/update the 20 approved whitelist interests
INSERT INTO "interests" ("id", "label_ru", "icon", "is_active", "sort_order")
VALUES 
  ('walk', 'Прогулки', '🚶', true, 1),
  ('coffee', 'Кофе', '☕', true, 2),
  ('football', 'Футбол', '⚽', true, 3),
  ('sports_viewing', 'UFC / спорт', '🥊', true, 4),
  ('board_games', 'Настольные игры', '🎲', true, 5),
  ('study', 'Учёба', '📚', true, 6),
  ('workout', 'Воркаут', '⚡', true, 7),
  ('music', 'Музыка', '🎵', true, 8),
  ('cinema', 'Кино', '🎬', true, 9),
  ('books', 'Книги', '📖', true, 10),
  ('gaming', 'Игры', '🎮', true, 11),
  ('photography', 'Фотография', '📷', true, 12),
  ('languages', 'Языки', '🗣️', true, 13),
  ('creativity', 'Творчество', '🎨', true, 14),
  ('business', 'Бизнес / стартапы', '💡', true, 15),
  ('coding', 'Программирование', '💻', true, 16),
  ('chess', 'Шахматы', '♟️', true, 17),
  ('running', 'Бег', '🏃', true, 18),
  ('cycling', 'Велосипед', '🚴', true, 19),
  ('hiking', 'Походы', '🌲', true, 20)
ON CONFLICT ("id") DO UPDATE SET
  "label_ru" = EXCLUDED."label_ru",
  "icon" = EXCLUDED."icon",
  "is_active" = EXCLUDED."is_active",
  "sort_order" = EXCLUDED."sort_order";
