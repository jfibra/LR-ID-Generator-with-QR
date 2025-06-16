-- Create table to track ID generator attempts
CREATE TABLE IF NOT EXISTS id_generator_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    member_id BIGINT NOT NULL,
    email VARCHAR(255),
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    complete_name VARCHAR(255),
    member_type VARCHAR(50),
    status VARCHAR(50),
    user_agent TEXT,
    ip_address VARCHAR(45),
    session_id VARCHAR(255),
    front_downloaded BOOLEAN DEFAULT FALSE,
    back_downloaded BOOLEAN DEFAULT FALSE,
    front_download_timestamp TIMESTAMP NULL,
    back_download_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Add indexes for better query performance
    INDEX idx_member_id (member_id),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at),
    INDEX idx_session_id (session_id)
);

-- Add a comment to describe the table
ALTER TABLE id_generator_logs COMMENT = 'Tracks all ID generator attempts and downloads by members';
