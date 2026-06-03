SELECT name, count(*) FROM brands GROUP BY name HAVING count(*) > 1;
