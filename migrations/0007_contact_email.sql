-- The foundation's Gmail changed to AdaCommunityImpact@gmail.com.
UPDATE settings SET value = 'AdaCommunityImpact@gmail.com' WHERE key IN ('email', 'alert_email') AND lower(value) = 'acif.org@gmail.com';
