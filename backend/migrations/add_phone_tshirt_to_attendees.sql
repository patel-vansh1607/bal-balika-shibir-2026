-- Run once in phpMyAdmin on the rift_mtrc database
ALTER TABLE attendees
  ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL,
  ADD COLUMN tshirt_size  VARCHAR(10) DEFAULT NULL;
