SELECT paintings.* FROM paintings LEFT OUTER JOIN vision_scores ON paintings.id = vision_scores.work_id WHERE vision_scores.r IS NULL ORDER BY random() LIMIT 50;
